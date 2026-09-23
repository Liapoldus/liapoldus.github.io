# Режим управления сайтом

Режим предназначен для designer, content manager и moderator. Основные
разделы: Pages, Navigation, Content, Localization, Assets, Theme, Preview и
Publish. Canvas поддерживает desktop/tablet/mobile и показывает реальный
renderer настолько близко к production build, насколько возможно.

## Граница page builder

Разработчик создаёт Component, описывает schema и разрешённые props/assets/
theme bindings. Designer выбирает подготовленные компоненты, размещает их,
заполняет Content и выбирает Asset. Он не получает unrestricted HTML/CSS
builder и не изменяет внутренний JSX.

Navigation canvas представляет Page как node, а navigation/action как edge.
Inspector связывает edge с конкретным элементом, например `Hero.button →
/products`. Это позволяет найти broken link до Build.

## Протокол редактирования

Canvas selection загружает только schema-visible fields Component instance.
Inspector отправляет patch with revision; API validates type, locale, asset
requirement, permission and reference before Git write. Drag-and-drop разрешён
только declared sortable slot/array. Undo/redo локален до Save; saved history —
Git diff and entity version, не opaque database event stream.

Publish требует отдельной permission, selected Environment, ready Snapshot,
green validation и confirmation current/target Deployment. Designer не может
менять Script, Infrastructure binding, Gateway TLS или Plugin grant.

## Enabled locales

Locale fallback is field-aware: `localized: true` resolves exact locale →
language → `default`; `localized: false` reads only the shared `default`
document. Locale documents retain the same instance/page structure. A mismatch
is a validation/build error.

The editor exposes `Default values` as a separate editing scope, not as an
enabled Site locale. Saves in that scope update fallback values in `default`;
Build/Deploy require selecting an enabled locale.

Site хранит упорядоченный список enabled locale identifiers в формате языка
(`en`) или language-region (`en-US`). Добавление и отключение locale сохраняет
Site document через текущий ETag. Отключение влияет на locale selector,
validation и Snapshot/Build, но не удаляет `liapoldus/content/<site>/<locale>.json`
и не стирает сохранённый draft. Site обязан сохранять хотя бы одну enabled
locale.

При открытии locale без собственного Content-файла редактор ищет документ по
порядку exact locale → language → `default`, показывает provenance fallback и
не переносит revision исходного документа. Save создаёт отдельный Content-файл
выбранной locale. Generation пишет artifact под target locale; disabled locale
не попадает в project-wide snapshot validation.
