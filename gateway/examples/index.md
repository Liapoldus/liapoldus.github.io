# Практические примеры Gateway

Примеры используют минимальный bootstrap gateway.yaml и native Caddyfile group
releases. Gateway-specific route YAML, site.yaml и includes больше не
поддерживаются. Ключи и лимиты задаются только опубликованными schemas.

- [Простой HTTP site и reverse proxy](simple-site) — нативные Caddyfile
  primitives и publication boundary.
- [TLS и management access](tls) — Caddy ownership и разделение traffic/API.
- [Plugin integrations](forms) — граница Gateway dispatch.
- [TCP/UDP relay](tcp) и [UDP/P2P relay](udp-p2p) — L4 scope v1.

Основные API: [Group Releases](/gateway/api/groups),
[Management OpenAPI](/gateway/api/openapi).
