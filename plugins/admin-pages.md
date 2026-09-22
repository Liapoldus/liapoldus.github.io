# Plugin Admin Pages

Plugin может добавить в workspace Constructor собственные административные
страницы. Это extension control plane, а не расширение public data plane:
plugin не получает browser bundle, public route, raw Gateway credentials или
право зарегистрировать произвольный HTTP handler.

## Цель

Страница позволяет оператору конфигурировать instance и выполнять его
предметные administrative actions. Например, forms-db показывает настройки
storage, фильтруемый список submissions и контролируемое удаление записи.
Gateway остаётся единственной точкой internal API, authorization, audit,
лимитов и redaction; Constructor остаётся единственным renderer UI.

<img src="/diagrams/plugin-admin-page-flow.svg" alt="Constructor получает declarative schema через Gateway и вызывает plugin capabilities через namespaced API" />

## Три независимых артефакта

| Артефакт | Автор | Хранение | Что содержит |
| --- | --- | --- | --- |
| Instance settings | оператор/Constructor | `gateway.yaml: plugins.<instance>.settings` | DB connection refs, feature settings; валидируются `config.schema` |
| Admin surface | plugin release | versioned plugin contract | page/section/field/table/action metadata |
| Page data/action result | plugin через Gateway | transient response + audit | typed query/action payload, никогда не executable UI |

Instance settings не являются UI schema, а UI schema не является конфигурацией
Gateway. Установка plugin instance не создаёт page сама по себе: Gateway
сначала получает и валидирует `admin.surface.get`, затем Constructor показывает
только страницы, которые capability объявляет для данного healthy instance.

## Declarative page model

```text
AdminSurface
├── schemaVersion
├── plugin / manifestVersion / surfaceDigest
└── pages[]
    ├── id, title, icon, required capability, permissions[]
    └── sections[]
        ├── form: fields and validation
        ├── table: columns, query capability, cursor policy
        ├── detail: read-only structured result
        ├── metrics / log: bounded observation projection
        └── actions[]: id, capability, input schema, confirmation, danger flag
```

Supported field types are `string`, `number`, `boolean`, `select`,
`multiselect`, `secret`, `file`, `directory`, `duration`, `size`, `code`,
`keyValue`, `array`, `object`. Constructor must reject an unknown section,
field or action type rather than interpret it. Labels/descriptions are plain
text; HTML, CSS, JavaScript/module URL, browser route and arbitrary endpoint
fields are forbidden by schema.

Page ID is stable, lowercase and instance-local. It becomes part of a
namespaced API path but never becomes a public Gateway route. A plugin release
may add page/field/action compatibly; removal or field type change requires a
new surface version and migration notice.

## Namespaced Gateway API

Only Gateway exposes the internal endpoints below. Constructor never connects
to plugin process directly.

| Endpoint | Capability dispatch | Semantics |
| --- | --- | --- |
| `GET /api/plugins/{instance}/admin/surface` | `admin.surface.get` | returns cached, schema-validated surface + digest |
| `POST /api/plugins/{instance}/admin/pages/{page}/query` | page `dataCapability` | validates input schema; cursor/page limits; returns typed data only |
| `POST /api/plugins/{instance}/admin/pages/{page}/actions/{action}` | action capability | validates input, requires confirmation/idempotency for mutation, returns operation/result |
| `GET /api/plugins/{instance}/admin/pages/{page}/health` | `health` projection | bounded status, no raw logs/secrets |

All routes require a Gateway management principal and plugin-specific
permission. Gateway validates `{instance,page,action}` against the active
surface; it forwards only declared input fields, attaches actor/request ID and
scoped grant handles, applies deadline/concurrency/payload limits, redacts
response, writes audit, and maps typed plugin errors to Problem Details.

`query` is read-only and cursor based. An `action` marked `dangerous` requires
the Constructor confirmation token bound to `(actor, instance, page, action,
input digest)` and expires after five minutes. Plugin never receives a raw
Constructor access token, secret value, management bearer key or database path.

## Lifecycle and cache

1. Gateway starts instance, validates manifest/health/settings.
2. It requests `admin.surface.get`, validates against versioned contract and
   stores `(instance, manifest version, surface digest)`.
3. Constructor reads surface through Gateway and renders permitted pages.
4. Config apply, restart, manifest version change or unhealthy state invalidates
   cache; Constructor removes pages until a healthy valid surface returns.
5. Every query/action checks current surface digest; stale UI receives `409
   plugin_surface_changed` and reloads schema.

Invalid surface is a plugin protocol failure, not a partially rendered UI.
Gateway marks admin surface unavailable but does not stop unrelated public
capabilities unless their own health contract fails.

## Security invariants

- Plugin cannot add an arbitrary Gateway API endpoint, listener or frontend
  code; all paths and operation kinds are fixed by Gateway.
- Constructor renders data and components it owns; it does not eval plugin
  output, trust HTML, or give plugin a DOM handle.
- `secret` field is write-only. Query response can state `configured: true`,
  never return its value or a secret reference without permission.
- Table data is subject to surface-declared columns, cursor limit and Gateway
  redaction. Export/download is a distinct declared action with audit.
- Configuration write remains `config.apply`; an admin page cannot mutate
  `gateway.yaml` outside its instance settings.

## Contract ownership

The protocol source of truth is
[`pluginprotocol/contracts/admin-ui/v1`](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/admin-ui/v1).
The Gateway implementation owns endpoint authorization and dispatch. The
Constructor owns generated UI behavior. This page is canonical architecture;
the protocol schema and code must follow it exactly.
