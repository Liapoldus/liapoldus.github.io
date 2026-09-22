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

## Component contract

`schema.json` валидируется [Component schema](/spec/constructor-component.schema.json).
Field key стабилен: он адресует Content, locale variant, version diff и test
fixture, поэтому rename всегда требует migration.

| Field type | Stored value | Editor boundary |
| --- | --- | --- |
| `text`, `rich-text` | string / sanitized document JSON | locale variant when `localized` |
| `image`, `icon`, `file` | Asset ID | type/aspect/responsive requirement |
| `select` | declared scalar | only `allowedValues` |
| `reference` | typed entity ID | validated cross-reference |
| `object`, `array` | nested schema JSON | bounded structured inspector |

Slot допускает только declared component kinds. Event связывается с declared
Script action, никогда с inline arbitrary code. Breaking Component change
создаёт migration plan для каждого затронутого Content instance.

SDK читает generated content/theme/locale/route/asset artifacts и не соединяется
с Constructor API в production browser. Каждый SDK API имеет declarations,
детерминированное preview behavior и fixture.
