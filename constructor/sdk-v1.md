# React SDK v1

`@liapoldus/react` — тонкий typed layer поверх React. Приложение остаётся
обычным React-проектом и может использовать hooks и сторонние библиотеки.

## Публичная поверхность

- `primitive` — низкоуровневый визуальный building block.
- `component` — React renderer с `ComponentSchema`.
- `content`, `asset`, `image` — сериализуемые ссылки на generated artifacts.
- `defineState`, `reactive`, `computed`, `action` — serializable state model.
- `route`, `navigate`, `theme`, `locale` — runtime helpers.
- `RuntimeProvider` и `useRuntime` — явная граница preview/runtime.

Schema является источником правды для редактора. Ключ поля стабилен: его
изменение требует migration. В production SDK читает сгенерированные content,
theme, locale, route и asset artifacts; Constructor API недоступен из browser
runtime.

Schema хранит `fields` как массив descriptor-ов с ключом `key`, совпадающий с
форматом `schema.json` проекта. `component(schema, render)` выводит props из
descriptors: required-поля обязательны в TypeScript, а `allowedValues` сужает
тип select. `computed(read)` возвращает callable derived store с `get/subscribe`;
чтения `defineState` автоматически отслеживаются, включая условные зависимости.
В React его подключают через `reactive(computedValue)`.

`localized: true` означает locale-specific field с fallback
`locale → language → default`; `localized: false` означает shared field из
`default`. SDK получает уже resolved generated artifact и не выбирает источник
локализации в browser runtime.

Поддерживаемые v1 field types: `text` и `rich-text` — строки; `image`, `icon`
и `file` — asset references `{kind, id, alt?}`; `reference` — entity reference
`{kind: "reference", type, id}`; `object` — JSON object; `array` — JSON array;
`select` — строка либо скаляр из `allowedValues`. Image/icon/file references
должны иметь совпадающий `kind` или общий `kind: "asset"`. `nullable: true`
разрешает явный JSON `null`; без него `null` отклоняется. `default` применяется
при отсутствии поля в props и учитывается валидатором, но не записывается
обратно в source content.
`themeTokens` в `ComponentSchema` перечисляет typed Design Token dependencies;
Constructor сверяет их с Theme выбранного Site, а source компонента использует
соответствующие CSS variables. Каноническое cross-file правило описано в
[контракте Component](/constructor/components).
`rich-text` очищается при генерации artifacts; production runtime получает
только санитизированный HTML, а исходное поле остаётся неизменным до отдельного
Save пользователя.

`ContentImage` принимает typed asset reference и разрешает его только через
generated runtime asset map. Если там есть WebP/width variants, SDK строит
responsive `<picture>` с отсортированным `srcset`; исходный asset остаётся
fallback для `<img>`. Поддерживаются `sizes`, размеры изображения, lazy loading
и alt из props/reference. При неизвестном asset SDK показывает доступный
маркер ошибки, не создавая пустой URL. Constructor генерирует responsive WebP
variants и сохраняет оригинал как fallback; форматы, размеры и processing
policy описаны в [контракте assets](/constructor/content-assets).

## Совместимость

Каждая schema содержит `schemaVersion`. Breaking change выпускается как
migration `vN → vN+1`, которая преобразует content-файлы и fixture. Неизвестные
поля отклоняются валидатором, а обязательные поля проверяются до preview/build.

## Preview

Preview запускает обычное React-приложение проекта и получает отдельный
in-memory content store на сессию. Изменение в Inspector обновляет draft,
показывает diagnostics и не изменяет Git до явного Commit. Production runtime
остаётся artifact-only.

Project entry оборачивается в `PreviewRuntimeProvider`; компоненты читают draft
через `usePreviewContent(pageId, instanceId, key, fallback)`. Generated locale
artifacts и preview draft сохраняют структуру `pages → instances → fields`,
чтобы одинаковые field keys разных экземпляров не конфликтовали. Constructor
передаёт draft через `postMessage` только своему iframe: сообщения связаны с random
session ID и монотонной revision. В sandbox без `allow-same-origin` origin будет
opaque (`null`), поэтому SDK требует точный `parent` window и текущий session ID;
loopback-origin принимается для несandboxed тестового runtime. SDK не отправляет
draft в API и хранит его в памяти. Для предотвращения гонки запуска SDK
повторяет `preview-ready` до получения `preview-ready-ack` от parent window.

Rendered instance оборачивается в `PreviewInstance` с его stable `instanceId`.
Constructor передаёт текущий selected ID вместе с revision-scoped draft message;
SDK рисует внутри preview iframe фиксированный outline по фактическим DOM bounds
и не меняет layout страницы. Wrapper добавляет только `display: contents` и не
делает запросов к Constructor; scaffold помечает свой стартовый `hero-main`.

Пока npm release ещё не создан, scaffold помещает точный source/package/license
snapshot SDK в `src/vendor/liapoldus/react/` и использует его через локальный
import. Так project revision остаётся автономным, а обновление SDK в проекте
выполняется явной синхронизацией и проверкой migration, а не плавающим npm tag.
