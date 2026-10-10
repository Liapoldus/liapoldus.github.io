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

## Замороженные продукты

`captcha` и `identity` (OIDC/OAuth) заморожены целиком и исключены из Core
v2: их репозитории не входят в активный Go workspace, их исходники и тесты не
меняются, а их product capabilities не являются v2 acceptance gates. Возврат
требует отдельного решения о разморозке. Это не замораживает security самого
Core: Management API по-прежнему требует authentication/authorization, mTLS,
audit и redaction.

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
