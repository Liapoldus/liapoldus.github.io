# Management API

Management API — control plane Gateway. Он доступен только на отдельном
`management.address`, использует service account и возвращает JSON. `/healthz`
не требует авторизации; все остальные endpoints требуют `Authorization: Bearer`.

## Конфигурация и runtime

| Метод | Путь | Назначение |
| --- | --- | --- |
| `GET` | `/api/status` | listeners, snapshots, upstream health, plugins и revision |
| `GET` | `/api/config` | redacted YAML, revision и digest |
| `PUT` | `/api/config` | записывает и применяет YAML с `If-Match` |
| `POST` | `/api/config/validate` | компилирует переданный YAML без записи |
| `POST` | `/api/reload` | перечитывает файловое дерево конфигурации |
| `GET` | `/api/audit` | история применений и попыток изменений |

`PUT /api/config` принимает `Content-Type: application/yaml` и обязательный
`If-Match` с digest активного snapshot. При конфликте возвращает `409` с
актуальными `revision` и `digest`; при validation error — `422` с YAML-path,
без раскрытия секретов.

## Управление ресурсами

| Метод | Путь | Назначение |
| --- | --- | --- |
| `GET` | `/api/listeners` | listeners и состояние bind/drain |
| `GET` | `/api/upstreams` | targets, DNS discovery и health |
| `GET` | `/api/sites` | опубликованные сайты и active/previous release |
| `POST` | `/api/sites/{slug}/rollback` | атомарный rollback сайта |
| `GET` | `/api/plugins` | instances, capabilities, limits и health |
| `POST` | `/api/plugins/{id}/restart` | graceful restart instance |
| `GET` | `/api/plugins/{id}/logs` | redacted ring buffer plugin logs |
| `GET` | `/api/tls` | TLS profiles, certificate metadata и renewal state |
| `POST` | `/api/tls/{issuer}/renew` | запросить renewal через назначенный tls-issuer |
| `POST` | `/api/tls/{issuer}/revoke` | отозвать certificate с audit trail |

## Наблюдаемость

| Путь | Назначение |
| --- | --- |
| `GET /healthz` | liveness и readiness |
| `GET /metrics` | Prometheus metrics |
| `GET /api/traces/{requestId}` | trace-link и диагностический контекст при наличии OTLP |

Роли service account: `platform-admin` управляет всей конфигурацией,
`tenant-admin` видит и изменяет только назначенные sites/resources,
`observer` имеет read-only доступ к status, metrics и audit.
