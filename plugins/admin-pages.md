# Административные страницы Plugin

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

## Декларативная модель страницы

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

## Пространство имён Gateway API

Только Gateway предоставляет указанные ниже внутренние endpoints. Constructor
никогда не подключается к процессу plugin напрямую.

| Endpoint | Capability dispatch | Semantics |
| --- | --- | --- |
| `GET /api/plugins/{instance}/admin/surface` | `admin.surface.get` | returns cached, schema-validated surface + digest |
| `POST /api/plugins/{instance}/admin/pages/{page}/query` | page `dataCapability` | validates input schema; cursor/page limits; returns typed data only |
| `POST /api/plugins/{instance}/admin/pages/{page}/actions/{action}` | action capability | validates input, requires confirmation/idempotency for mutation, returns operation/result |
| `GET /api/plugins/{instance}/admin/pages/{page}/health` | `health` projection | bounded status, no raw logs/secrets |

Все маршруты требуют management principal Gateway и permission конкретного
plugin. Gateway проверяет `{instance,page,action}` по активному Surface,
передаёт только объявленные входные поля, добавляет actor/request ID и scoped
grant handles, применяет лимиты deadline/concurrency/payload, выполняет
redaction, пишет audit и отображает typed plugin errors в Problem Details.

`query` is read-only and cursor based. An `action` marked `dangerous` requires
the Constructor confirmation token bound to `(actor, instance, page, action,
input digest)` and expires after five minutes. Plugin never receives a raw
Constructor access token, secret value, management bearer key or database path.

## Жизненный цикл и кэш

1. Gateway starts instance, validates manifest/health/settings.
2. It requests `admin.surface.get`, validates against versioned contract and
   stores `(instance, manifest version, surface digest)`.
3. Constructor reads surface through Gateway and renders permitted pages.
4. Config apply, restart, manifest version change or unhealthy state invalidates
   cache; Constructor removes pages until a healthy valid surface returns.
5. Every query/action checks current surface digest; stale UI receives `409
   plugin_surface_changed` and reloads schema.

Некорректный Surface — ошибка protocol plugin, а не частично отображённый UI.
Gateway помечает административный Surface недоступным, но не останавливает
несвязанные public capabilities, если их собственный health contract успешен.

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

## Владение контрактом

The protocol source of truth is
[`pluginprotocol/contracts/admin-ui/v1`](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/admin-ui/v1).
The Gateway implementation owns endpoint authorization and dispatch. The
Constructor owns generated UI behavior. This page is canonical architecture;
the protocol schema and code must follow it exactly.
