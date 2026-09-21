# Наблюдаемость

Экспортер не меняет результат запроса: сбой log, Prometheus или OTLP sink
записывается локально и не делает data plane недоступным.

## Логи и audit

Access log — JSON object с обязательными `timestamp`, `level`, `event`,
`requestId`, `method`, `host`, `path`, `status`, `durationMs`, `bytesOut` и
`route`. Application log добавляет `component`; секреты, `Authorization`,
cookies, `plugin.context.secrets` и certificate material всегда redacted.

Audit record содержит `timestamp`, `actor`, `action`, `resource`, `result`,
`requestId`, `digestBefore`, `digestAfter` и `details`. Публикация также
содержит `site`, `revision` и `previousRevision`; неуспешная попытка не имеет
`digestAfter`.

Audit записывается JSONL в `${registry.path}/audit/YYYY-MM-DD.jsonl`, ротируется
ежедневно и хранится 90 дней. `timestamp` — RFC 3339 UTC с milliseconds,
`durationMs` — integer milliseconds. Operation records хранятся локально 24 h;
traces принадлежат внешнему OTLP backend и локально не retained.

## Prometheus и traces

| Metric | Type | Labels |
| --- | --- | --- |
| `liapoldus_http_requests_total` | counter | `listener`, `route`, `method`, `status` |
| `liapoldus_http_request_duration_seconds` | histogram | `listener`, `route`, `method`, `status` |
| `liapoldus_upstream_requests_total` | counter | `upstream`, `target`, `result` |
| `liapoldus_plugin_calls_total` | counter | `instance`, `capability`, `result` |
| `liapoldus_plugin_health` | gauge | `instance` |
| `liapoldus_tls_certificate_expiry_seconds` | gauge | `profile`, `domain` |
| `liapoldus_snapshot_active_info` | gauge | `revision`, `digest` |

OTLP spans: `gateway.request` — server root span; `gateway.policy`,
`gateway.static`, `gateway.upstream`, `gateway.plugin` — children. Общие
атрибуты: `request.id`, `gateway.listener`, `gateway.route`, `http.method`,
`url.path`, `http.response.status_code`; payload, token и secret запрещены.
