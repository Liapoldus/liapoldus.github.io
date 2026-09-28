# Identity plugin

Identity plugin владеет browser identity flows, OAuth/OIDC providers,
authorization server, state, nonce, PKCE, session, cookies, token/JWKS
validation и claims. Gateway/Core не реализует OIDC/JWT feature и не хранит
identity session.

| Владелец | Ответственность |
| --- | --- |
| Identity plugin | Product settings, provider integrations, identity HTTP actions, sessions/tokens и cookies. |
| Core | Generic instance/config revisions в SQLite, `ConfigApply`, grants, explicit interaction policy, health, audit и выбранный lifecycle profile. |
| Caddy plugin | Public HTTP/TLS handling, routing/config apply и direct capability dispatch; отдельный process. |
| Constructor | Сейчас заморожен; остаётся клиентом общего Management API и declarative Admin Surface. |

## Protocol contracts и статус

Manifest, settings schema и HTTP action schemas принадлежат Identity plugin и
находятся в его `contracts/v1/`. Общий протокол не хранит identity-specific
capability contracts.
Capabilities объявлены независимо от runtime readiness. Текущие
deterministic responses — skeleton и не означают готовую production реализацию
OIDC/OAuth; предыдущие E2E с embedded Caddy относятся к legacy Core и будут
заменены Caddy plugin child-process conformance.

Identity settings создаются через generic API, сохраняются Core в SQLite и
push-ятся через `ConfigApply`; plugin не читает app env/config files. Secret
references разрешаются только scoped grants. Identity plugin применяет общий
cookie boundary: входящие cookies allow-listed per instance/capability,
исходящие typed actions атомарно проверяются до headers/upgrade, чувствительные
значения редактируются.

Плагин сам владеет token/session/cookie lifecycle; Core остаётся
plugin-agnostic. См. [plugin deployment](/gateway/architecture/plugin-deployment)
и [целевую архитектуру](/gateway/architecture/target).
