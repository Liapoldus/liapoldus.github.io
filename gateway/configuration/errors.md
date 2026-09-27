# Каталог ошибок

Нормативные коды ошибок опубликованы в [errors.json](/spec/errors.json);
REST error shape — в [Management OpenAPI](/spec/management.openapi.yaml).

Bootstrap validation errors указывают только безопасный field path и не
возвращают resolved secret values. Caddy adaptation diagnostics redacted и не
содержат filesystem path или private Caddy payload. Ошибки group release
сохраняют active runtime и current/previous pointers. Целевой контракт для Admin
mutation предусматривает drift detection и блокировку group deployment до
reconcile/restore при неопределённом результате; этот Admin surface пока не
реализован. См. [статус реализации](/gateway/architecture/implementation).
