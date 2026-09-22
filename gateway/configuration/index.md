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
| **HTTP(S)** | static, proxy, WebSocket, redirects, cache, compression, TLS, mTLS, WAF и auth capabilities |
| **TCP, UDP и P2P** | listener’ы, TLS termination/passthrough, relay, ограничения и plugin targets |
| **Upstream** | DNS discovery, health checks, балансировка, retry и connection pools |
| **Управление** | CLI, Management API, audit, revision/digest и optimistic lock |
| **Наблюдаемость** | JSON logs, Prometheus и OpenTelemetry metrics/traces |

## Работа с конфигом

1. Выберите путь с `--config`, `LIAPOLDUS_GATEWAY_CONFIG` или каталог через
   `LIAPOLDUS_CONFIG_DIR`.
2. Объявите корневые ресурсы: `registry`, `listeners` и один terminal target.
3. Проверьте граф: `gateway config validate`.
4. Получите описание поля: `gateway config explain <yaml-path>`.
5. Запустите `gateway serve`; reload никогда не заменяет active snapshot до
   завершения полной validation.

Полные сценарии живут в [примерах](/gateway/examples/), а эта область описывает
только язык конфигурации.

## Разделы

| Раздел | Содержание |
| --- | --- |
| [Язык gateway.yaml](yaml-reference) | поля, типы значений и общие правила |
| [Корневые ресурсы](root-schema) | группы корневых ключей и связи между ними |
| [Полная схема gateway.yaml](gateway-schema) | нормативные поля, типы, defaults, ограничения и validation codes |
| [Маршруты и условия](server-blocks) | HTTP-listener, `when/then/else`, regex, действия и политики |
| [TCP, UDP и P2P](transports) | L4-listener, relay, flows, TLS passthrough и plugin sessions |
| [Upstream и балансировка](upstreams) | targets, DNS, health checks, балансировка и retry |
| [Конфиг сайта](site-config) | `site.yaml`, immutable release, `current`/`previous` и rollback |
| [HTTP runtime](http-runtime) | точный порядок HTTP-обработки, static, SPA, cache, headers и WebSocket |
| [TLS, auth и WAF](security) | ACME, mTLS, auth capabilities, политики и ограничения |
| [Reload и конфликты](tls-reload) | snapshots, validation, digest и atomic apply |
| [Gateway API](/gateway/api/) | аутентификация, ресурсы, operations и OpenAPI |
| [Логи и наблюдаемость](/gateway/deploy/observability) | deployment, audit, Prometheus и OTLP |
| [Каталог ошибок](errors) | code, status, problem type, русский detail и CLI exit code |
| [Acceptance matrix](acceptance) | обязательные сквозные сценарии реализации |
| [Секреты и переменные](secrets) | include-дерево, `env:`, `file:`, подстановка и redaction |
