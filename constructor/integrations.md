# Gateway и plugins

<img src="/diagrams/constructor-integrations.svg" alt="Constructor взаимодействует с Gateway API и Plugin Admin UI contract" />

## Gateway workspace

Constructor — визуальный control plane, но не альтернативный Gateway runtime.
Workspace показывает Overview, Routes, Upstreams, Sites, Domains, TLS,
Networking, Plugins, Configuration, Releases, Logs, Metrics и Health в меру
доступности Management API. Он читает state, валидирует изменения, применяет
через API и отображает typed error, health/audit/operations.

Текущая интеграция и отсутствующие операции приведены в
[матрице API boundaries](/architecture/api-boundaries). Нельзя создавать
локальные сущности Gateway лишь потому, что endpoint ещё не существует.

## Plugins

Constructor умеет перечислять instance, показывать status/health и, после
появления API capability, создавать/изменять/restart их. Его UI не знает plugin
заранее: plugin предоставляет versioned [Admin UI schema](/plugins/admin-ui-contract)
с fields/actions/status/metrics/logs/health. Gateway контролирует доступ,
redaction и lifecycle; Plugin не передаёт UI произвольный executable code.

### Transport boundary

The accepted Plugin Protocol migration replaces the old framing with gRPC over
loopback HTTP/2. Gateway supervises each plugin and invokes its `PluginService`
control RPCs plus generic `Call` and bidirectional `Stream`; capability
payloads stay versioned JSON contracts. The current sibling `core` checkout has
migrated its plugin adapter to `pluginprotocol v1.1.0` through a local module
replacement; the release has not yet been published. Remaining Gateway
acceptance gates, including resource limits and scoped grants, are tracked in
the core repository.
The latest protocol client change preserves gRPC `Canceled` and
`DeadlineExceeded` as Go context cancellation/deadline errors. The current
sibling Gateway adapter preserves deadlines, but its in-flight `CallJSON` path
still maps explicit cancellation to `ErrPluginUnavailable`; preserving that
cancellation through Gateway's operation/API boundary is a tracked core
follow-up. Constructor remains outside that transport and does not duplicate
its error policy.
Constructor does not import `pluginprotocol`, connect to plugin loopback, or
implement a second plugin transport. The REST control plane and plugin IPC are
separate boundaries.

For declarative Admin UI, Constructor consumes only Gateway's fixed internal
REST API: `GET /api/plugins/{instance}/admin/surface`, query, and action routes.
Those endpoints are owned and authorized by Gateway; the Admin Surface schema
and page lifecycle are canonical at [Plugin Admin Pages](/plugins/admin-pages)
and [Plugin Admin UI contract](/plugins/admin-ui-contract). Constructor renders
known schema elements and never accepts plugin-provided URLs or executable UI.
The web bundle uses the same-origin Constructor bridge for those exact routes;
the local Go host forwards only the fixed Admin API path/method allowlist and
the required digest/idempotency/confirmation headers. `GATEWAY_TOKEN` remains
server-side and is never returned to browser JavaScript. No generic URL proxy is
exposed.

This UI capability depends on Gateway's fixed internal REST API, not on direct
plugin IPC. The old v1.0.0 length-prefixed plugin transport is incompatible;
do not add a Constructor-side fallback or dual-stack path. Constructor remains
unaware of plugin loopback endpoints and gRPC service details.

## Plugin pages in Constructor

Plugin pages appear under `Gateway → Plugins → <instance>` only after Gateway
returns a healthy, schema-valid Admin Surface. Constructor calls the fixed
Gateway internal API; it does not discover URLs, connect to plugin loopback,
or execute plugin UI. The page renderer maps allowed `form`, `table`, `detail`,
`metrics` and `log` sections to Constructor components, validates every action
input locally for UX and relies on Gateway as authorization authority.

Open tabs/cache are keyed by `instance + page ID + surface digest`. When Gateway
returns `plugin_surface_changed`, tab stops submitting, reloads schema and
preserves only non-secret draft values that still conform. Unknown types,
invalid schema, unhealthy instance or missing permission render explicit
unavailable state, never raw JSON editor.

The complete boundary is [Plugin Admin Pages](/plugins/admin-pages); forms-db
is the detailed reference at [forms-db](/plugins/forms-db).

Local Constructor enables the Gateway publish adapter only when `GATEWAY_URL` is
configured. Publish uses `POST /api/sites/{slug}/publish` and sends the
immutable build artifact directory as `source`, and sends the deployment ID as
both `Idempotency-Key` and body `idempotencyKey`, plus the current
`expectedCurrentRevision` CAS precondition. Constructor waits for a succeeded
Gateway operation, stores its returned release revision, and only then records
the Deployment active. Rollback uses the same revision precondition and its own
stable idempotency key. At startup the local recovery worker replays an in-flight
operation with the original idempotency key and compare-and-swap revision; an
unconfirmed result keeps the target reserved instead of claiming success.
Without `GATEWAY_URL`, deployment fails visibly instead of reporting a false
success. Constructor never discovers plugin loopback URLs or calls plugins
directly.
