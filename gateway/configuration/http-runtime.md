# HTTP runtime boundary

HTTP/HTTPS, HTTP/2/3, reverse proxy, static serving, WebSocket, TLS и ACME
исполняет совместимый Caddy runtime. Канонический traffic config — native
Caddyfile group composition, не gateway.yaml DSL. Gateway не копирует в
собственную схему стандартные Caddy HTTP semantics.

Gateway владеет Management API, авторизацией операций, group activation,
immutable frontend roots, plugin lifecycle, подготовкой dispatch snapshots,
grants и audit. Caddy Liapoldus handler исполняет direct plugin dispatch,
применяет route/stream limits и redaction; он не обращается к Management API,
application use cases или SQLite. Две Liapoldus Caddyfile directives,
`liapoldus_frontend` и `liapoldus_plugin`, описаны в
[control plane](/gateway/architecture/control-plane#liapoldus-caddyfile-handlers).

Если Caddy не может адаптировать fragment или подготовить snapshot, текущий
runtime/current/previous остаются без изменений. HTTP behavior variants
покрываются parity conformance suite из [acceptance matrix](acceptance).
