# Конфигурация

Конфиг процесса — единый `gateway.yaml` («микро-nginx»). Весь источник
состояния — на диске; БД у gateway нет.

Путь задаётся `--config`, env `LIAPOLDUS_GATEWAY_CONFIG` либо default.

## Возможности

- **Сайты из registry.** Версии раздаются из `sites/<slug>/<version>/`,
  `current` — активная, `prev` — резервная для мгновенного отката.
- **Server-блоки.** Слушатели, выбор по Host, статика, `proxyPass`, редиректы,
  маршруты, языки сайтов.
- **TLS и HTTP/2.** Мульти-сертификатный SNI-подбор, ALPN h2, h2c на «голом»
  HTTP.
- **Обычные веб-функции.** Сжатие gzip/brotli, access-лог, rate limit по IP,
  CORS, security-заголовки, ETag и Cache-Control.
- **Плагины.** Внешние процессы, запускаемые gateway, с полноценным
  протоколом (unary + все направления stream).
- **Управление.** CLI-подкоманды (офлайн-доставка) и резервированный
  management HTTP API.
- **Наблюдаемость.** Prometheus и OTLP push экспорт, структурированные логи.

## Быстрый старт

Минимальный запуск gateway за несколько минут.

### 1. Соберите gateway

```bash
cd gateway/core
go build ./cmd/gateway
```

Бинарник появится как `gateway` в текущей директории (или задайте
`-o ./bin/gateway`).

### 2. Создайте конфиг

`gateway.yaml`:

```yaml
# Публичный порт по умолчанию (для implicit-сайтов и server без listen).
listen: "18080"

# Каталог registry: sites/<slug>/current/...
registry: ./data/registry

# Управление: порт и токен (пустой токен — только loopback).
management:
  enabled: true
  port: "18090"
  token: ""
```

### 3. Опубликуйте простой сайт

Создайте версию сайта в registry. Персональный конфиг сайта — unified schema:

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

### 4. Запустите

```bash
./bin/gateway serve
# или с явным путём к конфигу:
LIAPOLDUS_GATEWAY_CONFIG=gateway.yaml ./bin/gateway serve
```

Вывод должен показать публичный runtime и management-порт:

```text
gateway: публичный рантайм слушает :18080 (режим gateway)
gateway: mgmt :18090 слушает (токен не задан — только loopback)
```

### 5. Проверьте

```bash
curl -H 'Host: example.localhost' http://localhost:18080/
# -> <h1>Hello, Liapoldus</h1>

curl http://localhost:18090/healthz
# -> {"status":"ok","process":"gateway-mgmt"}
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

Плагины и service accounts хранятся только в корневом `gateway.yaml`, не в
tenant include.

## Server-блоки

Один или несколько `server`; выбор блока — по `serverName` (Host), fallback —
первый блок слушателя.

```yaml
server:
  - listen: "18080"                      # порт (пусто = корневой listen)
    serverName: ["blog.localhost"]       # hosts (алиас: hosts:)
    site: blog                           # корень = registry/sites/blog/current
    # root: /path/to/static              # альтернатива: прямой каталог
    # proxyPass: "http://127.0.0.1:8080" # reverse-proxy (путь не меняется)
    index: index.html                    # индексный файл
    spa: true                            # fallback в index для SPA
    prev: true                           # публичный /__prev/ (сверка перед откатом)
    languages: [ru, en]
    defaultLang: ru
    redirects:
      - from: /old
        to: /new
        status: 301
    routes:
      - matcher: /api/*
        target: https://backend.example
    apiRoutes:                           # внешний capability поверх HTTP
      - methods: [POST]
        path: /api/forms/submit
        plugin:
          instance: forms-db
          capability: forms.submit
    compression: brotli                  # gzip | brotli | off
    cache:
      static: "public, max-age=3600"
      index: "no-cache"
    http2: true                          # h2c на голом HTTP; nil = включён
    tls:                                 # TLS на этом порту
      certFile: ./tls/blog.crt
      keyFile: ./tls/blog.key
```

### Имплицитные сайты из registry

Сайт, у которого есть `<registry>/sites/<slug>/config.yaml`, автоматически
получает **имплицитный** server на listen по умолчанию с хостами из конфига.
Явный `server` с тем же `site` переопределяет имплицитный (свой порт, TLS,
proxyPass и т.д.).

## Конфиг сайта (unified schema)

`<registry>/sites/<slug>/config.yaml`:

```yaml
slug: example
id: a1b2c3
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

Это единый источник для CLI, management API и runtime: `gateway config <slug>`,
`gateway routes <slug>`, `GET /api/sites/{slug}` отдают его напрямую.

## Версии сайта

- `<registry>/sites/<slug>/current/` — активная версия (раздаётся);
- `<registry>/sites/<slug>/prev/` — предыдущая (для отката);
- публичный `/__prev/` (если `prev: true`) — сверка перед откатом.

## TLS

- `server.tls.certFile/keyFile` — сертификат блока.
- На одном слушателе несколько блоков с TLS: сертификаты индексируются по
  хостам, выбор — по SNI, fallback — первый серт.
- Минимальная версия TLS — 1.2; HTTP/2 при TLS автоматически (ALPN h2).

## Reload

`POST /api/reload` перечитывает `gateway.yaml` + include. Применяются изменения,
не затрагивающие «сигнатуру слушателей» (listen-адреса, таймауты, mgmt-порт/
токен, TLS-сертификаты, http2-флаги). Иначе ответ — `409 restart required`.
`PUT /api/config` записывает новый `gateway.yaml` (атомарно, с валидацией) и
перезагружает.