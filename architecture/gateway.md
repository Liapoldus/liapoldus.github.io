# Gateway: data plane и control plane

## Модель процессов

Liapoldus — это **один процесс**: gateway. Его роль — data plane (публичный
рантайм), управление и автономная CLI-доставка; собственной БД у него нет.

| Процесс | Роль | БД | Обязателен |
| --- | --- | --- | --- |
| `gateway` | data plane + управление: публичный рантайм, mgmt API, CLI | нет | да |

Gateway не является монолитом и не имеет доступа к БД. Он читает только два
источника с диска:

- персональный конфиг процесса — `gateway.yaml` (+ `include`);
- готовые артефакты из **registry-volume** — `sites/<slug>/<version>/...`,
  сформированные оператором по контракту.

```mermaid
flowchart LR
    OPS[Оператор] -->|публикация и версии| REG[(registry<br/>sites/&lt;slug&gt;)]
    OPS -->|gateway.yaml| CFG[(конфиг процесса)]
    CFG --> GW[gateway serve]
    REG --> GW
    GW -->|HTTP 80/443| CLIENTS[Клиенты сайтов]
    OPS -->|mgmt API + токен| GW
```

Оператор пишет в registry и дергает mgmt-порт напрямую — отдельной системы
управления нет.

## Конфигурация процесса

- Путь к конфигу: аргумент `--config`, либо env `LIAPOLDUS_GATEWAY_CONFIG`;
  пустое значение — встроенный default.
- Формат — YAML; секции: `instance`, `registry`, `listen`, `management`,
  `plugins`, `tenants`, `serviceAccounts`, `include`, `server`, `http`, `security`,
  `metrics`, `tls`.
- `include` — дополнительные файлы (nginx-подобно); server-блоки объединяются.
- Сайты, опубликованные в `<registry>/sites/<slug>/config.yaml`,
  включаются **транспарентно** — без явных server-блоков.

### Конфиг сайта (unified schema)

Персональный конфиг каждого сайта лежит в `<registry>/sites/<slug>/config.yaml`
и описывает: `slug`, `id`, `hosts`, `languages`, `defaultLang`, `redirects`
(с status), `routes` (matcher → target, priority). Этот файл — единый источник
для CLI, mgmt API и runtime.

## Data plane

### Слушатели и маршрутизация

Gateway слушает один или несколько адресов (`server.listen`), каждый адрес
обслуживает свой набор server-блоков:

- выбор блока — по `serverName` (Host/SNI);
- fallback для слушателя — первый блок;
- `site` — каталог в registry; `root` — прямой каталог; `proxyPass` — восходящий
  upstream.

TLS: на слушателе индексируются сертификаты всех его блоков по хостам, выбор по
SNI (`GetCertificate`), fallback — первый серт. При TLS HTTP/2 включается
автоматически (ALPN h2). На «голом» HTTP HTTP/2 доступен как h2c (по конфигу
сервера, по умолчанию включён).

### Immutable snapshot

`serve` собирает **неизменяемый снапшот** на диске (актуальная версия каждого
сайта + personal-конфиг) и обслуживает запросы из него. Файлы сайтов не пишутся
в рантайме; обновления происходят заменой снапшота.

```mermaid
flowchart TB
    subgraph disk["диск"]
        Y[gateway.yaml + include]
        RS[sites/&lt;slug&gt;/current]
        RP[sites/&lt;slug&gt;/prev]
    end

    subgraph rt["runtime (serve)"]
        CF["config snapshot"]
        ROUTERS["router snapshot<br/>host → server-блок → handler"]
        HANDLERS["handlers map<br/>listenAddr → http.Handler"]
    end

    Y -->|реаде| CF
    CF --> ROUTERS
    RS --> ROUTERS
    ROUTERS --> HANDLERS
    HANDLERS -->|на каждый запрос| DISPATCH[dispatcher → актуальный handler]
```

Смена конфига без изменения «подписи слушателей» (listen-адреса, таймауты,
mgmt-порт/токен, TLS-серты, http2-флаги) применяется горячо через `/api/reload`.
Если подпись меняется, gateway честно отвечает `409 restart required` — без
ложного «reloaded».

### Путь запроса

```mermaid
sequenceDiagram
    participant C as Клиент
    participant L as Listener (addr)
    participant D as Dispatcher (runtime)
    participant R as Router (server-блок)
    participant F as Файлы сайта (registry)
    participant P as Плагин (процесс)

    C->>L: HTTP/HTTPS request
    L->>D: dispatch (актуальный обработчик)
    D->>R: выбор блокa по Host/SNI
    R->>R: middleware (access-log, rate limit, CORS, security, cache)
    alt статический сайт
        R->>F: отдать файл (ETag/Cache-Control)
        F-->>C: 200 + файл
    else редирект
        R-->>C: 301/302/308
    else capability call
        R->>P: unary/stream вызов (TCP loopback)
        P-->>R: результат / plugin error
        R-->>C: 200 | 502/503/504
    end
```

### Middleware

Каждый middleware читает конфиг серверного блока и применяется к ответу
(`internal/presentation/serve/web.go`):

- **compression** — gzip или brotli по `Accept-Encoding` (по конфигу `off`);
  при сжатии убираются `Content-Length` и `ETag`, добавляется `Vary`.
- **access log** — структурированный JSON или plain line; remote IP, метод, URI,
  host, status, длительность, байты, UA, опционально `X-Request-Id`.
- **rate limit** — token bucket по IP (`ipLimiter`), ответ `429` + `Retry-After`;
  запись автоматически удаляется после окна.
- **CORS** — по конфигу сервера: allow-origin по списку (включая `*`), методы,
  headers, `Max-Age`; `OPTIONS` → `204`.
- **security headers** — `Content-Security-Policy`, `X-Frame-Options`,
  `X-Content-Type-Options` (`nosniff`), `Referrer-Policy`, `Strict-Transport-Security`
  (HSTS только при TLS).
- **cache** — слабый `ETag` по размеру+времени файла и `Cache-Control` по типу
  файла, если не заданы заранее.

## Control plane

### Management-порт

Резервированный порт управления (`management.enabled/port/token`), отдельный
канал наблюдения и управления. Безопасность:

- токен задан → обязателен Bearer-токен (`Authorization`/`X-Management-Token`)
  или API key (`X-API-Key`), сверка — constant-time;
- токен пуст → запросы только с loopback;
- CLI может выключить управление флагом `--no-management`;
- в docker-композиции mgmt-порт наружу пробрасывается только на loopback хоста.

Абстракция авторизации: service accounts (`lpgw_<id>_<key>`, bcrypt-хеш в
конфиге) с ролями `platform-admin` / `tenant-admin`; `tenantAuth` допускает
`tenant-admin` только к своему `/api/tenants/{id}`.

### Эндпоинты mgmt

```mermaid
flowchart LR
    subgraph open["без авторизации"]
        H["GET /healthz"]
    end
    subgraph ops["наблюдение"]
        M["GET /metrics (Prometheus)"]
        S["GET /api/status"]
        T["GET /api/tenants"]
        TS["GET /api/tenants/{id}"]
    end
    subgraph sites["сайты и версии"]
        LS["GET /api/sites"]
        SC["GET /api/sites/{slug}"]
        SV["GET /api/sites/{slug}/versions"]
        CU["GET /api/sites/{slug}/current"]
        PV["GET /api/sites/{slug}/prev"]
        RB["POST /api/sites/{slug}/rollback"]
        US["POST /api/sites/{slug}/static/{path...}"]
        DS["DELETE /api/sites/{slug}/static/{path...}"]
    end
    subgraph cfg["конфигурация"]
        RL["POST /api/reload"]
        CFG["PUT /api/config"]
    end
    subgraph pg["плагины (при супервизоре)"]
        PL["GET /api/plugins"]
        PD["GET /api/plugins/{id}"]
        LG["GET /api/plugins/{id}/logs"]
        RPC["POST /api/plugins/{id}/rpc"]
        RS["POST /api/plugins/{id}/restart"]
        STP["POST /api/plugins/{id}/stop"]
        STA["POST /api/plugins/{id}/start"]
    end
```

Все операции mgmt дублируют автономные CLI-команды и работают с тем же диском
(registry), что и runtime. `/api/plugins/{id}/rpc` — проксирование произвольного
RPC плагина (raw JSON), доступ только по mgmt-авторизации.

### CLI: автономная доставка

CLI — это **не третий бинарник**: подкоманды единого бинарника gateway,
офлайн-режим доставки. Они читают персональные конфиги и артефакты с диска и
не требуют работающего runtime:

| Подкоманда | Назначение |
| --- | --- |
| `serve` | единственный долгоживущий процесс (публичный рантайм + mgmt) |
| `versions` | список версий сайта на диске |
| `current` / `prev` | показать текущую/предыдущую версию |
| `rollback` | prev становится current (атомарно через `.rollback-tmp`) |
| `config` | показать персональный конфиг сайта (unified schema) |
| `routes` | показать маршруты и редиректы сайта |
| `status` | диагностика: listen, mgmt, сайты на диске |
| `health` | автономная проверка здоровья registry |
| `accounts` | выпуск/ротация/отзыв service account API keys |
| `help` | справка |

## Метрики

`infrastructure/metrics` — порт `domain.MetricsPort`. Включается в `cmd`, если
настроен хотя бы один экспорт:

- **Prometheus** — `GET /metrics` на mgmt-порте (за авторизацией);
- **OTLP push** — периодическая отправка в эндпоинт (интервал по конфигу,
  по умолчанию 15s).

Prefix метрик — `gateway_`.

## Ошибки и graceful shutdown

- `serve` ждёт `SIGINT`/`SIGTERM`, затем останавливает супервизор плагинов
  (`manager.Close()`) и гасит все `http.Server` через `Shutdown(ctx)` с
  таймаутом 10s.
- Ошибки plugin-вызовов (см. protocol.md) преобразуются в согласованные 5xx
  ответы gateway: startup/failure → 503, timeout/disconnect → 504, plugin
  internal error → 502.