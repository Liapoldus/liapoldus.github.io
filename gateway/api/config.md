# Plugin configuration API

Core хранит desired settings каждого instance в SQLite как immutable JSON
revision. Management API валидирует JSON по schema из `pluginprotocol`, но не
знает и не интерпретирует product-specific fields. После успешной записи Core
push-ит всю revision в plugin через `ConfigApply`; plugin не запрашивает
конфигурацию сам и не загружает её из env/application config files.

Изменение выполняется с revision/CAS (`If-Match`). Повтор idempotency key
возвращает существующую operation; конфликт версии не меняет active revision.
Пока plugin/все обязательные replicas не подтвердили revision, operation
остаётся pending. При ошибке старая active revision и runtime generation
сохраняются; candidate остаётся отдельно для диагностики.

Caddy использует тот же generic plugin-settings flow. Его schema описывает
traffic configuration в JSON; Caddy plugin компилирует её во внутреннюю
Caddy runtime-конфигурацию. Core не принимает Caddyfile/group release и не
публикует native Admin API.

Точный route, CAS header, request/response shapes и ошибки задаёт
[Management OpenAPI](../../spec/management.openapi.yaml). Plugin-side settings
schemas принадлежат соответствующим plugin contract; wire/JSON IPC —
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol).
