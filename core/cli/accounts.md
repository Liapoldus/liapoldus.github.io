# Service keys

> **План:** команды CLI для управления service keys ещё не реализованы. Сейчас
> единственная команда управления доступом — `core access bootstrap`.

Целевая CLI-поверхность должна создавать, rotate и revoke Management API
service key. В v1 все ключи имеют роль platform-admin. Команды и API
responses согласуются с [OpenAPI](../api/openapi) и общим [CLI contract](index).

Raw token выводится ровно один раз при create/rotate. В SQLite хранится только
verifier/hash, идентификатор, имя, роль, статус и lifecycle metadata.
Rotation атомарно заменяет credential; revoke блокирует дальнейшую
аутентификацию. CLI должен скрывать значение от shell history и не записывать
его в core.yaml.

Desktop Constructor сохраняет свой Core token в OS credential store через
Go backend. Web Constructor backend хранит отдельный token для каждой Core
binding только в server-side secret storage; browser его не получает.
Изменение key не требует редактировать plugin settings: security credentials
управляются отдельными Management API/CLI операциями и не включаются в
Plugin SDK REST config generation.
