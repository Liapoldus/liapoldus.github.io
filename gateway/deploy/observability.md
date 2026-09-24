# Логи, аудит и наблюдаемость

Audit, durable operations, idempotency metadata и checkpoints хранятся в
SQLite. Access/application logs и traces отправляются в явно настроенные
sinks; Gateway не копирует payloads ради диагностики.

Audit содержит actor, action, resource, operation/checkpoint IDs, safe
digests, timestamp, result и request ID. Он не содержит Caddyfile/archive
contents, Caddy Admin body, Authorization, secrets, private keys, cookies или
grant handles. Retention и backup задаются deployment policy и SQLite
maintenance procedure.

Metrics должны различать Gateway process/readiness, Caddy build variant/module
identity, active groups, current revisions, drift, operations, plugin
connectivity, certificate readiness by domain и storage exhaustion. Labels не
содержат credential, raw endpoint secrets, request body, cookie values или
grant handles.

Caddy и Gateway logs разделяются по компонентам, но obey одной redaction
policy. Container не экспортирует Caddy Admin port. См.
[security boundary](/gateway/configuration/security) и
[control-plane storage](/gateway/architecture/control-plane#sqlite-и-файлы).
