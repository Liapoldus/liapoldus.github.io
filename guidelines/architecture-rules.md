# Архитектурные правила

Domain не зависит от infrastructure, presentation или assets. Application
зависит только от typed domain models/interfaces. Infrastructure реализует
ports и изолирует filesystem, сеть, storage, plugins и validators.

Public socket, TLS, route selection, limits и process supervision принадлежат
Gateway. Plugin получает лишь минимальный разрешённый context и возвращает
typed action. Constructor вызывает Management API, но не повторяет Gateway
runtime. Любое новое пересечение владения фиксируется как API gap.
