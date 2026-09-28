# Статус реализации Gateway

Целевая архитектура и replacement gates определены в
[roadmap v1](v1-migration-roadmap). Текущая кодовая база ещё не соответствует
новой модели: Caddy runtime, Caddy adapters и часть Caddy-specific state
находятся в `core`; отдельного `plugins/caddy` пока нет. Поэтому сборка Core
или отдельные handler tests не являются доказательством готовности целевого
v1.

Текущий перечень открытых задач ведётся в
[`core/TODO.md`](https://github.com/Liapoldus/core/blob/main/TODO.md), а
plugin protocol — в
[`pluginprotocol/TODO.md`](https://github.com/Liapoldus/pluginprotocol/blob/main/TODO.md).
TODO содержит только незавершённые задачи; исторические результаты тестов не
заменяют acceptance matrix.

Проверяемые этапы: сначала VitePress build после нормативных docs/contracts,
затем protocol SDK conformance, Core SQLite/config apply, generic plugin
lifecycle/interactions, Caddy plugin child-process acceptance и только затем
удаление legacy Caddy implementation из Core. Полный v1 readiness требует
всех gates из [матрицы проверки](../configuration/acceptance).
