# Схема bootstrap `gateway.yaml`

Нормативная минимальная схема опубликована в
[gateway.schema.json](/spec/gateway.schema.json). Файл содержит только пути
локального состояния и артефактов Core, единственный execution profile,
Management listener/TLS и источник доверенного TUF-каталога.

Настройки plugins, фиксированные endpoints, взаимодействия и Caddy traffic
JSON хранятся Core в SQLite и передаются push-вызовом `ConfigApply`. Они не
задаются в `gateway.yaml`, Caddyfile, `site.yaml` или YAML includes. Подробности
см. в [Bootstrap contract](bootstrap) и [целевой архитектуре](../architecture/target).
