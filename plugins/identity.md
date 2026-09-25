# Identity plugin

> **Статус:** runnable skeleton. Реальный OAuth/OIDC provider, session, cookie
> и token lifecycle ещё не реализованы.

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
передаёт raw Authorization, filesystem paths, socket или raw secret. Целевой
cookie allow-list и typed cookie actions описаны в [cookie boundary](/gateway/architecture/cookies);
текущий Gateway handler пока исключает входящие cookies и отклоняет cookie
response actions. Остальные response semantics принадлежат versioned
`pluginprotocol` contracts. Caddy handler остаётся владельцем публичного
соединения.

Реализацию plugin не размещать в Gateway repository: protocol fixtures и
plugin executable принадлежат plugin ecosystem.
