# Пользователи, роли и режимы аутентификации

Constructor владеет пользовательской аутентификацией и RBAC. Gateway видит
только административную identity соответствующей Constructor binding и не
хранит пользователей или роли Constructor.

## Три режима входа

| Режим | Назначение | Граница доступа |
| --- | --- | --- |
| `oidc` | Web deployment с внешним identity provider | OIDC subject связывается с Constructor user по `iss` + `sub`; неизвестный subject закрыт до provisioning |
| `local-jwt` | Web deployment, где Constructor хранит accounts/password hashes и выпускает короткоживущий JWT | Пароль проверяется backend-ом, затем обязательный WebAuthn/passkey; permissions берутся из Constructor DB |
| `none` | Только single-user desktop/Wails installation | Без пользовательского login/roles; Constructor API ограничен локальным приложением и не открыт сетевым клиентам |

В `oidc`-режиме Constructor выполняет Authorization Code flow через backend,
проверяет issuer, audience, state, nonce и подпись. После успешного внешнего
login пользователь дополнительно проходит Constructor WebAuthn/passkey
challenge. В local web режиме после проверки пароля применяется тот же
обязательный WebAuthn flow. OIDC tokens, пароли, refresh values и Gateway
credentials не передаются React renderer.

Оба web режима выдают Constructor session в `Secure`, `HttpOnly`, `SameSite`
cookie. `local-jwt` использует короткоживущий подписанный JWT; refresh
credential имеет отдельный срок, хранится/проверяется backend-ом и ротируется
при использовании. Утверждённые defaults v1: access JWT действует 5 минут;
rotating refresh credential имеет абсолютный TTL 12 часов без sliding
продления, а повторное использование отозванного refresh token отзывает всё
семейство. Пароли хешируются Argon2id с `m=19456 KiB`, `t=2`, `p=1`. Для
аккаунта действует throttle после 5 неудачных попыток за 15 минут; дополнительно
обязателен отдельный IP/network limiter. Его числовые defaults здесь не
задаются.

Mutating API использует session-bound synchronizer CSRF token, который
ротируется при login, refresh и изменении привилегий, а также строгую
`Origin`/`Host` проверку. Login, MFA, refresh и recovery имеют rate limits и
audit events. Recovery допускается через одноразовые хешированные коды либо
явное admin provisioning; silent MFA bypass запрещён. Audit retention для
Constructor auth events — 365 дней. WebAuthn credential хранится как public
credential metadata, не как private key. Числовые значения и security defaults
зафиксированы в [версионированной Constructor Auth Policy v1](/spec/constructor-auth-policy.v1.json).

Desktop `none` разрешён только для single-user local installation. Это не
означает, что локальный Gateway Management API становится открытым: когда
Constructor управляет Gateway, тот всё ещё требует `platform-admin` Bearer.
Remote Gateway из desktop открывается через Go SSH bridge и внешний OpenSSH /
bastion, см. [интеграцию с Gateway](integrations).

## Роли и permissions

Web roles, permissions и назначения пользователей хранятся в operational DB
Constructor. Immutable системная роль `admin` существует всегда и не может
потерять критические permissions. Каждая изменяющая операция проверяет
permission в backend use case; UI visibility не является security boundary.

Permissions Gateway имеют явную environment scope. Например, роль может иметь
`gateway.view`, `gateway.configure`, `deploy.dev` и `deploy.prod`. Каждая
Gateway binding помечается `dev` или `prod`; backend разрешает операцию только
если permission scope совпадает с environment binding. Одни и те же роли
применяются к нескольким независимым Gateway bindings, поэтому оператор может
иметь deploy на dev и только read на prod.

Constructor DB и audit связывают изменение с конкретным пользователем, ролью,
target Gateway, environment, operation и результатом. Gateway audit видит
Controller binding/service identity, а не подменяемый client-supplied actor
header. Gateway service credential сам по себе не является механизмом
Constructor RBAC.

## Sites и deployments

Installation имеет deployment capability `single` или `multiple`. В `single`
существует ровно один Site: API запрещает второй, UI скрывает selector/Add
Site. Publish разрешается только выбранной environment binding и требует
соответствующего scoped permission. Backend повторно проверяет право перед
каждым deploy/rollback; frontend скрывает недоступное действие только как UX.

## Local и web deployment

Desktop/local использует single-user auth mode `none`, local Git и SQLite.
Web mode поддерживает OIDC или local-JWT auth, multiple users, Constructor DB,
roles, audit, remote Git и несколько remote Gateway bindings. В web режиме
Gateway API credentials находятся только в server-side secret storage и
доступны Gateway adapter; browser не соединяется с Gateway напрямую.
