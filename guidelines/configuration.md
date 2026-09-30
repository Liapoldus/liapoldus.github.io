# Конфигурация

Configuration отделяется от кода, описывается versioned schema и валидируется
до применения. Секреты ссылаются по opaque references; plaintext values не
включаются в Git, logs, API responses или fixtures.

У Core один Core instance и SQLite как единственный долговременный источник
desired-конфигурации всех сервисов. Plugin settings — versioned JSON revisions
в SQLite как exact raw JSON generations; Core проверяет их по Manifest/schema,
строит immutable in-memory snapshot и вызывает REST `Reload(generation)`. Plugin
сам запрашивает у Core точный документ через config-pull endpoint. Плагины не
читают application settings из environment, argv или локальных
конфигурационных файлов и не имеют альтернативного config source.

`core.yaml` содержит только bootstrap самого Core. Public traffic и Caddy-L4
исполняет отдельный Server plugin; его traffic configuration также приходит как
JSON settings от Core. Внутренний runtime artifact Caddy является производным и
не служит независимым источником истины.
