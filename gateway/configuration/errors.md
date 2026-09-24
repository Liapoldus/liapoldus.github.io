# Каталог ошибок

Нормативные коды ошибок опубликованы в [errors.json](/spec/errors.json);
REST error shape — в [Management OpenAPI](/spec/management.openapi.yaml).

Bootstrap validation errors указывают только безопасный field path и не
возвращают resolved secret values. Caddy adaptation diagnostics redacted и не
содержат filesystem path или private Caddy payload. Ошибки group release
сохраняют active runtime и current/previous pointers. Ошибки Admin mutation
могут иметь неопределённый результат; в таком случае Gateway помечает drift и
блокирует group deployment до reconcile/restore.
