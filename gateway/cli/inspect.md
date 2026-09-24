# Проверка и диагностика

CLI — локальный операторский интерфейс для bootstrap/runtime status и доступа.
Он не разбирает route DSL и не формирует собственную traffic config.

| Команда | Назначение |
| --- | --- |
| gateway status | Gateway process, Caddy variant/build identity, SQLite migration, drift и readiness |
| gateway health | Проверка готовности без раскрытия конфигурации/секретов |
| gateway config path | Путь к bootstrap gateway.yaml |
| gateway config validate | Проверка минимальной bootstrap schema |
| gateway group list | Группы, current/previous IDs, drift-block state |
| gateway group inspect ID | Revision metadata и digest без секретных payload |
| gateway caddy checkpoint list | Список безопасной checkpoint metadata |
| gateway caddy drift | Runtime/composition digest и требуемое действие |

Полный Caddy Admin JSON доступен только через аутентифицированный Gateway
Management API; CLI не соединяется с Caddy Admin listener напрямую. Diagnostics
не показывают resolved secrets, Caddy Admin bodies или plugin payload.
