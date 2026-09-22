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
