# Логи, аудит и наблюдаемость

Core SQLite хранит durable operations, idempotency metadata, generation ACKs,
service-key metadata и audit. Access/application logs и traces выдаются через
явно подключённые sinks; Core не копирует request bodies или plugin payloads
ради диагностики.

Audit фиксирует actor/binding, action, resource, operation ID, digest,
timestamp, result и request ID. Он не содержит settings plaintext, Caddy
runtime config, Authorization, secrets, private keys, cookie values или grant
handles.

Metrics отражают singleton Core readiness, SQLite/storage health, supervised
process lifecycle, external endpoint/connectivity, desired/applied config и
interaction generations, per-replica ACK, operation age, Caddy plugin health,
ACME readiness по домену и L4 stream health. Labels не должны содержать raw
credentials, private endpoints, request payload, cookie values или grants.

Caddy plugin logs отделены от Core logs, но используют общую redaction policy.
Caddy Admin port не публикуется; его API не является операторской или
observability поверхностью. Незавершённые реализации отмечены в
[roadmap](../architecture/v1-migration-roadmap) и
[`core/TODO.md`](https://github.com/Liapoldus/core/blob/main/TODO.md).
