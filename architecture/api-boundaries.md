# API-границы

| API | Владелец | Потребитель | Назначение |
| --- | --- | --- | --- |
| Constructor API | Constructor | desktop UI и automation | Проекты, Git bindings, snapshots, builds и deployment workflow Constructor. |
| Gateway Management API | Gateway | Constructor, CLI, CI | Caddy groups/revisions, plugin instances, access, checkpoints, TLS operations, audit и operations. |
| Native Caddy Admin API | Embedded Caddy или supervised external Caddy | Только Gateway Admin adapter | Private local configuration/control; публичный доступ запрещён. |
| Plugin Admin contract | Plugin через Gateway | Constructor | Declarative UI, health, status, actions и schema-bound metadata. |
| Plugin IPC | pluginprotocol | Gateway control manager ↔ plugin и Caddy data-plane handler ↔ plugin | gRPC lifecycle, Call, Stream и grants; Constructor не использует этот API. |

Constructor работает с Gateway через Management REST API. Traffic изменяется
нативным Caddyfile в group release, а не через старый config API или local
route model. Liapoldus Caddy handler вызывает plugin напрямую; Gateway
Management API не является traffic proxy. Frontend archives включаются в тот
же multipart group release.
Group rollback не меняет plugin settings.

## Контракты экранов Constructor

| Возможность | Gateway contract |
| --- | --- |
| Workspace и состояние runtime | status, Caddy build identity, group current/previous, drift и durable operations. |
| Редактор traffic | native Caddyfile fragments, validation/adaptation и full-composition preview. |
| Publish/rollback | multipart release, expected revision, idempotency, operation polling и immutable frontend roots. |
| Advanced Caddy control | authenticated pass-through, checkpoint-before-mutation, audit, explicit reconcile/restore. |
| Plugin settings | generic plugin instance API и plugin-owned settings schema; не часть group revision. |
| Plugin Admin pages | fixed namespaced Gateway API, authorization, schema validation, redaction и audit. |
| TLS | per-domain readiness и Caddy-managed renew/revoke operations. |
| Credentials | OS credential store через Go desktop backend; renderer не сохраняет raw service key. |

UI не создаёт workaround, если endpoint отсутствует; он показывает явно
read-only status/gap. Единственные endpoint schemas — опубликованный
[Gateway OpenAPI](/gateway/api/openapi).
