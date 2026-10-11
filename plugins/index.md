# Плагины Liapoldus

Plugin — отдельный process/service, который подключается к generic Core через
REST Plugin SDK. До регистрации instance Core не знает конкретные
capabilities, settings, provider names или product admin routes.

Core — единственный durable source of desired configuration: settings каждой
instance сохраняются в SQLite. Core вызывает REST `Reload(generation)`, после
чего plugin сам pull-ит точный immutable JSON generation. Application settings
не передаются через environment, argv или app config file. Core проверяет
manifest/schema и хранит plugin-neutral metadata; бизнес-семантика остаётся в
plugin.

Каждый активный plugin строится строго на базе Plugin SDK `HandlerSet`. SDK
универсально предоставляет `GET /healthz` и `GET /metrics`; эти endpoints не
реализуются product plugin-ами отдельно и имеют одинаковую семантику для
Server, forms-db, Echo и будущих plugin-ов.

## Обязательная SDK-интеграция

Правило относится ко всем product plugins, включая CAPTCHA, Identity, Domain и
Runtime: production binary использует Plugin SDK `HandlerSet` для Core-facing
REST lifecycle. `GET /healthz` и `GET /metrics` универсальны и реализуются
только SDK с едиными путями и семантикой; plugin не добавляет, не переопределяет
и не дублирует эти endpoints. Domain и Runtime в текущем pass не изменяются;
это исключение из объёма работ, а не из архитектурного правила.

SDK migration не означает, что все product capabilities уже готовы к
production acceptance. OIDC/OAuth и CAPTCHA product readiness остаются
отдельными gates, описанными у владельцев этих plugins.

## Текущий implementation scope

В текущем срезе Studio/runtime acceptance активно дорабатываются только Server
и Echo. Остальные плагины отложены; их исходники не входят в данный
implementation scope. Перед возобновлением каждый должен пройти SDK conformance
и собственные product acceptance gates:

| Plugin | Статус | Что завершить перед возобновлением |
| --- | --- | --- |
| [Server](/plugins/server) | Активен | Core Management API → SDK REST startup/configuration, независимая маршрутизация к Echo, curl smoke и production diagnostics. |
| Echo | Активен | SDK-owned health/metrics, typed manifest/settings, независимый peer handler и Server→Echo smoke без зависимости Echo от Server. |
| [forms-db](/plugins/forms-db) | Отложен | Повторно проверить SDK contract v2, единые `/healthz`/`/metrics`, Core configuration lifecycle и SQL/peer integration gates. |
| [CAPTCHA](/plugins/captcha) | Отложен | Завершить SDK v2 runtime migration, secret/config lifecycle, универсальные observability endpoints и отдельный Core/Caddy/Siteverify acceptance. |
| [Identity](/plugins/identity) | Отложен | Завершить SDK v2 runtime migration, строгие schemas и OIDC/OAuth/session/key lifecycle acceptance; универсальные endpoints должны оставаться SDK-owned. |
| [Domain](/plugins/domain), [Runtime](/plugins/runtime) | Не трогать в текущем pass | До новой реализации сверить SDK composition, `/healthz` и `/metrics`, затем закрыть их собственные domain/runtime acceptance gates. |

Общее правило SDK и observability остаётся целевым для всех plugins; отсрочка
означает только последовательность реализации, а не отдельный lifecycle или
допуск к production без conformance.

## Runtime ownership

| Область | Владелец |
| --- | --- |
| Instance metadata и fixed endpoints | Core; plugin binaries оператор вручную устанавливает и запускает. |
| Plugin process/workload lifecycle | Оператор. Core не устанавливает, не запускает, не останавливает, не перезапускает и не масштабирует plugins. |
| Settings/schema/capabilities | Plugin Manifest и его versioned JSON contracts. |
| Config transport/lifecycle | Независимый Plugin SDK REST; config pull и Reload. Rollback выполняется Core Management API, plugin-side rollback endpoint отсутствует. |
| Calls/streams и peer transport | `pluginprotocol` generic library; права вызова проверяет product plugin по authenticated peer identity. Core-owned interaction policies отложены до v2. |
| Caddy data plane | [Отдельный Server plugin singleton](/plugins/server); Core не встраивает Caddy. |
| Admin UI/actions | Declarative plugin Admin Surface через generic Management API. |

Каждая replica подключается по заранее зарегистрированному endpoint; trust
identity выдаётся оператором через внешний CA/PEM source. Docker/Compose, Swarm,
Kubernetes как внешнее размещение и саморегистрация replicas относятся к v2;
Core process supervision не входит в целевую модель. Установку и плановые
обновления Core/plugins выполняет оператор выбранными средствами. Core не является CA и не проксирует
plugin-to-plugin payloads.

## Продуктовые плагины общего v2

Domain (Core-configured ER-модель, volatile in-memory данные и аналитика) и Runtime (WASM-команды)
отложены до следующего продуктового среза и не входят в приёмку Liapoldus v2. Начатые прототипы
сохраняются в отдельных репозиториях-владельцах. Их целевое поведение и
реализованное состояние различаются: пока готовы только начальные контрактные
и локальные runtime-срезы. Канонические страницы: [Domain](/plugins/domain) и
[Runtime](/plugins/runtime). Ни один из прототипов пока не считается
production-ready.

## Разработка

Общие REST lifecycle types принадлежат Plugin SDK; generic peer transport,
регистрация пользовательских методов и streams — единственному
[pluginprotocol repository](https://github.com/Liapoldus/pluginprotocol).
Product settings/data и capability-specific schemas принадлежат конкретному
plugin project. Документация ссылается на source contracts, но не копирует их.

Подробная lifecycle/security модель находится в
[Core plugin deployment](../core/architecture/plugin-deployment) и
[целевой архитектуре](../core/architecture/target). Для UI см.
[plugin Admin Pages](admin-pages).
