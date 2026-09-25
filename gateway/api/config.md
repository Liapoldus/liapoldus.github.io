# Старый адрес конфигурационного API

Этот адрес сохранён для ссылок на прежнюю конфигурационную модель. В v1 нет
отдельной Gateway DSL маршрутов и старых `/api/config` endpoints. Канонические
интерфейсы:

- [Bootstrap `gateway.yaml`](/gateway/configuration/bootstrap) задаёт только
  параметры запуска control plane.
- [Group Releases API](/gateway/api/groups) управляет native Caddyfile и
  frontend revisions.
- [Management API](/gateway/api/) описывает доступ к control plane и закрытый
  Caddy Admin pass-through.
