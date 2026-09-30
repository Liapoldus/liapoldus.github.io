# Identity plugin

> **Статус: полностью заморожен и исключён из Core v1.** Репозиторий не
> входит в активный workspace; код, tests и product contracts не изменяются.
> Содержимое ниже сохранено как справочная спецификация и не является v1 gate.
> Authentication/authorization самого Core Management API остаются обязательны.

Identity plugin владеет browser identity flows, OAuth/OIDC providers,
authorization server, state, nonce, PKCE, session, cookies, token/JWKS
validation и claims. Core/Core не реализует OIDC/JWT feature и не хранит
identity session.

| Владелец | Ответственность |
| --- | --- |
| Identity plugin | Product settings, provider integrations, identity HTTP actions, sessions/tokens и cookies. |
| Core | Generic instance/config generations в SQLite, Plugin SDK REST, grants, explicit interaction policy, health/audit и выбранный per-instance deployment mode. |
| Server plugin | Public HTTP/TLS handling, routing/settings activation и direct capability dispatch; отдельный process. |
| Constructor | Сейчас заморожен; остаётся клиентом общего Management API и declarative Admin Surface. |

## Контракты plugin

Manifest, settings schema и HTTP action schemas принадлежат Identity plugin и
находятся в его `contracts/v1/`. Общий протокол не хранит identity-specific
capability contracts.
Capabilities объявляются независимо от runtime readiness.

Manifest объявляет capabilities для OIDC client, token validation и OAuth
authorization server; полный список и versioned product contracts принадлежат
Identity plugin и остаются вне scope v1 до отдельного решения о разморозке.

Владелец OIDC Provider surface — Identity plugin. Он публикует
`GET /.well-known/openid-configuration` через отдельную capability
`identity.server.discovery`; Caddy задаёт явный route к ней. Metadata отражает
настроенный issuer и адреса `authorize`, `token`, `userinfo` и JWKS, а не
дублируется в Core или `pluginprotocol`. Authorization Code — единственный
response type; PKCE S256 обязателен. Discovery объявляет только фактически
настроенные алгоритмы подписи и поддерживаемые методы аутентификации клиентов.

`identity.server.userinfo` принимает `GET` и `POST` с Bearer access token.
Точные metadata, response schemas и vectors принадлежат Identity plugin в
`plugins/identity/contracts/v1/oidc-provider.*`; эта страница не копирует
машинный контракт.

Для OAuth Authorization Server принято v1 policy: вход пользователя — только
через настроенный Identity plugin OIDC upstream allow-list; неизвестный issuer
из запроса не выбирается. Входная identity — пара `(upstream iss, upstream
sub)`, email не является ключом. Выпускаемый token `iss` всегда принадлежит
самому Authorization Server; его `sub` — unpadded base64url от SHA-256 по
UTF-8-строке `upstream issuer + NUL + upstream subject`. User claims проходят
только через per-client allow-list, неперечисленные claims отбрасываются.
Authorization требует заранее provisioned client/user grant; неизвестный
grant отклоняется, интерактивного consent UI в v1 нет. Разрешены Authorization
Code с обязательным PKCE S256 и `client_credentials`; refresh tokens вращаются
и разрешены только для authorization-code family. Implicit/hybrid response
types, password и device grant исключены. Детальные vectors принадлежат
owner contract.

Клиенты регистрируются только статически в plugin settings, Dynamic Client
Registration отключён. Public clients используют `none` и только Authorization
Code с PKCE S256; confidential clients используют `client_secret_basic` для
Authorization Code и `client_credentials`, секрет выдаётся по scoped grant.
Redirect URI сравнивается exact-string, без prefix/wildcard matching.

Identity settings создаются через generic API как raw JSON document,
сохраняются Core в SQLite без декодирования/пересериализации и валидируются по
plugin-owned schema. Core вызывает Plugin SDK REST `Reload(generation)`, после
чего plugin сам pull-ит exact immutable generation; plugin не читает app
env/config files. Secret references разрешаются только scoped grants через
Plugin SDK REST. Identity plugin применяет общий
cookie boundary: входящие cookies allow-listed per instance/capability,
исходящие typed actions атомарно проверяются до headers/upgrade, чувствительные
значения редактируются.

Плагин сам владеет token/session/cookie lifecycle; Core остаётся
plugin-agnostic. См. [plugin deployment](/core/architecture/plugin-deployment)
и [целевую архитектуру](/core/architecture/target).
