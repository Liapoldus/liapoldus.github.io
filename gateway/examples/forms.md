# Plugin dispatch в Caddy data plane

Plugin instance и settings создаются через Gateway Management API, не через
`gateway.yaml`. Plugin instance/capability/mode привязываются к native
Caddyfile handler directive; дополнительной Gateway route DSL нет. Пример
синтаксиса описан в [Control plane](/gateway/architecture/control-plane).

Caddy matcher определяет внешний route, а Liapoldus handler вызывает выбранный
plugin напрямую по gRPC. Для конечного request/response используется `Call`; для
HTTP streaming, WebSocket и SSE — соответствующий режим `Stream`. Gateway
Management API не проксирует body и не находится на пути пользовательского
запроса. Handler передаёт только ограниченный context, валидирует response
actions/cookies до commit и применяет redaction.

Plugin не владеет public listener или socket и не открывает клиенту собственный
HTTP endpoint. В external Caddy-варианте Gateway заранее синхронизирует
dispatch metadata по закрытому Admin API/IPC; handler всё равно вызывает
plugin напрямую. Plugin Admin surface остаётся доступной Constructor только
через фиксированный Gateway Management API. См. [plugin contract](/plugins/index),
[Plugin Admin Pages](/plugins/admin-pages) и [Group Releases API](/gateway/api/groups).
