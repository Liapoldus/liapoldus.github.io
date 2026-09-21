# Management API

Management API — local control plane на `management.address`. `/healthz` не
требует авторизации; остальное требует `Authorization: Bearer <service-key>`.
В v1 существует только роль `platform-admin`.

## Общий контракт

Все JSON-ответы несут `requestId`. Изменяющие операции пишут audit record.
Ошибки имеют `Content-Type: application/problem+json`:

```json
{
  "type": "https://liapoldus.dev/problems/validation",
  "title": "Configuration is invalid",
  "status": 422,
  "code": "config_invalid",
  "detail": "unknown field \"hosts\"",
  "instance": "/api/config",
  "requestId": "req_01J...",
  "path": "listeners.web.routes[0]",
  "diagnostics": [{"path":"…","code":"unknown_field","message":"…"}]
}
```

`type`, `title`, `status`, `code`, `detail`, `instance` и `requestId` обязательны;
`path`/`diagnostics` добавляются только для validation. `401`, `403`, `404`,
`409`, `413`, `422`, `429`, `500`, `502`, `503` и `504` используют тот же формат.

## Конфигурация и runtime

| Method / path | Request | Success | Failure |
| --- | --- | --- | --- |
| `GET /api/status` | — | `200` runtime, listeners, snapshot, health | `401` |
| `GET /api/config` | — | `200 {yaml,revision,digest,requestId}`; secrets redacted | `401` |
| `PUT /api/config` | YAML body, `If-Match` required | `200 {revision,digest,requestId}` | `409 digest_conflict`, `422 config_invalid` |
| `POST /api/config/validate` | YAML body | `200 {valid:true,digest,requestId}` | `422 config_invalid` |
| `POST /api/reload` | — | `200 {revision,digest,requestId}` | `409 restart_required`, `422 config_invalid` |
| `GET /api/audit` | `cursor`, `limit` 1–100 (default 50) | `200 {items,nextCursor,requestId}` | `400 invalid_cursor` |

`If-Match` принимает ровно digest active snapshot. Не совпавший digest ничего не
перезаписывает и возвращает актуальные `revision` и `digest` в problem details.

## Ресурсы и публикация

| Method / path | Request | Success | Failure |
| --- | --- | --- | --- |
| `GET /api/sites` | `cursor`, `limit` | `200 {items,nextCursor,requestId}` | `400 invalid_cursor` |
| `POST /api/sites/{slug}/publish` | `{source, idempotencyKey}` | `201 {site,revision,previousRevision,requestId}` | `409 publish_in_progress`, `422 release_invalid` |
| `POST /api/sites/{slug}/rollback` | `{idempotencyKey}` | `200 {site,revision,previousRevision,requestId}` | `404 no_previous_release` |
| `GET /api/listeners` | — | `200 {items,requestId}` | `401` |
| `GET /api/upstreams` | — | `200 {items,requestId}` | `401` |
| `GET /api/plugins` | — | `200 {items,requestId}` | `401` |
| `POST /api/plugins/{id}/restart` | — | `202 {operationId,requestId}` | `404 plugin_not_found` |
| `GET /api/plugins/{id}/logs` | `cursor`, `limit` 1–200 (default 100) | `200 {items,nextCursor,requestId}` | `404 plugin_not_found` |
| `GET /api/tls` | — | `200 {items,requestId}` | `401` |
| `POST /api/tls/{issuer}/renew` | `{domains?,idempotencyKey}` | `202 {operationId,requestId}` | `404 issuer_not_found` |
| `POST /api/tls/{issuer}/revoke` | `{serial,idempotencyKey}` | `202 {operationId,requestId}` | `404 certificate_not_found` |

`source` — absolute local path, доступный Gateway; body и каталог не принимаются
по сети. `idempotencyKey` — 16–128 printable ASCII bytes; одинаковый ключ и
маршрут повторяют сохранённый terminal response 24 часа. Параллельный publish
одного `slug` возвращает `409`; другие сайты не блокируются.

## Health и диагностика

| Path | Auth | Response |
| --- | --- | --- |
| `GET /healthz` | no | `200 {"status":"ok","requestId":…}` либо `503` problem details |
| `GET /metrics` | yes | Prometheus exposition из [наблюдаемости](observability) |
| `GET /api/traces/{requestId}` | yes | `200 {traceId,traceUrl,requestId}` или `404 trace_not_found` |
