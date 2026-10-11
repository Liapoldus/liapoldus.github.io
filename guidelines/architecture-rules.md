# Архитектурные правила

Domain не зависит от infrastructure, presentation или assets. Application
зависит только от typed domain models/interfaces. Infrastructure реализует
ports и изолирует filesystem, сеть, storage, plugins и validators.

Core владеет только защищённым Management API, SQLite с точными JSON-поколениями
конфигурации и общим lifecycle через Plugin SDK REST. Публичный HTTP/HTTPS
socket, TLS, маршруты и лимиты трафика принадлежат Server plugin. Каждый
product plugin владеет своей схемой настроек, данными и capability-контрактами;
`pluginprotocol` переносит только generic plugin↔plugin вызовы. В v2 Core не
управляет workload process lifecycle; standalone CLI и operator adapters
запускают процессы и передают конфигурацию через Core API.

Каждый product plugin обязан быть построен через Plugin SDK `HandlerSet`.
Универсальные `GET /healthz` и `GET /metrics` фиксируются versioned SDK
contract и реализуются самим SDK на базе его общего observability collector.
Plugin не реализует, не переопределяет, не переименовывает и не дублирует эти
handlers или их response shape. Если у plugin есть публичный listener, он
подключает SDK `NewObservabilityHandler`, а не собственную реализацию. Domain и
Runtime не меняются в текущем implementation pass, но правило распространяется
и на них.

Клиенты управления используют только Core Management API и не повторяют Core
runtime. Любое новое пересечение владения фиксируется у владельца контракта как API gap.
