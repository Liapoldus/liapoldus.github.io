# Конфигурация

Configuration отделяется от кода, описывается versioned schema и валидируется
до применения. Секреты ссылаются по opaque references; plaintext values не
включаются в Git, logs, API responses или fixtures.

У Gateway один Core instance и SQLite как единственный долговременный источник
desired-конфигурации всех сервисов. Plugin settings — versioned JSON revisions
в SQLite; Core проверяет их по подключённому Manifest/ConfigSchema, строит
immutable in-memory snapshot и передаёт полный документ plugin через
`ConfigApply`. Плагины не читают application settings из environment, argv или
локальных конфигурационных файлов и не запрашивают настройки у Core.

`gateway.yaml` содержит только bootstrap самого Core. Public traffic и Caddy-L4
исполняет отдельный Caddy plugin; его traffic configuration также приходит как
JSON settings от Core. Внутренний runtime artifact Caddy является производным и
не служит независимым источником истины.
