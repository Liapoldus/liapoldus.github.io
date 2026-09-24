# Плагины

Плагин — отдельный process/service с declarative manifest и versioned
capabilities. Он не создаёт public listener и не регистрирует произвольный
route. До подключения plugin instance Gateway не содержит знания о конкретном
плагине, его settings, страницах или provider names.

Единственный источник plugin IPC contract — репозиторий
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol). Он задаёт
gRPC control/health/Call/Stream, manifests, settings schema, HTTP/L4 context,
actions и grants. Constructor не подключается к plugin напрямую.

## Создание instance

Instance создаётся через Gateway Management API. SQLite хранит metadata
instance, активную settings revision и digest; сами versioned settings
сохраняются как неизменяемый файл. Settings валидируются по schema подключённого
plugin. Traffic bindings задаются Caddyfile directive с ID instance и
capability; настройки instance не включаются в group revision.

| Область | Владелец |
| --- | --- |
| Endpoint/mode, limits, process lifecycle, TLS connection | Gateway generic plugin runtime; durable metadata в SQLite |
| Capabilities и settings schema | Подключённый plugin manifest |
| Local launch | Gateway Supervisor; только loopback |
| Remote launch | Operator/Docker/Kubernetes; fixed TLS/mTLS endpoint |
| Traffic rules | Native Caddyfile |
| Plugin Admin UI | Declarative plugin contract, rendered Constructor через Gateway |

Gateway control manager применяет общие process limits, handshake, health,
plugin settings и scoped-grant policy. Settings revision content остаётся в
versioned files, а SQLite фиксирует metadata/digest и active pointer. Caddy handler применяет data-plane
capability/route limits, вызывает plugin напрямую по gRPC, валидирует response
actions и выполняет redaction; Management API не проксирует пользовательский
traffic. Core не интерпретирует plugin settings и не содержит веток для
конкретных plugin names.

## Traffic binding

В обычном Caddyfile matcher используется один из Gateway custom directives:

- liapoldus_plugin &lt;instance-id&gt; &lt;capability&gt; &lt;mode&gt; — direct capability dispatch (`call`, `http-stream`, `websocket`, `sse`);
- liapoldus_frontend &lt;frontend-id&gt; — immutable static root из текущей group
  revision.

Точная grammar и пример — [Control plane Gateway](/gateway/architecture/control-plane).
Плагины не могут менять listener/TLS/policy или обращаться к другим plugins;
dispatch исполняет Caddy Liapoldus handler по заранее подготовленному
Gateway-owned snapshot.

## Plugin-owned Admin UI

Подключённый plugin может объявить schema-validated Admin Surface. Gateway
проверяет и authorization-ит фиксированные namespaced API routes, Constructor
рендерит только разрешённые declarative widgets. См.
[Admin pages](/plugins/admin-pages).

## Security

Local plugin использует назначенный loopback endpoint и Gateway supervision.
Remote plugin работает по явно заданному endpoint, TLS/mTLS и уникальной внешне
выданной identity. Gateway не становится CA, не запускает remote process,
не допускает downgrade и не соединяет plugin instances напрямую.

См. [режимы подключения](/gateway/architecture/plugin-deployment) и
[единый protocol](https://github.com/Liapoldus/pluginprotocol).
