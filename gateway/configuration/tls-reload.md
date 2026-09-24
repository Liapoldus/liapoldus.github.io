# Активация Caddy snapshot

Gateway v1 применяет полный snapshot, собранный из всех активных group
revisions. Сначала проверяются native Caddyfile и artifacts, затем готовится
runtime, и только после успеха меняется активный snapshot и current/previous
соответствующей группы.

Caddy Admin mutations создают checkpoint. Если runtime перестал соответствовать
group composition, publish/rollback блокируется до явного checkpoint restore
или reconcile. Необратимая конвертация произвольного Admin JSON в Caddyfile не
поддерживается.

ACME может выдать сертификат после активации. Состояние сертификата
отслеживается отдельно по домену. См. [Control plane](../architecture/control-plane)
и [Group API](/gateway/api/groups).
