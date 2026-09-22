# Assets, themes и localization

## Assets и images

Asset имеет тип Image, SVG/Icon, Font, Video, Document или Other. Developer
задаёт requirement, Designer выбирает конкретный файл drag-and-drop. Storage
абстрагирован как Filesystem, S3 или Custom.

Image pipeline: Original → validation → processing → WebP → responsive variants
(`320`, `640`, `1280`, `1920`). Policy задаёт formats, sizes, quality, aspect
ratio, maximum size, cropping и fit. `ContentImage` из `@liapoldus/react` —
standard abstraction над `<picture>` с srcset, sizes, WebP/fallback, alt и lazy
loading.

SVG/icon — изменяемый design asset с preview/search/categories/reuse, а не
hardcoded JSX. Font проходит validation/metadata, опциональное преобразование
TTF/OTF → WOFF2 и generated `@font-face`; затем доступен Theme Editor.

## Theme

Theme Schema содержит colors, typography, spacing, radius, shadows,
breakpoints и animations. Component обращается к token (`theme.colors.primary`),
Designer меняет token, а не внутренний CSS.

## Localization

Localization — вариативность Content: у field есть `default`, `en`, `ru`, `de`
и другие варианты. Fallback: `ru-RU → ru → default`. Build генерирует обычный
i18n JSON, поэтому ручный `t("key")` не является главным UX, но остаётся
возможностью кода.
