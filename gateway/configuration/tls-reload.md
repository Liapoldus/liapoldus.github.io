# Активация Caddy snapshot

Gateway v1 применяет полный snapshot, собранный из всех активных group
revisions. Сначала проверяются native Caddyfile и artifacts, затем готовится
runtime, и только после успеха меняется активный snapshot и current/previous
соответствующей группы.

Целевой контракт требует checkpoint для Caddy Admin mutations и блокирует
publish/rollback, если runtime расходится с group composition, пока оператор не
выполнит явный checkpoint restore или reconcile. Эти Admin/checkpoint/drift
функции пока не реализованы; см. [статус реализации](/gateway/architecture/implementation).
Обратная конвертация произвольного Admin JSON в Caddyfile не поддерживается.

ACME может выдать сертификат после активации. Состояние сертификата
отслеживается отдельно по домену. См. [Control plane](../architecture/control-plane)
и [Group API](/gateway/api/groups).
