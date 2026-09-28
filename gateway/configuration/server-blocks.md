# Traffic settings

Это сохранённый URL прежней страницы о нативных Caddyfile group releases.
В целевом v1 пользовательский traffic задаётся через Caddy plugin settings
JSON schema, сохраняемые Core в SQLite и push-имые через `ConfigApply`. Core
не принимает Caddyfile fragments и не имеет самостоятельной route DSL.

Нормативные границы: [конфигурация](index),
[Caddy plugin architecture](../architecture/target) и
[plugin settings API](../api/config).
