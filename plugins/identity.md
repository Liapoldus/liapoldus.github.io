# Identity plugin

> **Статус:** runnable skeleton. Все объявленные capability names проходят
> handshake и локальный dispatch; реальный OAuth/OIDC provider, session, cookie
> и token lifecycle ещё не реализованы.

Identity plugin — самостоятельный capability-процесс. Он является единственным
местом, где живут browser identity flows, провайдерские протоколы и lifecycle
токенов. Gateway не реализует их и не хранит identity session.

## Владение

| Владелец | Ответственность |
| --- | --- |
| Identity plugin | login, callback, logout, authorization-server endpoints, state, nonce, PKCE, session, cookies, token/JWKS validation и claims |
| Gateway | listener, TLS/mTLS, route match, limits, process supervision, grants, ограниченный HTTP context и typed response actions |
| Constructor | настраивает instance через plugin Admin UI contract; не читает cookies/secrets и не реализует provider flow |

## Versioned contract

Канонический контракт находится рядом с wire protocol в
[`pluginprotocol/contracts/identity/v1`](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/identity/v1):
`manifest.json`, `settings.schema.json` и `http-actions.schema.json`.

Capabilities v1: `identity.client.authenticate`, `identity.client.callback`,
`identity.client.logout`, `identity.token.validate`,
`identity.server.authorize`, `identity.server.token`, `identity.server.userinfo`,
`identity.server.jwks`, `identity.server.revoke`, `identity.server.introspect`.

## HTTP boundary

Gateway передаёт только allow-listed method/path/query/headers/body и только
явно выданные identity claims. Он не передаёт raw `Authorization`, cookies,
filesystem paths, socket или raw secret. Plugin возвращает schema-validated
actions: status, allow-listed headers, Set-Cookie instructions, body и
identity result. Gateway применяет action и остаётся владельцем соединения.

## Configuration

Identity instance описывается как обычный plugin в `gateway.yaml`; его
`settings` валидируются contract schema. Binding policy с route является
generic `authPolicies.<name>.plugin { instance, capability }`, а не встроенным
`oidc`/`jwt` блоком. mTLS остаётся transport-security возможностью Gateway.

Не создавайте identity-plugin executable в Gateway repository: protocol,
fixtures и реализация принадлежат plugin ecosystem.

## Локальная проверка

```bash
go build ./...
go vet ./...
go test ./...
LIAPOLDUS_CORE_ROOT="../../core" ./tests/gateway_smoke.sh
```

Проверка запускает отдельный identity process через текущий Gateway и использует
deterministic provider без внешнего IdP и секретов.
