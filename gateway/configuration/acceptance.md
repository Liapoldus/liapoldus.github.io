# Acceptance matrix

Матрица — обязательный минимум реализации. Каждый сценарий проверяет response,
состояние, audit/log/metric effect и отсутствие частичного применения.

| Сценарий | Приёмочный результат |
| --- | --- |
| Invalid YAML | `422 config_invalid`, YAML path; active snapshot и digest не меняются |
| Publish | immutable release валиден, `current` переключён, old current становится `previous`, есть audit и metric |
| Third publish | old `previous` удалён только после successful switch; audit содержит prune |
| Rollback | current/previous меняются атомарно; source release не модифицируется |
| Stale publish lock | несуществующий PID или lease >15 min очищается с audit; live lock даёт `409 publish_in_progress` |
| Management conflict | неверный If-Match даёт `409 digest_conflict` с актуальным digest |
| OIDC/JWT/mTLS | callback проверяет state/nonce; invalid token/cert даёт `401 identity_invalid`; identity не forwarded без mapping |
| Geo/ASN failure | MMDB reload/lookup применяет configured `onError`, а не silently allow |
| WAF captcha | запрос получает `403 challenge_required`; token — единственный клиентский captcha input |
| Plugin startup | `manifest → health → config.schema → config.apply`; mismatch/10 s timeout оставляет instance unavailable |
| Plugin limits | call >5 s, payload >10 MiB, frame >1 MiB, RSS/calls exhaustion возвращают каталоговый code и не вызывают leak |
| ACME failure | existing valid certificate продолжает обслуживаться; expired без renew — `tls_degraded`, alert, audit и metric |
| HTTP/3 | h3 listener bind TCP+UDP на одном address, TLS/SNI и limits применяются к QUIC |
| Telemetry | required log fields redacted; audit rotates daily and is retained 90 days; operation is readable 24 h |
| Container | non-root/read-only image запускается с writable registry/audit/TLS mounts и проходит healthcheck |

## Формат проверки

Каждый automated acceptance test записывает: входную YAML/HTTP/CLI команду,
expected status/body, filesystem links before/after, audit record и именованную
metric/label. Нормативный список ошибок — [Каталог ошибок](errors).
