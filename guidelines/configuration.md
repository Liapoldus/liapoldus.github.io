# Конфигурация

Configuration отделяется от кода, описывается versioned schema и валидируется
до применения. Secret хранится как reference, не inline value в Git/fixtures.
Gateway bootstrap содержит только state/artifact paths, Management transport/trust
и Caddy build variant. Traffic settings — native Caddyfile group revisions,
а plugin instances управляются через Gateway API, не через bootstrap YAML.
Полный snapshot активируется атомарно; schema error не меняет обслуживаемый
трафик.

Внешние assets/contracts доступны только разрешённым infrastructure или
presentation adapters, не domain model. Gateway API управляет plugin settings:
неизменяемая версия settings хранится отдельным файлом, а SQLite содержит её
ID, digest и lifecycle metadata. Schema задаёт подключённый plugin.
