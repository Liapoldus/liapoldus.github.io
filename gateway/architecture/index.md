# Архитектура Gateway

Единственная каноническая модель v1 — [целевая архитектура](target). Она
определяет singleton Core, SQLite source of truth, generic plugin lifecycle,
`ConfigApply`, прямые plugin-to-plugin policies и отдельный Caddy plugin.

| Документ | Назначение |
| --- | --- |
| [Roadmap v1](v1-migration-roadmap) | Этапы миграции и gates. |
| [Целевые решения](target) | Нормативные роли, state, profiles и security. |
| [Control plane](control-plane) | ConfigApply, SQLite generations и plugin interactions. |
| [Runtime components](gateway) | Компактная карта владельцев. |
| [Режимы plugins](plugin-deployment) | Local supervision и внешняя оркестрация. |
| [Protocol](protocol) | Единственный plugin IPC contract — см. также source repository. |
| [Cookies](cookies) | Plugin-owned values и общий typed boundary. |

Страница [статуса реализации](implementation) отделяет подтверждённое текущее
поведение от целевой архитектуры. При расхождении implementation не меняет
нормативный target: сначала зафиксировать gap в соответствующем TODO, затем
закрыть его тестами и реализацией по [roadmap](v1-migration-roadmap).
