# Liapoldus Gateway

Gateway — единичный control-plane процесс. Core хранит desired service
configuration в SQLite и передаёт плагины versioned JSON через `ConfigApply`.
Public traffic обслуживает отдельный Caddy plugin; Management API не
проксирует traffic и не встраивает Caddy.

В v1 Core использует один из глобальных профилей: `supervised` управляет
локальными plugin releases/processes, `external` подключается к workloads,
которыми управляет оператор. Caddy — отдельный singleton plugin в обоих
профилях. Constructor остаётся отдельным продуктом и сейчас заморожен.

| Область | Канон |
| --- | --- |
| Bootstrap | [Минимальный `gateway.yaml`](configuration/yaml-reference) |
| Configurations | [SQLite и ConfigApply](architecture/control-plane) |
| Plugin modes | [Supervised и external](architecture/plugin-deployment) |
| API | [Gateway Management API](api/) |
| Security/deployment | [Security](configuration/security), [Deployment](deploy/) |
| Архитектура и этапы | [Целевой контракт](architecture/target), [Roadmap](architecture/v1-migration-roadmap) |

Корневая source of truth документации не обещает совместимость прежних
Caddy/group endpoints, native Caddyfile management или bootstrap Caddy build
variants.
