# Site configuration

Core не хранит `site.yaml`, native Caddyfile groups или route includes. Caddy
traffic configuration — plugin-specific JSON settings в Core SQLite; Caddy
plugin преобразует их во внутренний runtime config. Опубликованные site
artifacts и `current`/`previous` остаются отдельными plugin-owned runtime data.

Этот путь сохранён для старых ссылок. Нормативная модель находится в
[целевой архитектуре](../architecture/target), а settings apply — в
[Management API](../api/config).
