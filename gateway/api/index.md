# Gateway Management API

Management API управляет группами Caddyfile revisions, plugin instances,
доступом, операциями и аудитом. Он не обслуживает пользовательский traffic и
не принимает Gateway route DSL.

Полный контракт: [`management.openapi.yaml`](/spec/management.openapi.yaml).
Management API доступен только на отдельном listener. Web Constructor backend
использует private HTTPS+mTLS и отдельный Bearer `platform-admin` token на
каждую Gateway binding; desktop входит через ограниченный SSH tunnel к loopback
API и использует Bearer token. Constructor roles остаются в Constructor; см.
[каноническую модель доступа](authentication).

| Раздел | Контракт |
| --- | --- |
| [Аутентификация](authentication) | Web mTLS, desktop SSH bridge, Gateway service tokens и Constructor authorization boundary. |
| [Group releases](groups) | Multipart Caddyfile/archive, revisions, idempotency и rollback. |
| [Ресурсы и операции](operations) | Status, plugin instances, TLS, checkpoints, drift и operations. |
| [Audit](audit) | Durable redacted audit semantics. |
| [OpenAPI](openapi) | Нормативная API schema без дублирования endpoint таблиц. |

Целевой контракт предусматривает полный Caddy Admin API через
аутентифицированный Gateway pass-through, checkpoint перед мутацией и drift
guard для group publish. Эти Admin/checkpoint/drift/reconcile функции пока не
реализованы; актуальная матрица готовности — в
[статусе реализации](/gateway/architecture/implementation). Сам underlying
Caddy Admin listener должен оставаться loopback/local IPC.
