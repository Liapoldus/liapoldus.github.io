# Конфигурация

Единый `gateway.yaml` («микро-nginx»). Весь источник состояния — на диске;
БД у gateway нет. Путь задаётся `--config`, env `LIAPOLDUS_GATEWAY_CONFIG`
либо default.

## Возможности

| Возможность | Описание |
| --- | --- |
| **Сайты из registry** | версии раздаются из `sites/<slug>/<version>/`; `current` — активная, `prev` — резервная для отката |
| **Server-блоки** | слушатели, выбор по Host, статика, `proxyPass`, редиректы, маршруты, языки сайтов |
| **TLS и HTTP/2** | мульти-сертификатный SNI-подбор, ALPN h2, h2c на «голом» HTTP |
| **Веб-функции** | gzip/brotli, access-лог, rate limit по IP, CORS, security-заголовки, ETag, Cache-Control |
| **Плагины** | внешние процессы с полным протоколом (unary + все направления stream) |
| **Управление** | CLI-подкоманды (офлайн-доставка) и management HTTP API |
| **Наблюдаемость** | Prometheus и OTLP push-экспорт, структурированные логи |

## Быстрый старт

### 1. Соберите gateway

```bash
cd gateway/core
go build ./cmd/gateway     # появится ./bin/gateway (или задайте -o)
```

### 2. Создайте конфиг

`gateway.yaml`:

```yaml
listen: "18080"            # публичный порт по умолчанию
registry: ./data/registry  # каталог реестра сайтов
management:                # порт управления
  enabled: true
  port: "18090"
  token: ""                # пусто = только loopback
```

### 3. Опубликуйте простой сайт

```bash
mkdir -p data/registry/sites/example/current
echo '<h1>Hello, Liapoldus</h1>' > data/registry/sites/example/current/index.html

cat > data/registry/sites/example/config.yaml <<'YAML'
slug: example
hosts: [example.localhost, localhost]
languages: [ru]
defaultLang: ru
loginRequired: false
YAML
```

### 4. Запустите и проверьте

```bash
./bin/gateway serve
curl -H 'Host: example.localhost' http://localhost:18080/   # -> <h1>Hello, Liapoldus</h1>
curl http://localhost:18090/healthz                          # -> {"status":"ok",...}
```

Если `Host` не задан, gateway выберет подходящий блок по умолчанию.

## Корневая схема

```yaml
instance:                        # идентификация процесса
  mode: gateway
  name: Liapoldus gateway

registry: ./data/registry        # корень реестра сайтов

listen: "18080"                  # публичный порт по умолчанию

management:                      # резервированный порт управления
  enabled: true
  port: "18090"
  token: ""                      # пусто = только loopback

controlPlane:                    # service accounts для management API
  auth:
    serviceAccounts:
      - id: ops
        role: platform-admin     # platform-admin | tenant-admin
        keyHash: "$2a$10$..."    # bcrypt-хеш ключа lpgw_<id>_<hex>

include: ["./conf.d/*.yaml"]     # доп. конфиги (server-блоки объединяются)

tenants:                         # изолированные владельцы ресурсов
  - id: acme
    domains: [acme.localhost]

http:                            # таймауты публичных слушателей
  readTimeout: 30s
  writeTimeout: 30s
  idleTimeout: 120s
  maxHeaderBytes: 65536

logging:                         # access-лог
  access: [stdout]               # или путь к файлу
  format: json                   # json | plain

metrics:                         # наблюдаемость
  prometheus: true
  otlp:
    enabled: false
    endpoint: ""
    interval: "15s"

server:                          # серверные блоки (см. ниже)
  - listen: "18080"
    serverName: ["blog.localhost"]
    site: blog

plugins:                         # внешние плагины (см. «Плагины»)
  forms-db:
    manifest:
      protocol: liapoldus.plugin/v2
      capabilities: [forms.submit, forms.list, forms.delete]
    enabled: true
    binary: ./bin/forms-db
    config: ./conf/forms-db.yaml
```

### Справочник корневых ключей

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `instance.mode` | режим процесса: `gateway` или `single` | — |
| `instance.name` | имя процесса (в логах) | — |
| `registry` | корень реестра сайтов `sites/<slug>/…` | — |
| `listen` | публичный порт по умолчанию | — |
| `management` | порт управления + токен (`enabled` требует `port`) | выключен |
| `controlPlane.auth.serviceAccounts` | service accounts управления | `[]` |
| `include` | доп. конфиги; server-блоки объединяются | `[]` |
| `tenants` | изолированные владельцы ресурсов | `[]` |
| `http` | таймауты публичных слушателей | 30s/30s/120s/64K |
| `logging` | access-лог: `access` (куда), `format` (`json`/`plain`) | `[stdout]`, `plain` |
| `metrics` | `prometheus` (bool) + `otlp` (endpoint, interval) | выключены |
| `server` | серверные блоки | `[]` |
| `plugins` | декларации плагинов | `{}` |

> Плагины и service accounts хранятся только в корневом `gateway.yaml`,
> не в tenant include.

## Server-блоки

Один или несколько `server`; выбор блока — по `serverName` (Host), fallback —
первый блок слушателя.

:::tabs
== Статический сайт из registry

```yaml
server:
  - serverName: ["blog.localhost"]  # hosts (алиас: hosts:)
    site: blog                      # корень = registry/sites/blog/current
    index: index.html
    languages: [ru, en]
    defaultLang: ru
    compression: brotli             # gzip | brotli | off
    cache:                          # Cache-Control для статики и index
      static: "public, max-age=3600"
      index: "no-cache"
    prev: true                      # публичный /__prev/ (сверка перед откатом)
```

== Reverse proxy и маршруты

```yaml
server:
  - serverName: ["api.localhost"]
    proxyPass: "http://127.0.0.1:8080"  # reverse-proxy (путь не меняется)
    redirects:
      - from: /old
        to: /new
        status: 301
    routes:
      - matcher: /api/*
        target: https://backend.example
    apiRoutes:                        # внешний capability поверх HTTP
      - methods: [POST]
        path: /api/forms/submit
        plugin:
          instance: forms-db
          capability: forms.submit
```

== TLS и HTTP/2

```yaml
server:
  - listen: "18443"
    serverName: ["secure.localhost"]
    site: blog
    tls:
      certFile: ./tls/blog.crt
      keyFile: ./tls/blog.key
    http2: true                 # при TLS — ALPN h2; на голом HTTP — h2c
```
:::

### Справочник ключей блока

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `listen` | порт блока (пусто = корневой `listen`) | корневой порт |
| `serverName` | Host-маски для выбора блока (алиас: `hosts`) | — |
| `site` | сайт из registry: `sites/<slug>/current` | — |
| `root` | альтернатива: прямой каталог статики | — |
| `proxyPass` | backend reverse-proxy (путь не меняется) | — |
| `index` | индексный файл | `index.html` |
| `spa` | fallback в `index` для SPA | `false` |
| `prev` | публичный `/__prev/` (сверка перед откатом) | `false` |
| `languages` / `defaultLang` | языки сайта и язык по умолчанию | — |
| `redirects` | `from → to` + `status` | `[]` |
| `routes` | маршруты `matcher → target` | `[]` |
| `apiRoutes` | вызовы capability поверх HTTP (`methods`, `path`, `plugin`) | `[]` |
| `compression` | `gzip` / `brotli` / `off` | — |
| `cache` | Cache-Control для `static` и `index` | — |
| `http2` | h2c на голом HTTP; при TLS — ALPN h2 (nil = включён) | включён |
| `tls.certFile` / `keyFile` | сертификат блока | отключён |

### Имплицитные сайты из registry

Сайт с `<registry>/sites/<slug>/config.yaml` автоматически получает
**имплицитный** server на listen по умолчанию с хостами из конфига. Явный
`server` с тем же `site` переопределяет имплицитный (свой порт, TLS, proxyPass
и т.д.).

## Конфиг сайта (unified schema)

`<registry>/sites/<slug>/config.yaml`:

```yaml
slug: example
hosts: [example.localhost, localhost]
languages: [ru, en]
defaultLang: ru
loginRequired: false
redirects:
  - from: /start
    to: /
    status: 302
routes: []                    # matcher → target (+priority)
```

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `slug` | идентификатор сайта (должен совпадать с каталогом) | — |
| `hosts` | хосты имплицитного server | — |
| `languages` / `defaultLang` | языки сайта и язык по умолчанию | — |
| `loginRequired` | требуется ли вход | `false` |
| `redirects` | редиректы | `[]` |
| `routes` | маршруты | `[]` |

Единый источник для CLI, management API и runtime: `gateway config <slug>`,
`gateway routes <slug>`, `GET /api/sites/{slug}` отдают его напрямую.

## Версии сайта

| Версия | Каталог | Использование |
| --- | --- | --- |
| `current` | `sites/<slug>/current/` | активная, раздаётся |
| `prev` | `sites/<slug>/prev/` | предыдущая, для отката |
| `/__prev/` | публичный (при `prev: true`) | сверка перед откатом |

## TLS

| Правило | Значение |
| --- | --- |
| Сертификат блока | `server.tls.certFile` / `keyFile` |
| Несколько блоков на слушателе | сертификаты индексируются по хостам, выбор — по SNI |
| Fallback | первый серт слушателя |
| Минимальная версия | TLS 1.2 |
| HTTP/2 при TLS | автоматически (ALPN h2) |

## Reload

| Запрос | Что делает |
| --- | --- |
| `POST /api/reload` | перечитывает `gateway.yaml` + include; применяет изменения, не трогающие «сигнатуру слушателей» (listen, таймауты, mgmt-порт/токен, TLS, http2) |
| — | иначе ответ **`409 restart required`** |
| `PUT /api/config` | записывает новый `gateway.yaml` (атомарно, с валидацией) и перезагружает |