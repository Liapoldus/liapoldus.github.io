# Group Releases API снят с v1

`/api/groups` и multipart Caddyfile group releases относятся к прежней модели
Gateway и не входят в целевой v1. Эта страница оставлена как compatibility URL
и не описывает активный endpoint contract.

Traffic configuration теперь является versioned JSON settings документа
Caddy plugin, который Core хранит в SQLite и передаёт через `ConfigApply`.
Опубликованные сайты, immutable releases и `current/previous` принадлежат
Caddy plugin Admin Surface; Core не вводит для них отдельную group API.

Каноническая модель: [целевой архитектурный контракт](../architecture/target),
[plugin configuration API](config) и
[plugin Admin Surface](../../plugins/admin-pages).
