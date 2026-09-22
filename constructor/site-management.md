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
