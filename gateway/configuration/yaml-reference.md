# Bootstrap `gateway.yaml`

`gateway.yaml` содержит только параметры запуска самого Core: глобальный
execution profile, путь к SQLite и локальному package/artifact directory,
Management listener/TLS, лимиты Management API и параметры trusted plugin
catalog. Он не задаёт plugin-specific settings, capabilities, Caddy routes,
site manifests, listeners или `includes`.

Все settings конкретного plugin создаются и изменяются через Management API,
проверяются по его Manifest/ConfigSchema и сохраняются Core в SQLite. Core
передаёт их push-вызовом `ConfigApply` как versioned JSON. Внешняя форма
bootstrap и допустимые поля нормативно заданы в
[Gateway JSON Schema](/spec/gateway.schema.json); эта страница её не
дублирует.

Пример намеренно показывает только структуру bootstrap, без реальных ключей,
сертификатов или каталогных credentials:

```yaml
state:
  path: ./state/gateway.sqlite
artifacts:
  path: ./state/artifacts
execution:
  profile: supervised
management:
  listen: 127.0.0.1:9443
  tls:
    certificate: file:./secrets/management.crt
    key: file:./secrets/management.key
pluginCatalog:
  url: https://plugins.example.invalid/tuf
```

Внешний режим выбирается значением `external`; тогда Core не устанавливает и
не запускает процессы. Caddy runtime настраивается как JSON settings Caddy
plugin, не Caddyfile и не отдельным YAML DSL. Схемы и API управляются из
[Management API](../api/) и [целевой архитектуры](../architecture/target).
