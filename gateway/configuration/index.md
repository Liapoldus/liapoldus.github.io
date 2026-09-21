# Конфигурация

::: info Контракт конфигурации
Эта страница — справочник публичного формата `gateway.yaml`. Gateway валидирует
конфигурацию целиком до запуска и сообщает путь YAML при ошибке.
:::

Единый `gateway.yaml` и дерево include описывают runtime. Gateway не требует
собственной БД: конфигурация, registry и защищённое certificate storage —
наблюдаемые источники состояния.

## Возможности

| Возможность | Описание |
| --- | --- |
| **Сайты из registry** | опубликованные release в `sites/<slug>/`; `current` активен, `prev` доступен для rollback |
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
data/registry/
└── sites/example/
    ├── current/index.html
    └── site.yaml
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
| [Маршруты и условия](server-blocks) | HTTP-listener, `when/then/else`, regex, действия и политики |
| [TCP, UDP и P2P](transports) | L4-listener, relay, flows, TLS passthrough и plugin sessions |
| [Upstream и балансировка](upstreams) | targets, DNS, health checks, балансировка и retry |
| [Конфиг сайта](site-config) | `site.yaml` рядом с release, `current`/`prev` и rollback |
| [TLS, auth и WAF](security) | ACME, mTLS, OIDC/JWT, политики и ограничения |
| [Reload и конфликты](tls-reload) | snapshots, validation, digest и atomic apply |
| [Management API](management-api) | HTTP-интерфейс управления |
| [Секреты и переменные](secrets) | include-дерево, `env:`, `file:`, подстановка и redaction |
