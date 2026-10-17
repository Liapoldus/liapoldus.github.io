# Архитектурные правила

Domain не зависит от infrastructure, presentation или assets. Application
зависит только от typed domain models/interfaces. Infrastructure реализует
ports и изолирует filesystem, сеть, storage, services и validators.

Core владеет только защищённым Management API, SQLite с точными JSON-поколениями
конфигурации и общим lifecycle через Service SDK REST. Публичный HTTP/HTTPS
socket, TLS, маршруты и лимиты трафика принадлежат Server service. Каждый
product service владеет своей схемой настроек, данными и capability-контрактами;
`Wool` переносит только generic service-to-service вызовы. В v2 Core не
управляет workload process lifecycle; standalone CLI и operator adapters
запускают процессы и передают конфигурацию через Core API.

Каждый product service обязан быть построен через Service SDK `HandlerSet`.
Универсальные `GET /healthz` и `GET /metrics` фиксируются versioned SDK
contract и реализуются самим SDK на базе его общего observability collector.
service не реализует, не переопределяет, не переименовывает и не дублирует эти
handlers или их response shape. Если у service есть публичный listener, он
подключает SDK `NewObservabilityHandler`, а не собственную реализацию. Domain и
Runtime не меняются в текущем implementation pass, но правило распространяется
и на них.

Клиенты управления используют только Core Management API и не повторяют Core
runtime. Любое новое пересечение владения фиксируется у владельца контракта как API gap.
