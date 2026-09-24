# Конфигурация Gateway

Gateway использует два раздельных интерфейса настройки:

- минимальный [`gateway.yaml`](bootstrap) загружается при старте и содержит
  только пути состояния/artifacts, Management API bind/trust и Caddy build
  variant;
- нативный Caddyfile задаёт весь traffic runtime и управляется через
  [group releases API](/gateway/api/groups) либо полный защищённый Caddy Admin
  API pass-through.

Собственной Liapoldus DSL маршрутов, `site.yaml` и YAML includes нет.
Constructor остаётся UI-клиентом Gateway; детали владения и transaction
boundaries собраны в [Control plane](/gateway/architecture/control-plane), а
порядок перепроектирования — в [roadmap](/gateway/architecture/v1-migration-roadmap).

## Справочник

| Документ | Назначение |
| --- | --- |
| [Bootstrap schema](bootstrap) | Разрешённые поля и пример минимального `gateway.yaml`. |
| [Публичная JSON Schema](/spec/gateway.schema.json) | Нормативная machine-readable bootstrap contract. |
| [Caddyfile и группы](/gateway/architecture/control-plane) | Состав snapshot, revisions, current/previous и Admin API drift. |
| [Безопасность](security) | Management listener, Constructor auth boundary, desktop SSH bridge, web mTLS, plugin trust и secret references. |
| [Транспорты](transports) | Caddy HTTP/TLS и обязательный Caddy-L4. |
| [Management API](/gateway/api/) | OpenAPI, group API, operations, plugin instances и access. |

Ранее опубликованные страницы старой YAML route DSL не являются v1-контрактом;
теперь их заменяет native Caddyfile и строгая bootstrap schema.
