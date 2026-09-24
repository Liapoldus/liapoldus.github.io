# Acceptance matrix Gateway v1

Все тесты должны проверять два Caddy build variants: embedded и compatible
external custom build. Обычный Caddy без Liapoldus modules и Caddy-L4 не
принимается. Caddy-L4 conformance failure блокирует v1; fallback implementation
не используется.

| Область | Обязательные сценарии |
| --- | --- |
| Bootstrap | Только state/artifacts/management/caddy; unknown fields, includes, site.yaml и traffic DSL отклоняются. |
| Persistence | SQLite migration, FK, transactions, backup/restore, process kill, crash recovery и локальный storage. |
| Group releases | Multipart metadata + Caddyfile + optional single tar.gz; digest/limits, hostile archives, CAS/idempotency, concurrent publish, current/previous, rollback. |
| Snapshot | Caddy adapt/load failures, listener conflicts, partial activation failure; прежний snapshot/pointers остаются согласованными. |
| Admin API | Полный native pass-through, loopback-only underlying listener, auth, checkpoint-before-mutation, drift detection, deploy block, explicit reconcile/restore. |
| Access | Web backend private HTTPS+mTLS plus per-Gateway Bearer token; desktop SSH-forwarded loopback plus TLS server verification and Bearer; one-time reveal, rotation/revocation and redaction. |
| Constructor | OIDC/local-JWT/desktop-no-login modes, WebAuthn, role/environment checks, multiple independent Gateway bindings, credentials excluded from browser. |
| Plugins | Mixed local-supervised and remote Service-backed instances; unique Pod identity mapped to logical instance; each new connection repeats TLS/Manifest/health handshake; no replay, downgrade or peer traffic. |
| Direct dispatch | Caddy handler → plugin gRPC is verified in both Caddy variants; request/response bodies never pass through Management API, SQLite or config files. External dispatch snapshot sync uses private permissioned Unix socket and is atomic. |
| Recovery | Active immutable generation is hydrated to memory; DB pointers and artifact digests reconcile before listener activation; one unavailable plugin degrades only its bindings. |
| `Call`/`Stream` | Existing JSON `Call` stays compatible; Stream covers HTTP bidi upload/download, WebSocket accept/subprotocol/message boundaries, SSE events and existing L4 lifecycle. |
| Stream safety | Actual byte counting including chunked, message bounds, backpressure, per-instance/route concurrency, idle/max-duration, cancellation and response-start failure semantics. |
| Data safety | No plaintext secrets in Caddyfile/DB/API response/Admin payload/audit/logs/traces; no raw Admin request bodies in audit; cookies and grants redacted. |
| HTTP/TLS | HTTP/1.1, HTTP/2, HTTP/3, native Caddyfile, TLS, ACME readiness async by domain, static/proxy/WebSocket/SSE. |
| L4 | TCP/UDP relay, datagram/message boundaries, bounds, timeouts, cancellation, reload, concurrency, both Caddy variants, macOS/Linux. |
| Release delivery | Embedded Gateway binary/container; external variant launches and supervises only a compatible custom Caddy child process; no public Caddy Admin endpoint. |

Implementation uses black-box TypeScript unit/integration/E2E under separate
tests directories. Every increment starts with a red test. Milestone gates:
VitePress build, make check, go vet ./..., go build ./..., macOS/Linux builds,
Docker smoke and all conformance/security tests.
