# Identity plugin

> **Статус:** local supervised dispatch проверен только для `jwks` с пустым
> набором ключей. Реальные OAuth/OIDC flows, session, identity cookie и token
> lifecycle не реализованы; remote plugin runtime с mTLS также не готов.

Identity plugin — самостоятельный capability process. Только он владеет
browser identity flows, provider protocol и token/session lifecycle. Gateway
не реализует OIDC/JWT feature и не хранит identity session.

## Владение

| Владелец | Ответственность |
| --- | --- |
| Identity plugin | login, callback, logout, authorization-server endpoints, state, nonce, PKCE, session, cookies, token/JWKS validation и claims |
| Caddy data plane | listener, TLS/mTLS, Caddyfile route, direct plugin dispatch, stream/call limits, HTTP response actions |
| Gateway control plane | plugin lifecycle, trusted endpoint/identity, dispatch snapshot, scoped grants, Management API и audit |
| Constructor | создаёт instance/settings через Gateway API и plugin Admin Surface; не читает cookies/secrets и не реализует provider flow |

## Versioned contract

Канонический contract хранится рядом с wire protocol в
[pluginprotocol/contracts/identity/v1](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/identity/v1):
manifest, settings schema и HTTP actions.

Capabilities v1: identity.client.authenticate, identity.client.callback,
identity.client.logout, identity.token.validate, identity.server.authorize,
identity.server.token, identity.server.userinfo, identity.server.jwks,
identity.server.revoke, identity.server.introspect.

Все эти capabilities объявлены в Manifest, но наличие capability не означает
наличия соответствующего production flow. Текущий provider детерминированный:
Gateway E2E `core/tests/integration/serve-local-plugin-products.test.ts`
запускает настоящий identity binary как local child process и вызывает
`identity.server.jwks` через embedded Caddy; ожидаемый ответ содержит пустой
`keys`. Это подтверждает только локальный process/dispatch smoke, а не OIDC,
OAuth authorization server, реальную токенную валидацию или полноценную выдачу
JWKS.

## Configuration и route binding

Identity instance и schema-validated settings создаются через Gateway
Management API. SQLite хранит instance metadata, settings revision ID и digest;
содержимое settings хранится в immutable versioned file. Public request routing
задаётся native Caddyfile с generic
`liapoldus_plugin <instance> <capability> <mode>` directive.
Manifest modes проверяются до activation; Management API не проксирует identity
request.
Binding policy не возвращается в собственную Gateway YAML-модель, а конкретный
plugin name не зашивается в core.

Handler передаёт ограниченный request context и явно выданные grants. Он не
передаёт raw Authorization, filesystem paths, socket или raw secret. Gateway
реализует общий [cookie boundary](/gateway/architecture/cookies): allow-list
входных cookies на пару instance/capability и типизированные обычные/`HttpOnly`
response actions. Тест `core/tests/integration/serve-cookie-policy.test.ts`
подтверждает эту границу на fixture plugin, но не на identity flows. Identity
plugin пока не реализует session и
cookie lifecycle, поэтому полноценный вход/выход через browser cookies не
поддерживается. Остальные response semantics принадлежат versioned
`pluginprotocol` contracts. Caddy handler остаётся владельцем публичного
соединения.

Локальное child-process тестирование не подтверждает удалённое подключение:
identity plugin пока не имеет runtime wiring для remote endpoint и workload
mTLS. Для такого deployment нужны отдельные plugin и Gateway conformance tests.

Реализацию plugin не размещать в Gateway repository: protocol fixtures и
plugin executable принадлежат plugin ecosystem.
