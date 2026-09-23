# Assets, themes и localization

## Assets и images

Asset имеет тип Image, SVG/Icon, Font, Video, Document или Other. Developer
задаёт requirement, Designer выбирает конкретный файл drag-and-drop. Storage
абстрагирован как Filesystem, S3 или Custom.

### Контракт project format v1

Реестр `liapoldus/assets.json` — единый источник metadata и стабильных ID;
binary-файлы хранятся отдельно в `public/assets/`. Например:

```json
{
  "schemaVersion": 1,
  "id": "assets",
  "items": [{
    "id": "hero-image",
    "type": "image",
    "path": "public/assets/hero/hero.webp",
    "mimeType": "image/webp",
    "size": 1234,
    "sha256": "<64 lowercase hexadecimal characters>"
  }]
}
```

Content field типа `image`, `icon` или `file` хранит `{ "kind": "asset",
"id": "...", "alt": "..." }` (допустим также совпадающий `kind` типа поля).
Ссылка должна находить запись в реестре; `image`/`icon` требуют совпадающий
asset type, а `file` принимает любой. При валидации Constructor сверяет путь,
размер и SHA-256 с бинарным файлом. Реестр нельзя сохранить, пока его файл не
существует или metadata не совпадает. Редактирование content со ссылкой без
реестра блокируется.

Это metadata/reference контракт первой версии. Constructor API предоставляет
`GET /api/v1/project/assets`: он проверяет checksum и размер binary и отдаёт
реестр в каноническом порядке. Inspector позволяет выбрать зарегистрированный
asset для `image`, `icon` и `file`, а для Image показывает preview и редактирует
alt text. `POST /api/v1/project/assets` принимает raw PNG/JPEG/WebP/GIF или SVG
до 25 MiB; формат определяется по содержимому, ID и path генерируются
Constructor, одинаковые bytes дедуплицируются по SHA-256. Статичные PNG/JPEG/WebP
получают варианты шириной 320/640/1280/1920 px без upscale и crop; пропорции
сохраняются, качество WebP — 82. GIF, SVG и оригинал каждого raster-файла
остаются fallback; варианты сохраняются в `public/assets/` с dimensions, size и
SHA-256 в registry. Registry и все binaries публикуются одним optimistic batch.
SVG сериализуется
через allowlist элементов и атрибутов: active elements, event/style атрибуты и
внешние ссылки удаляются. Binary и обновлённый registry публикуются атомарно.
Generated responsive variants проверяются по размеру и SHA-256 при чтении
registry и перед генерацией runtime manifest/build.

Inspector дополнительно ищет по ID, пути и MIME/type без учёта регистра и
фильтрует каталог по зарегистрированному типу asset. Пользовательские tags ещё
не входят в metadata contract и не смешиваются с фильтром типа.

Image pipeline: Original → validation → processing → WebP → responsive variants
(`320`, `640`, `1280`, `1920`). Policy v1: WebP quality `82`, no-upscale,
preserved aspect ratio и отсутствие crop; лимит исходной загрузки — 25 MiB.
`ContentImage` из `@liapoldus/react` —
standard abstraction над `<picture>` с srcset, sizes, WebP/fallback, alt и lazy
loading.

SDK consumer и Constructor-side producer реализованы: `ContentImage` читает
variant manifest из generated runtime assets и использует original как fallback.
Пути вариантов стабильно адресуются checksum исходника и шириной; build
использует проверенные сохранённые binaries, не перекодируя их.

Upload проходит `received → validation → metadata extraction → processing →
variants ready`. Original checksum дедуплицирует binary в Site; variant checksum
immutable. Failed processing оставляет выбранный Asset неизменным. Browser
никогда не получает storage credential.

SVG/icon — изменяемый design asset с preview/search/categories/reuse, а не
hardcoded JSX. Font проходит validation/metadata, опциональное преобразование
TTF/OTF → WOFF2 и generated `@font-face`; затем доступен Theme Editor.

## Theme

Theme v1 — strict JSON в `liapoldus/themes/<id>.json`; его структура описана в
[Theme schema](/spec/constructor-theme.schema.json). `tokens` содержит стабильные
пути вида `colors.primary` с явными типами `color`, `fontFamily`, `fontSize`,
`fontWeight`, `lineHeight`, `length`, `shadow`, `duration` и `easing`.
Разрешённые значения ограничены типом: например, color — hex или `transparent`,
а length — числовая величина с безопасной CSS-единицей. Произвольные CSS строки
не попадают в generated CSS.

Theme token имеет stable path, typed base `value` и optional variant overrides.
Site выбирает Theme через необязательный `themeId`; если поле отсутствует,
используется тема `default` или единственная тема проекта. При неоднозначности
валидация требует явного выбора. Theme может задавать overrides для `light` и
`dark`; Build генерирует отсортированные CSS variables, ручной выбор через
`data-color-scheme` и системный dark preference. Site selection и theme token
changes сохраняются как project documents и участвуют в snapshot revision.
Constructor показывает список Themes в Site selector и даёт создать Theme с
starter tokens, редактировать typed base values и light/dark overrides; запись
использует theme-file ETag и отклоняет stale updates.

```json
{
  "schemaVersion": 1,
  "id": "brand",
  "name": "Brand",
  "tokens": {
    "colors.primary": { "type": "color", "value": "#1264a3" },
    "spacing.medium": { "type": "length", "value": "16px" }
  },
  "variants": {
    "dark": { "colors.primary": "#b4d9fa" }
  }
}
```

Компонент объявляет зависимости от token через `themeTokens` в schema. При
сохранении Component schema, Theme и выбора Theme в Site Constructor проверяет
эти ссылки. Удаление используемого token блокируется до обновления schema.
Источник компонента использует CSS variable `var(--<path-with-hyphens>)`; SDK
типизирует список зависимостей. Произвольный исходный CSS не сканируется на
скрытые token references.

## Localization

The canonical v1 storage rule is field-aware: `localized: true` resolves values
from exact locale → language → `default`; `localized: false` reads the shared
value only from `default`. Locale documents repeat the same instance/page
structure, and builds emit the merged resolved locale view. Localized edits
belong to the selected locale document; shared edits belong to `default`.

Localization — вариативность Content: у field есть `default`, `en`, `ru`, `de`
и другие варианты. Fallback: `ru-RU → ru → default`. Build генерирует обычный
i18n JSON, поэтому ручный `t("key")` не является главным UX, но остаётся
возможностью кода.

Content write адресуется `(site, component instance, field key, locale)` и
валидируется до Git write. Required localized field блокирует Snapshot только
для locale, включённой Site. Rich text sanitizes during generation: фиксированный
набор форматирующих tags сохраняется, active-content subtrees (`script`, `style`,
`svg`, `iframe` и т. п.) и непредусмотренные attributes удаляются, ссылки
допускают только `http`, `https`, `mailto`, `tel` и relative URLs. Oversized или
invalid UTF-8 input блокирует generation; canonical source content не меняется.

В project format instance хранится в
`liapoldus/content/<site-id>/<locale>.json` и содержит `id`, `pageId`,
`component` и schema-валидируемые `fields`. `pageId` ссылается на stable page ID
из Site document. Подробный versioned JSON shape описан в
[формате Git-проекта](/constructor/project-format).
