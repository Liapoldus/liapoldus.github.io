# Bootstrap contract

Подробная reference-страница переехала в
[справочник `gateway.yaml`](yaml-reference). Bootstrap задаёт только то, что
нужно самому единственному Core для старта: SQLite path, локальный package
store, глобальный plugin execution profile, Management TLS и параметры
trusted catalog.

Plugin settings, endpoints, interaction policies и Caddy traffic JSON
редактируются через Management API и сохраняются в SQLite. Они не находятся в
`gateway.yaml`, `site.yaml`, Caddyfile или YAML includes. Machine-readable
схема — [gateway.schema.json](/spec/gateway.schema.json).

Изменение bootstrap применяется контролируемым restart Core; изменения plugin
config проходят durable `ConfigApply` operation без ручного редактирования
файлов. См. [ConfigApply lifecycle](../architecture/control-plane) и
[Security](security).
