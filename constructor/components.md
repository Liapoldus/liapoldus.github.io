# Components, primitives и React SDK

Component — first-class entity, а не только `.tsx` файл:

```text
Component = Source + Props Schema + Content Schema + Events + State
          + Theme Bindings + Asset Requirements + Preview + Versions
```

Schema описывает UX-смысл поля: type, label, description, required, default,
validation, localization, asset type, aspect ratio, responsive options, widget,
allowed values, visibility и group. TypeScript inference недостаточен:
`image: string` не сообщает, URL это или editable ImageAsset.

**Primitive → Component → Page → Site.** Primitive — низкоуровневый reusable
building block (Button, Input, Stack, Grid, Container, Typography, Modal, Icon,
Image); Component публикует безопасную модель для page/content editing.

`@liapoldus/react` — удобный layer поверх React, не замена ему. Он предлагает
`component`, `primitive`, `reactive`, `computed`, `action`, `content`, `image`,
`asset`, `route`, `navigate`, `api`, `theme` и `locale`. Обычные React APIs,
hooks и сторонние библиотеки остаются разрешённым escape hatch.

## Контракт Component v1

`schema.json` проходит strict runtime validation; опубликованная
[Component JSON Schema](/spec/constructor-component.schema.json) описывает
структурный контракт. Необязательный `themeTokens` перечисляет стабильные пути
Design Tokens, от которых зависит компонент, например `colors.primary`.
Источник компонента использует соответствующую CSS variable
`var(--colors-primary)`. Constructor проверяет путь против Theme, выбранной
Site, и блокирует удаление используемого token до обновления schema.
Field key стабилен: он адресует Content, locale variant,
version diff и test fixture, поэтому rename всегда требует migration.

В реализованной v1 schema обязательны `schemaVersion`, `id`, `kind`, `source` и
`fields`. Descriptor поля задаёт `key`, `type`, `label`, опциональные
`description`, `required`, `nullable`, `localized`, `default` и `allowedValues`.
Допустимые типы: `text`, `rich-text`, `image`, `icon`, `file`, `select`,
`object`, `array` и `reference`. Slots/events, nested object schemas, asset
requirements и visibility/group остаются расширениями roadmap; `themeTokens`
поддерживается текущим Go schema decoder.

| Тип поля | Хранимое значение | Граница редактора |
| --- | --- | --- |
| `text`, `rich-text` | string | `rich-text` санитизируется при generation |
| `image`, `icon`, `file` | `{kind, id, alt?}` для image | type проверяется по `liapoldus/assets.json` |
| `select` | declared scalar | only `allowedValues` |
| `reference` | `{kind: "reference", type, id}` | shape validated; entity registry references are roadmap |
| `object`, `array` | JSON object / array | nested item schema пока не поддерживается |

Slot допускает только declared component kinds. Event связывается с declared
Script action, никогда с inline arbitrary code. Breaking Component change
создаёт migration plan для каждого затронутого Content instance.

`localized` задаёт место хранения и правило разрешения значения. При `true`
значение берётся из документа выбранной locale, затем из language-only
документа и затем из `default`. При `false` значение общее для Site и читается
только из `default`; locale-документ не может переопределить его. Документы
разных локалей повторяют одинаковую структуру instance ID, page ID и component;
различаются только значения fields. Inspector и write API должны адресовать
локализованное поле выбранной locale, а общее — default-документу.

SDK читает generated content/theme/locale/route/asset artifacts и не соединяется
с Constructor API в production browser. Каждый SDK API имеет declarations,
детерминированное preview behavior и fixture.
