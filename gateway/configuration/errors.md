# Каталог ошибок

Публичные error codes и `application/problem+json` shape заданы в
[errors.json](/spec/errors.json) и
[Management OpenAPI](/spec/management.openapi.yaml). Внутренние Go errors не
являются публичным contract и не должны раскрывать implementation details.

Config apply, plugin install и generation activation при отказе сохраняют
предыдущую active revision. Безопасная диагностика не содержит секретных
значений, plugin payload, private key, raw endpoint credential или локальных
secret paths. Caddy-specific Admin/checkpoint/drift errors удалены вместе со
старой Core API поверхностью.
