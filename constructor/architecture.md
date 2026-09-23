# Архитектура Constructor

<img src="/diagrams/constructor-architecture.svg" alt="Слои Constructor и его внешние границы" />

| Область | Ответственность |
| --- | --- |
| Web application | Development/Site Management UI, inspector, canvas, preview, command palette |
| Constructor API | projects, bindings, RBAC, snapshots, builds, deployments, audit metadata |
| Git adapter | local repository, generic SSH/HTTPS clone, branches, diff, conflicts |
| Build worker | validation, generation, Vite/React build, artifact metadata |
| Gateway adapter | только Gateway Admin API, expected digest/idempotency semantics |
| Plugin adapter | versioned Admin UI schema через Gateway-authorized contract |

UI обращается к API только через typed `ConstructorBridge.request` boundary.
Web runtime использует browser `fetch`; будущий Wails host устанавливает bridge
и направляет тот же API-контракт в Go core. React UI не получает прямой доступ к
filesystem или Git, а desktop lifecycle и native capabilities не меняют
domain/API semantics.

## Production boundary

Build worker генерирует React Router config, content, i18n JSON, theme,
responsive asset references и configuration artifacts. Результат — static
frontend, который не требует Constructor API для исполнения.

## Secrets

Модели используют reference вида `secret://production/api-token`. Значение не
коммитится, не входит в Snapshot и не посылается в browser. Secret storage
расширяем, а read/write требуют отдельной permission.
