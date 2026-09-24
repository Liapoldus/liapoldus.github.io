# Manifest и capabilities

Manifest объявляет identity/version, capability names и поддерживаемые modes,
settings schema,
protocol requirements и optional declarative Admin Surface. Capability —
минимальная операция, которую Gateway разрешает подключённому instance;
manifest не является произвольной RPC над public request.

Instance создаётся через Gateway Management API. Gateway сохраняет generic
instance metadata, endpoint, grants, settings revision ID и digest в SQLite;
неизменяемое содержимое settings revision хранится в versioned file. До
применения Gateway проверяет settings по manifest schema. Продуктовые plugin
schemas остаются в pluginprotocol или владеющем plugin contract; core не
содержит дубликатов.

Traffic binding указывается в native Caddyfile handler directive с instance ID,
capability и mode. Gateway сопоставляет объявленные Manifest modes с group
revision до activation. Для syntax и atomic group release см.
[Control plane](/gateway/architecture/control-plane) и
[Group Releases API](/gateway/api/groups).

Полные protobuf и JSON contract sources принадлежат
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol); эта документация
не копирует их тела.
