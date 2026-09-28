# Durable operations

Асинхронная операция фиксирует изменение Core desired state: plugin install,
settings apply, endpoint/interaction-policy update, restart в supervised
profile, plugin Admin Surface action или rollback site release. Operation
содержит только metadata, status, digest, timestamps, actor и безопасный
result/problem summary; secrets и произвольные opaque payloads не хранятся.

Core сохраняет operation до внешнего действия. Повтор с тем же idempotency key
возвращает ту же operation; тот же ключ с иным digest отклоняется. После
рестарта Core продолжает или компенсирует действие по journal и фактическим
generation ACK-ам, не открывая readiness для несогласованного состояния.

Клиент получает operation ID из mutation endpoint и опрашивает
`GET /api/operations/{operationId}`. В external profile process lifecycle и
install operations не создаются. Operations не являются proxy к Caddy Admin
API.

Значения состояний, публичные errors и схемы зафиксированы в
[OpenAPI](../../spec/management.openapi.yaml) и
[error catalog](../../spec/errors.json). Подробный restart/recovery порядок —
в [целевой архитектуре](../architecture/target).
