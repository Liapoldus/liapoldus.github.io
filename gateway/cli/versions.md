# Group revisions и rollback

> **План:** команды CLI из этой страницы ещё не реализованы. Group revisions и
> rollback доступны через Management API; см. [Group Releases API](/gateway/api/groups).

CLI просматривает current/previous revisions и запускает group rollback через
Gateway Management API. Это не отдельная публикация Site resource.

Group publication принимает Caddyfile и необязательный frontend tar.gz через
[Group Releases API](/gateway/api/groups). SQLite хранит revision IDs и
current/previous pointers; files immutable. Rollback активирует полный Caddy
snapshot и связанный frontend root group, не меняя plugin settings.

Любая операция требует CAS/idempotency и оставляет active pointers без
изменений при validation, conflict или activation error. Поля и exit/error
mapping задаются CLI/API contract до implementation.
