# Плагины Liapoldus

Plugin — отдельный process/service, который подключается к generic Core по
единому `pluginprotocol`. До регистрации instance Core не знает конкретные
capabilities, settings, provider names или product admin routes.

Core — единственный durable source of desired configuration: settings каждой
instance сохраняются в SQLite и push-ятся plugin-у версионированным JSON через
`ConfigApply`. Application settings не передаются через environment, argv или
app config file. Core проверяет manifest/schema и хранит plugin-neutral
metadata; бизнес-семантика остаётся в plugin.

## Runtime ownership

| Область | Владелец |
| --- | --- |
| Profile и instance metadata | Core; один глобальный `supervised` либо `external` profile. |
| Install/process lifecycle | Core только в `supervised`; external operator в `external`. |
| Settings/schema/capabilities | Plugin Manifest и его versioned JSON contracts. |
| Config transport | `pluginprotocol.ConfigApply`; plugin сам не запрашивает config. |
| Calls/streams и workload mTLS | `pluginprotocol` Go SDK и Core-issued explicit interaction policies. |
| Caddy data plane | [Отдельный Caddy plugin singleton](/plugins/caddy); Core не встраивает Caddy. |
| Admin UI/actions | Declarative plugin Admin Surface через generic Management API. |

Local packages устанавливаются только из TUF-trusted catalog. Remote workload
identity использует внешний CA/SPIFFE или read-only PEM source. Core не является
CA и не проксирует plugin-to-plugin payloads.

## Разработка

Manifest, gRPC/wire messages, call/stream JSON and shared response actions
принадлежат единственному
[pluginprotocol repository](https://github.com/Liapoldus/pluginprotocol).
Product settings/data и capability-specific schemas принадлежат конкретному
plugin project. Документация ссылки на source contract, но не копирует `.proto`
или JSON schema bodies.

Подробная lifecycle/security модель находится в
[Gateway plugin deployment](../gateway/architecture/plugin-deployment) и
[целевой архитектуре](../gateway/architecture/target). Для UI см.
[plugin Admin Pages](admin-pages).
