# Примеры Gateway

Прежние примеры нативного Caddyfile/group API сохранены как URL-указатели и не
являются активным v1 contract. Новая traffic configuration задаётся
versioned JSON settings Caddy plugin, хранится Core в SQLite и применяется
через `ConfigApply`.

- [Plugin configuration](../api/config) — общий CAS/settings apply lifecycle.
- [Plugin deployment](../architecture/plugin-deployment) — supervised и
  external profiles.
- [Транспорты](../configuration/transports) — HTTP/TLS/WebSocket/SSE и
  Caddy-L4.
- [Целевая архитектура](../architecture/target) — ownership, persistence и
  security invariants.

Конкретная JSON traffic schema публикуется Caddy plugin-ом и не дублируется в
Core docs.
