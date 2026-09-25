# CAPTCHA plugin

> **Статус:** runnable skeleton с deterministic provider. Реальные внешние
> providers и полный browser lifecycle пока не реализованы.

CAPTCHA — plugin-owned function, а не встроенная Gateway feature. Gateway не
содержит provider registry, CAPTCHA-specific WAF action, endpoint, error code
или challenge cookie.

Плагин владеет provider settings, token verification, challenge/callback
capabilities, nonce/state, replay protection и cookie lifecycle. Settings
schema и capabilities объявляет сам plugin. Gateway валидирует settings,
хранит immutable settings revision как файл и её metadata/digest в SQLite;
содержимое settings Gateway не интерпретирует.

## Traffic и provider ownership

WAF/routing использует общий plugin capability dispatch через
`liapoldus_plugin` directive в native Caddyfile как целевую архитектуру. До
production activation Gateway должен проверить instance, capability и mode;
Caddy handler должен напрямую вызвать plugin, проверить typed decision/HTTP
response action и применить limits/redaction. Эти требования не означают, что
WAF consumer или production `serve` → Caddy → plugin composition уже подключены.
Текущий статус handler slices и production wiring описан в
[матрице реализации core](/gateway/architecture/implementation#текущее-состояние-core).
Management API по целевой архитектуре не проксирует пользовательский request.

Provider identity, verification URL и server secret принадлежат plugin
settings. Browser body не может выбирать trusted provider/URL. Provider secret
получается только через call-scoped grant; secret bytes не попадают в обычный
Call JSON, response клиенту, logs, traces или audit.

Plugin владеет challenge/session cookie lifecycle. Gateway-owned входной
allow-list и typed ordinary/HttpOnly response actions определяются общим
[cookie contract](/gateway/architecture/cookies) и нормативными схемами
`pluginprotocol`; это не отдельная CAPTCHA policy. Изолированные Caddy handler
tests покрывают эту границу, но production `serve` dispatch ещё не подключён;
сквозной cookie flow остаётся незавершённым.

Текущий skeleton не выполняет обращения к внешним providers и не реализует
полный challenge/callback/session flow; production readiness не заявляется.
Общий plugin boundary — [manifest](manifest), [cookies](/gateway/architecture/cookies)
и [Gateway security](/gateway/configuration/security).
