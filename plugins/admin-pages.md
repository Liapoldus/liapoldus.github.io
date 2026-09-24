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
| Instance settings | оператор/Constructor | Gateway Plugin Instance API; immutable settings revision files + SQLite metadata/digest | DB connection refs, feature settings; валидируются plugin `ConfigSchema` |
| Admin surface | plugin release | versioned plugin contract | page/section/field/table/action metadata |
| Page data/action result | plugin через Gateway | transient response + audit | typed query/action payload, никогда не executable UI |

Instance settings не являются UI schema, а UI schema не является конфигурацией
Gateway. Установка plugin instance не создаёт page сама по себе: Gateway
сначала получает и валидирует `admin.surface.get`, затем Constructor показывает
только страницы, которые capability объявляет для данного healthy instance.

## Декларативная модель страницы

```text
AdminSurface
├── version (plugin protocol surface version)
├── plugin / manifestVersion / surfaceDigest (Gateway metadata)
├── requiredCapabilities[]
└── pages[]
    ├── id, title, icon, required capability, permissions[]
    └── sections[]
        ├── form: typed fields, validation and option sources
        ├── table: columns, query capability/input schema, cursor policy
        ├── detail: read-only structured result
        ├── metrics / log: bounded observation projection
        └── actions[]: id, capability, input schema, row binding, confirmation, danger flag
```

Поддерживаемые типы полей: `string`, `number`, `boolean`, `select`,
`multiselect`, `secret`, `file`, `directory`, `duration`, `size`, `code`,
`keyValue`, `array`, `object`. Constructor must reject an unknown section,
field or action type rather than interpret it. Labels/descriptions are plain
text; HTML, CSS, JavaScript/module URL, browser route and arbitrary endpoint
fields are forbidden by schema.

Action объявляет `inputSchema` — ограниченную JSON Schema Draft 2020-12 для
object-input (`type`, `properties`, `required`, `additionalProperties:false`,
`minLength`/`maxLength`, `minimum`/`maximum` и `enum`; без `pattern` (чтобы
не исполнять недоверенные регулярные выражения в browser), `$ref`, executable
extensions и remote schema).
Constructor строит форму только из этого schema и
валидирует её перед запросом; Gateway повторно валидирует до dispatch. Surface
без `inputSchema` можно показать, но action остаётся disabled с диагностикой;
Constructor не изобретает payload. Для действия по выбранной строке
необязательный `rowInput` явно сопоставляет input key с column key
(`{"recordId":"id"}`); скрытое угадывание имён полей запрещено.

У `select`/`multiselect` есть ровно один источник: статический `options` или
`optionsSource` с объявленным Gateway capability, typed `inputSchema`,
`valueField` и `labelField`. Динамические options запрашиваются через тот же
fixed page `query` endpoint в режиме
`{"mode":"options","field":"site","input":{...}}`; Gateway проверяет
объявленный источник и передаёт plugin только typed operation/field/input.
Обычная таблица использует `{"mode":"data","input":{...},"cursor":"…",
"limit":50}` и `section.inputSchema`. Оба режима возвращают typed JSON;
options response имеет форму `{items:[{value,label}],nextCursor?}`. Gateway
сверяет поле/источник с активной Surface и `requiredCapabilities`, валидирует
вложенный input schema, ограничивает результат 200 options и не принимает из
браузера capability или endpoint. Отсутствующие/некорректные options делают
поле недоступным; Constructor не подменяет его произвольным текстовым вводом.

ID страницы стабилен, задаётся в нижнем регистре и локален для instance. Он
становится частью namespaced API path, но не public Gateway route. Релиз plugin
может совместимо добавить page/field/action; удаление или смена типа поля
требует новой версии Surface и уведомления о migration.

## Пространство имён Gateway API

Только Gateway предоставляет указанные ниже внутренние endpoints. Constructor
никогда не подключается к процессу plugin напрямую.

| Endpoint | Capability dispatch | Semantics |
| --- | --- | --- |
| `GET /api/plugins/{instance}/admin/surface` | `admin.surface.get` | returns cached, schema-validated protocol surface + Gateway metadata; `ETag` is the quoted `surfaceDigest` |
| `POST /api/plugins/{instance}/admin/pages/{page}/query` | page-declared data or option capability | requires `If-Match: "<surfaceDigest>"`; validates mode-specific input schema and cursor/page limits; returns typed data/options only |
| `POST /api/plugins/{instance}/admin/pages/{page}/actions/{action}` | action capability | requires `If-Match` and `Idempotency-Key`; validates action `inputSchema`; dangerous action uses the confirmation handshake below |
| `GET /api/plugins/{instance}/admin/pages/{page}/health` | `health` projection | bounded status, no raw logs/secrets |

Все маршруты требуют management principal Gateway и permission конкретного
plugin. Gateway проверяет `{instance,page,action}` по активному Surface,
передаёт только объявленные входные поля, добавляет actor/request ID и scoped
grant handles, применяет лимиты deadline/concurrency/payload, выполняет
redaction, пишет audit и отображает typed plugin errors в Problem Details.

`query` доступен только для чтения, имеет два schema-bound режима (`data` и
`options`) и использует cursor для данных. Все query/action
передают digest текущей Surface в стандартном quoted entity-tag формате
`If-Match: "<surfaceDigest>"`; устаревший digest возвращает
`409 plugin_surface_changed` до dispatch.

`action` с признаком `dangerous` выполняется в два запроса к тому же fixed
endpoint. Первый запрос содержит тот же `If-Match`, `Idempotency-Key` и input,
но не содержит `X-Admin-Confirmation`: Gateway ничего не dispatch-ит и
возвращает `428 confirmation_required` с одноразовым непрозрачным
`confirmationToken` и `expiresAt`. Constructor показывает confirmation UI с
объявленным текстом. Только после явного подтверждения он повторяет неизменный
input с теми же `If-Match` и `Idempotency-Key`, добавляя
`X-Admin-Confirmation: <confirmationToken>`. Gateway исполняет действие только
если токен не истёк и он привязан к `(actor, instance, page, action,
surfaceDigest, input digest, idempotency key)`; срок — пять минут. Изменение
input требует нового idempotency key и нового handshake. Токен одноразовый,
не хранится в persistent browser storage и не попадает в logs/audit.

Plugin никогда не получает raw Constructor access token, secret value,
management bearer key или database path.

## Жизненный цикл и кэш

1. Gateway запускает instance и проверяет manifest/health/settings.
2. Gateway запрашивает `admin.surface.get`, сверяет versioned contract и
   сохраняет `(instance, manifest version, surface digest)`.
3. Constructor читает Surface через Gateway и отображает разрешённые страницы.
4. Config apply, restart, смена manifest version или unhealthy state сбрасывают
   cache; Constructor скрывает страницы до получения healthy valid Surface.
5. Каждый query/action проверяет current surface digest из `If-Match`;
   устаревший UI получает `409 plugin_surface_changed`, прекращает отправку,
   перезагружает schema и сохраняет только соответствующие schema non-secret
   draft values.

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
- Dangerous-action confirmation is a two-request handshake; a `428` challenge
  never dispatches plugin code, and the one-time token is bound to the exact
  action input and idempotency key.
- Table data is subject to surface-declared columns, cursor limit and Gateway
  redaction. Export/download is a distinct declared action with audit.
- Configuration write remains the generic plugin `ConfigApply` lifecycle through
  Gateway; an admin page cannot mutate bootstrap `gateway.yaml` or traffic
  configuration outside its instance settings.

## Владение контрактом

Единственный источник правды для protocol находится в
[`pluginprotocol/contracts/admin-ui/v1`](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/admin-ui/v1).
Gateway implementation владеет endpoint authorization и dispatch. Constructor
владеет поведением generated UI. Эта страница — каноническая архитектура;
protocol schema и code обязаны точно ей соответствовать.
