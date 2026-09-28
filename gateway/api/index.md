# Gateway Management API

Management API управляет Core desired-state: plugin instances, settings,
установкой локальных releases в supervised profile, external endpoints,
interaction policies, access, operations и audit. Он не проксирует public
traffic, не предоставляет Caddy Admin API и не содержит Caddy-specific route,
group или TLS endpoints.

## Поверхность API

| Область | Назначение |
| --- | --- |
| Plugins | Instance metadata, Manifest/ConfigSchema, settings JSON, endpoints и mode-specific lifecycle. |
| Plugin installation | TUF-каталог и установка выбранного signed release только в supervised profile. |
| Interactions | Explicit caller→target/capability/mode policy с CAS, durable operation и audit. |
| Admin Surface | Общая авторизованная граница для plugin-owned management actions и UI descriptors. |
| Operations | Polling durable operations и generation/replica readiness. |
| Access/Audit | Service-key lifecycle, operator actor и append-only audit. |

В external profile install и process lifecycle операции недоступны. Обе формы
API имеют одну authorization policy; точные схемы и status/error catalog — в
[OpenAPI](../../spec/management.openapi.yaml) и
[errors contract](../../spec/errors.json).

## Удалённые поверхности

Старые `/api/groups`, `/api/caddy/*`, `/api/caddy-state/*` и `/api/tls/*` не
являются частью нового v1. Caddy traffic settings сохраняются через generic
plugin config JSON, а сертификаты, site artifacts и `current/previous`
управляются Caddy plugin Admin Surface. Старые страницы оставлены как
совместимые маршруты документации, но описывают удалённый API.

Подробно: [аутентификация](authentication),
[plugin configuration](config) и [operations](operations).
