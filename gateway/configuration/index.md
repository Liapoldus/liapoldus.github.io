# Конфигурация Gateway

У Core один источник desired-конфигурации подключённых сервисов — SQLite.
Plugin-specific JSON settings и Caddy traffic configuration изменяются через
Management API, валидируются schema подключённого plugin и применяются
push-вызовом `ConfigApply`. `gateway.yaml` содержит только bootstrap самого
Core; маршруты и сервисные настройки в YAML/Caddyfile не задаются.

| Документ | Назначение |
| --- | --- |
| [Bootstrap schema](bootstrap) | Минимальный `gateway.yaml` и startup граница. |
| [Публичная JSON Schema](/spec/gateway.schema.json) | Machine-readable bootstrap contract. |
| [Plugin configuration API](/gateway/api/config) | CAS, versioned JSON, ConfigApply и operation lifecycle. |
| [Безопасность](security) | Management API, workload mTLS, grants и redaction. |
| [Транспорты](transports) | Трафик, который обслуживает отдельный Caddy plugin. |
| [Каталог ошибок](errors) | Публичные safe errors и problem response. |
| [Архитектура](../architecture/target) | Единственная каноническая модель состояния и владения. |
