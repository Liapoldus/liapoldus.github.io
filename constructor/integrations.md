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
