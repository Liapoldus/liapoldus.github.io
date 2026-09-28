# Public transports

HTTP/1.1, HTTP/2/3, TLS, WebSocket, SSE и TCP/UDP relay обслуживает отдельный
`plugins/caddy` process, собранный вместе с Caddy и Caddy-L4. Core не
принимает public requests и не реализует traffic sockets. В v1 у одного Core
допускается ровно одна active Caddy replica.

Caddy-specific JSON settings хранятся в Core SQLite и push-ятся через
`ConfigApply`; Caddy plugin преобразует их в runtime-конфигурацию. Это не
Caddyfile API и не вторая Gateway route DSL. Публичные порты открывает сам
plugin; Docker/Kubernetes задаёт Service/host publication, supervised install
получает только необходимые OS grants.

Caddy-L4 — обязательный TCP/UDP implementation, его conformance блокирует v1;
fallback на Go `net`/`gnet` не предусматривается. P2P означает только relay к
заданному peer, без discovery или NAT traversal. См.
[Acceptance](acceptance) и [целевую архитектуру](../architecture/target).
