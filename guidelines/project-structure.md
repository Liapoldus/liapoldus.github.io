# Структура проектов

Один продукт — один repository/module с явным entry point, versioned contracts
и независимым набором тестов. Не размещайте production-код в `assets/`: там
только статические versioned contracts, schemas и fixtures.

В Gateway `domain` содержит только `models/` и `interfaces/`; один model или
interface — один файл. Application содержит use cases, infrastructure —
адаптеры, presentation — API/CLI. Подробная схема — в
[архитектуре Gateway](/gateway/architecture/structure).

Constructor хранит проектные исходники в Git. Его БД хранит только users,
permissions, bindings, snapshots, builds, deployments и runtime metadata.
