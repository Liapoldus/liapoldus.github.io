# Gateway и plugins

<img src="/diagrams/constructor-integrations.svg" alt="Constructor взаимодействует с Gateway API и Plugin Admin UI contract" />

## Gateway workspace

Constructor — визуальный control plane, но не альтернативный Gateway runtime.
Workspace показывает Overview, Routes, Upstreams, Sites, Domains, TLS,
Networking, Plugins, Configuration, Releases, Logs, Metrics и Health в меру
доступности Management API. Он читает state, валидирует изменения, применяет
через API и отображает typed error, health/audit/operations.

Текущая интеграция и отсутствующие операции приведены в
[матрице API boundaries](/architecture/api-boundaries). Нельзя создавать
локальные сущности Gateway лишь потому, что endpoint ещё не существует.

## Plugins

Constructor умеет перечислять instance, показывать status/health и, после
появления API capability, создавать/изменять/restart их. Его UI не знает plugin
заранее: plugin предоставляет versioned [Admin UI schema](/plugins/admin-ui-contract)
с fields/actions/status/metrics/logs/health. Gateway контролирует доступ,
redaction и lifecycle; Plugin не передаёт UI произвольный executable code.
