# Validation, preview и UX

Preview Constructor запускает активный React-проект через `scripts.dev` на
loopback и показывает его в iframe с sandbox без `allow-same-origin`. Поэтому
preview не читает родительский Zustand store и storage редактора. Preview
отдаётся через per-session `<session>.localhost` reverse proxy: только host с
активным случайным session ID получает opaque-origin CORS, а upstream Vite
остаётся привязан к loopback и не получает browser `Origin`. Referrer остаётся
выключенным; HMR и module requests проходят через тот же host. Preview процесс
запускается и останавливается явным действием; при переключении проекта
предыдущий процесс завершается вместе с дочерними процессами.

Canvas передаёт актуальный Inspector draft в iframe через `postMessage`; SDK
принимает его в отдельный session store только от точного `parent` window, с
текущим random session ID и возрастающей revision. Поскольку sandbox без
`allow-same-origin` имеет opaque origin `null`, SDK разрешает такой origin
только вместе с проверками parent/session; loopback-origin тоже поддержан для
несandboxed тестового runtime. SDK подтверждает ready-сообщение до отправки
первого draft, поэтому гонка инициализации iframe не теряет контент. Это
работает только при наличии
`PreviewRuntimeProvider` в entrypoint проекта. Проекты без SDK wrapper продолжают
показывать сохранённые файлы рабочего дерева. Draft остаётся в памяти preview
и не записывается в Git до явного Commit.

Новый scaffold включает побайтный snapshot исходников `@liapoldus/react` в
`src/vendor/liapoldus/react/`, сохраняет его package metadata и MIT license,
оборачивает entrypoint SDK `PreviewRuntimeProvider` и использует
`usePreviewContent` на стартовой странице. Snapshot попадает в Git проекта и
не зависит от абсолютного пути к SDK checkout или от публикации в npm. Обновление
vendored версии должно быть явным и проверяемым по метаданным package.

Validation pipeline запускается перед Snapshot/Build и проверяет Component
schemas, React/Gateway routes, assets, localization, infrastructure, theme,
plugin/Gateway configuration и references. Problems panel различает error и
warning и сохраняет diagnostics при переключении selection/panel. Content
diagnostics несут stable `pageId`, `instanceId` и `fieldKey`, поэтому переход к
ошибке не разбирает текст сообщения; исправление поля очищает только его
источниковую диагностику.

Preview существует на уровнях Component, Page, Site и Snapshot и переключает
desktop/tablet/mobile. Snapshot Preview использует ровно зафиксированную
revision/model, поэтому решение publish/rollback можно проверить до действия.
Canvas v1 предоставляет responsive controls с viewport width 1440/768/390 CSS
px соответственно; ширина ограничивается доступной областью, а живое React-
приложение остаётся в изолированном sandbox iframe. Selection outline строится
по DOM bounds `PreviewInstance(instanceId)`; scaffold размечает стартовый
instance, а authored page source размечает остальные явно.

Принципы UX: visual first; code as escape hatch; contextual inspector справа;
graph для зависимостей; preview everywhere; progressive complexity; single
model для visual/code. Права определяют доступ: developer создаёт модели,
designer редактирует разрешённый content, admin выполняет infrastructure и
deployment действия; это permissions, а не жёстко заданные роли.

Local-first API materializes validated locale content into
`src/generated/content/<locale>.json`; generated files не редактируются вручную
и должны воспроизводиться из `liapoldus/content/**`.
