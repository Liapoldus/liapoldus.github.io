# Ресурсы и операции

Набор endpoints и typed schemas единожды определён в [OpenAPI](/spec/management.openapi.yaml). Эта страница описывает только владение и общую механику операций.

## Control-plane ресурсы

| Ресурс | Источник истины | Область изменения |
| --- | --- | --- |
| Caddy groups/revisions | SQLite metadata/digests/pointers + immutable files | Group publish/rollback активирует полный in-memory Caddy snapshot. |
| Plugin instances/settings | SQLite metadata/state + immutable settings revision files | Отдельные CRUD/apply операции; group rollback не меняет plugin settings. |
| Service keys | SQLite verifier hash и lifecycle | Raw credential выдаётся только create/rotate один раз. |
| Caddy checkpoints | SQLite metadata + immutable snapshot artifact | До каждой mutating Admin API операции. |
| Operations/idempotency | SQLite | Durable polling/retry/recovery. |
| Audit | SQLite append-only records | Redacted, без тел и секретов. |
| Caddy runtime | Embedded Caddy или supervised external Caddy process | Конфигурация и dispatch generation по private Admin API/IPC; customer traffic напрямую через Caddy handler к plugin. |

## Долгие операции

Publish, rollback, checkpoint restore, reconcile, plugin lifecycle и TLS
renew/revoke возвращают 202 с operationId. Клиент опрашивает
GET /api/operations/{operationId}. Состояния: pending, running,
succeeded, failed; завершённая operation содержит typed result либо RFC
9457 problem. Operation и idempotency record сохраняются в SQLite и
восстанавливаются после process restart.

Idempotency применяется к actor + key + canonical request digest. Тот же ключ
с тем же содержимым возвращает ту же operation; другой digest возвращает
409 idempotency_conflict. Retention и максимальное число записей задаются
versioned runtime contract. Group changes дополнительно используют CAS через
expectedCurrentRevision; Admin reconcile — If-Match runtime digest.

## Caddy Admin pass-through

/api/caddy/{path} повторяет native Caddy Admin methods/payloads. Gateway
сохраняет upstream status/body, применяя только безопасные transport headers и
redaction в telemetry. Request/response payload не попадают в audit. Перед
POST, PUT, PATCH или DELETE Gateway создаёт checkpoint и durable operation.
Неуспешный запрос не помечает runtime как изменённый, если Caddy
подтверждает отсутствие mutation; неопределённый transport result помечается
как потенциальный drift и блокирует group activation.

Если native mutation меняет runtime вне опубликованных group revisions,
GET /api/caddy-state показывает drift. До явного restore/reconcile publish и
rollback отклоняются. Restore возвращает checkpoint snapshot; reconcile
строит полный runtime из выбранного набора revisions. Автоматическое
преобразование arbitrary Caddy JSON в Caddyfile не выполняется.

## TLS operations

Caddy/CertMagic владеет ACME. GET /api/tls сообщает готовность по домену;
POST /api/tls/{domain}/renew и /revoke — async/idempotent операции только для
Caddy-managed certificates. Revoke требует serial и reason. Static/external
certificates этими endpoints не изменяются.

## Удалённые старые ресурсы

Старые /api/config, /api/sites, /api/reload и site-oriented publish
контракты относятся к прежней Gateway route DSL и не являются v1 API. Их
замещают bootstrap schema, Group Releases API и full Caddy Admin pass-through.
