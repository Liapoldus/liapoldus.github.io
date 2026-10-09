# Архитектурные правила

Domain не зависит от infrastructure, presentation или assets. Application
зависит только от typed domain models/interfaces. Infrastructure реализует
ports и изолирует filesystem, сеть, storage, plugins и validators.

Core владеет только защищённым Management API, SQLite с точными JSON-поколениями
конфигурации и общим lifecycle через Plugin SDK REST. Публичный HTTP/HTTPS
socket, TLS, маршруты и лимиты трафика принадлежат Server plugin. Каждый
product plugin владеет своей схемой настроек, данными и capability-контрактами;
`pluginprotocol` переносит только generic plugin↔plugin вызовы. В v1 оператор
запускает процессы вручную: Core не управляет ими как workload-ами.

Клиенты управления используют только Core Management API и не повторяют Core
runtime. Любое новое пересечение владения фиксируется у владельца контракта как API gap.
