# Данные и ERD

PostgreSQL/SQLite содержат только operational metadata. Git хранит source;
asset binary хранится в configured storage; secret value — во внешнем secret
store. Все timestamps UTC, IDs UUIDv7, delete — soft delete except immutable
audit/snapshot/build records.

<img src="/diagrams/constructor-erd.svg" alt="ERD базы данных Constructor" />

## Таблицы

| Таблица | Key columns | Назначение |
| --- | --- | --- |
| `users`, `roles`, `permissions`, `role_permissions`, `user_roles` | UUID, unique name/key | RBAC и immutable system admin |
| `projects`, `git_bindings`, `project_members` | project ID, repository URL, default branch | доступ и Git binding |
| `sites`, `environments`, `gateway_bindings` | project/site/environment IDs | publish topology |
| `snapshots`, `snapshot_entities` | git commit, content digest | deployable consistent state |
| `builds`, `artifacts`, `deployments` | snapshot/build/environment IDs | immutable delivery chain |
| `asset_records`, `asset_variants` | storage ref, checksum | metadata без blob/secrets |
| `operations`, `audit_records` | actor, idempotency, result | recovery and accountability |

## Constraints

- `snapshots.git_commit` immutable; one snapshot can have many entity version
  references, but no secret plaintext.
- `builds.snapshot_id` immutable; artifact checksum must be written before
  build becomes `succeeded`.
- one active deployment per `(site_id, environment_id)`; promotion locks that
  row and records previous deployment for rollback.
- `roles.system = true AND name = admin` cannot be deleted or lose any
  permission; local mode materializes one admin user without roles UI.

Local-first deployment uses the same operational repository contract with SQLite
(`CONSTRUCTOR_DB`); web deployment can replace this adapter with PostgreSQL
without changing domain or application code.
