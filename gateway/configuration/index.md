# Конфигурация

::: info Контракт конфигурации
Эта страница — справочник публичного формата `gateway.yaml`. Gateway валидирует
конфигурацию целиком до запуска и сообщает путь YAML при ошибке.
:::

Единый `gateway.yaml` и дерево include описывают runtime. Это нормативная
target-spec: если будущая реализация расходится с этой документацией, её нужно
привести к контракту. Gateway не требует собственной БД: конфигурация, registry
и защищённое certificate storage — наблюдаемые источники состояния.

## Возможности

| Возможность | Описание |
| --- | --- |
| **Сайты из registry** | immutable release в `sites/<slug>/releases/<revision>/`; `current` и `previous` — symlink для publish/rollback |
| **HTTP(S)** | static, proxy, WebSocket, redirects, cache, compression, TLS, OIDC/JWT/mTLS и WAF |
| **TCP, UDP и P2P** | listener’ы, TLS termination/passthrough, relay, ограничения и plugin targets |
| **Upstream** | DNS discovery, health checks, балансировка, retry и connection pools |
| **Управление** | CLI, Management API, audit, revision/digest и optimistic lock |
| **Наблюдаемость** | JSON logs, Prometheus и OpenTelemetry metrics/traces |

## Быстрый старт

### 1. Проверьте доступность gateway

```bash
gateway help
```

### 2. Создайте конфиг

`gateway.yaml`:

```yaml
registry: { path: ./data/registry }
sites: { example: { path: ./data/registry/sites/example } }
listeners:
  web:
    type: http
    address: ':18080'
    routes:
      - when: { host: example.localhost }
        then: { site: example }
management: { address: 127.0.0.1:9090 }
```

### 3. Подготовьте простой сайт

```bash
data/registry/sites/example/
├── site.yaml
├── releases/release-2026-09-21/index.html
├── current -> releases/release-2026-09-21
└── previous -> releases/release-2026-09-20
```

### 4. Запустите и проверьте

```bash
gateway serve --config gateway.yaml
curl -H 'Host: example.localhost' http://localhost:18080/   # -> <h1>Hello, Liapoldus</h1>
curl http://localhost:9090/healthz                           # -> {"status":"ok",...}
```

Маршрут выбирается первым совпавшим `when`; fallback нужно объявить явным
последним route.

## Разделы

| Раздел | Содержание |
| --- | --- |
| [Корневая схема](root-schema) | полный `gateway.yaml`, справочник корневых ключей |
| [Полная схема gateway.yaml](gateway-schema) | нормативные поля, типы, defaults, ограничения и validation codes |
| [Маршруты и условия](server-blocks) | HTTP-listener, `when/then/else`, regex, действия и политики |
| [TCP, UDP и P2P](transports) | L4-listener, relay, flows, TLS passthrough и plugin sessions |
| [Upstream и балансировка](upstreams) | targets, DNS, health checks, балансировка и retry |
| [Конфиг сайта](site-config) | `site.yaml`, immutable release, `current`/`previous` и rollback |
| [HTTP runtime](http-runtime) | точный порядок HTTP-обработки, static, SPA, cache, headers и WebSocket |
| [TLS, auth и WAF](security) | ACME, mTLS, OIDC/JWT, политики и ограничения |
| [Reload и конфликты](tls-reload) | snapshots, validation, digest и atomic apply |
| [Management API](management-api) | HTTP-интерфейс управления |
| [Наблюдаемость](observability) | JSON logs, audit, Prometheus и OTLP-контракты |
| [Каталог ошибок](errors) | code, status, problem type, русский detail и CLI exit code |
| [Acceptance matrix](acceptance) | обязательные сквозные сценарии реализации |
| [Секреты и переменные](secrets) | include-дерево, `env:`, `file:`, подстановка и redaction |
