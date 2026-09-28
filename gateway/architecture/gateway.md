# Компоненты Gateway

Gateway состоит из одного Core control-plane процесса и подключённых plugin
processes. Core сохраняет desired-конфигурацию каждого plugin в SQLite,
восстанавливает её в immutable in-memory snapshot и передаёт конкретному
instance версионированный JSON через `ConfigApply`. Core не обслуживает
пользовательский traffic и не интерпретирует product-specific поля.

| Компонент | Владелец | Состояние |
| --- | --- | --- |
| Management API и CLI | Core | Settings, endpoint, install policy, interaction rules, operations и audit в SQLite. |
| Plugin runtime | Core + `pluginprotocol` | Supervised profile запускает процессы; external profile подключается к процессам, которыми управляет оператор. |
| Caddy data plane | Отдельный `plugins/caddy` process | В v1 одна replica; Caddy и Caddy-L4 входят в plugin binary, а не в Core. |
| Другие data-plane capabilities | Соответствующие plugins | Core видит только Manifest, schema, generic endpoint и protocol lifecycle. |
| Config/dispatch generations | Core + `pluginprotocol` | Полные revision/digest с per-replica ACK; request path не читает SQLite. |

Профили запуска взаимоисключающие для одного Core. Подробные lifecycle,
восстановление и отказовые сценарии нормативно описаны в
[целевой архитектуре](target), [plugin deployment](plugin-deployment) и
[плане v1](v1-migration-roadmap).
