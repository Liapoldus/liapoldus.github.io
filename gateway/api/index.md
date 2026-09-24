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

Полный Caddy Admin API доступен только как аутентифицированный Gateway
pass-through; underlying Admin listener остаётся loopback/local IPC. Каждая
мутация создаёт checkpoint до передачи запроса и может перевести control plane
в `drift`, блокирующий group publish до явного reconcile/restore.
