# Данные и ER-модель Constructor

Operational data хранится в SQLite для desktop/local и PostgreSQL для web;
репозитории Git остаются источником исходного проекта, бинарные artifacts
хранятся в настроенном artifact storage, а secret values — во внешнем secret
store. В таблицах находятся только credential references/verifiers и
нечувствительные metadata. Все timestamps UTC; immutable audit/snapshot/build
records не удаляются обычным CRUD.

<img src="/diagrams/constructor-erd.svg" alt="ER-модель Constructor" />

## Области данных

| Область | Таблицы | Назначение |
| --- | --- | --- |
| Пользователи и доступ | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | Web RBAC; `permissions.environment_scope` ограничивает действия по среде |
| Web authentication | `oidc_identities`, `web_authenticators`, `auth_sessions` | Связь OIDC по `(issuer, subject)`, WebAuthn public credentials, refresh verifier/revocation metadata |
| Gateway bindings | `gateway_bindings` | Независимые удалённые Gateways, environment, endpoint и refs в server-side secret store для Bearer/mTLS credentials |
| Операторский след | `operations`, `audit_records` | Оператор, роль, Gateway/environment target, idempotency, outcome и recovery |
| Проекты и Git | `projects`, `git_bindings`, `project_members` | Source repositories и доступ к ним; исходный код не копируется в DB |
| Delivery | `sites`, `environments`, `snapshots`, `snapshot_entities`, `builds`, `artifacts`, `deployments` | Immutable delivery chain и active deployment per target |
| Assets | `asset_records`, `asset_variants` | Metadata, checksum и внешние storage references, не binary blobs |

JWT access values не хранятся в БД: короткоживущий токен подписывается
Constructor backend и передаётся только в `HttpOnly` cookie. Refresh credential
сохраняется только как verifier/hash в `auth_sessions`, ротируется при
использовании и может быть отозван. OIDC subject уникален в пределах issuer;
неизвестный subject требует явного provisioning. WebAuthn таблица содержит
public key и counter, но не private key. Password column хранит только
медленный password hash.

`gateway_bindings.admin_credential_ref` и
`gateway_bindings.client_identity_ref` указывают на server-side secret storage;
ни Bearer token, ни client private key не помещаются в SQLite, browser storage,
project repository или audit. Desktop credentials находятся в OS credential
store / SSH agent и в Constructor DB не сохраняются.

## Ограничения целостности

- В web mode у каждого user role assignment проверяется backend-ом; системная
  роль `admin` не может быть удалена или лишена обязательных permissions.
- Effective Gateway action требует совпадения роли, permission, target
  environment и `gateway_binding.environment_id`; несовпадение всегда deny.
- OIDC identity уникальна по `(issuer, subject)` и связана только с одной
  Constructor user. Account linking требует подтверждённой операции и audit.
- Refresh verifier уникален, одноразовая ротация отзывает predecessor; logout,
  account disable и security recovery инвалидируют активные sessions согласно
  session policy.
- `snapshots.git_commit` неизменяем; artifact checksum фиксируется прежде,
  чем build становится `succeeded`.
- На `(site_id, environment_id)` существует одна active deployment; rollback
  создаёт новую запись и сохраняет предыдущее состояние.
- Gateway operation хранит только ID/digest/outcome; содержание Gateway config
  и secret values не копируется в Constructor DB.

Local-first mode использует ту же operational repository model на SQLite
(`CONSTRUCTOR_DB`); web deployment использует PostgreSQL без изменения
application contract. Версии schema migrations, backup и session expiry
задаются Constructor storage/auth contracts.
