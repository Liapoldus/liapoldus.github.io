# Liapoldus Gateway

Liapoldus Gateway — control plane с Management API, CLI и SQLite desired state.
Caddy исполняет весь public HTTP/TLS и TCP/UDP traffic. Встроенный или
supervised external Caddy handler вызывает plugins напрямую по gRPC; Gateway
Management API не проксирует пользовательские запросы.

Constructor остаётся отдельным desktop/web-продуктом и единственным UI
настройки; web-пользователи и environment-scoped роли принадлежат Constructor.
Traffic настраивается native Caddyfile, а bootstrap gateway.yaml содержит
только state/artifact paths, Management bind/trust и Caddy build variant.
Plugins остаются отдельными процессами и подключаются через общий protocol.

| Задача | Канон |
| --- | --- |
| Bootstrap | [Минимальный gateway.yaml](/gateway/configuration/bootstrap) |
| Traffic и releases | [Group Releases API](/gateway/api/groups) |
| Management и Caddy Admin pass-through | [API/OpenAPI](/gateway/api/) |
| Безопасность/deployment | [Security](configuration/security), [Deployment](deploy/) |
| Архитектура и полный roadmap | [Architecture](architecture/) |

Старая Gateway-specific YAML route DSL, site.yaml и /api/sites не входят в
v1. Полный порядок миграции и критерии готовности зафиксированы в
[roadmap](/gateway/architecture/v1-migration-roadmap).
