# Audit и operations API

`GET /api/audit` возвращает paginated audit records: actor, action, resource,
result, digest и `requestId`. Секреты и private material исключены до записи.

Операции restart plugin, TLS renew/revoke и другие длительные действия отвечают
`202` с `operationId`. `GET /api/operations/{id}` возвращает `pending`,
`running`, `succeeded` или `failed`; terminal ответ содержит `result` либо RFC
9457 `problem`. Operation хранится 24 часа.

Локальные JSONL audit, retention, logs, Prometheus и OTLP — в
[deployment observability](/gateway/deploy/observability).
