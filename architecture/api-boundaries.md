# API-границы

| API | Владелец | Потребитель | Назначение |
| --- | --- | --- | --- |
| Constructor API | Constructor | его web UI и automation | проекты, Git bindings, snapshots, builds, deployments, RBAC |
| Gateway Admin API | Gateway | Constructor, CLI, CI | config, runtime state, sites, publish/rollback, audit, operations |
| Plugin Admin Contract | Plugin через Gateway | Constructor | UI schema, health, status, allowed actions и metadata |

Constructor использует существующие Gateway endpoints: `GET /api/config`,
`POST /api/config/validate`, `PUT /api/config`, `GET /api/sites`, publish,
rollback, runtime lists, audit и operations. Он сохраняет `If-Match` и
idempotency semantics Gateway, не создавая их локальные аналоги.

## Требуемые расширения Gateway API

Следующие возможности пока не описаны существующим Management API и должны
быть добавлены до появления соответствующих экранов Constructor:

| Возможность Constructor | Требуемая Gateway capability |
| --- | --- |
| network canvas с редактированием rules | typed read/write representation routes, upstreams, domains и plugin chain |
| plugin admin pages | namespaced `admin/surface`, query and action dispatch with schema validation, redaction, audit and capability authorization |
| установка/удаление plugin instance | explicit lifecycle operation и audit |
| управление domains/TLS | typed domain inventory и operations, если не выражены config apply |

Пока capability отсутствует, UI показывает read-only gap, а не скрытый
workaround. Точные уже доступные операции — в [Gateway API](/gateway/api/).
