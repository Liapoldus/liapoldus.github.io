# Формы и plugin dispatch

Плагин forms-db вызывается напрямую data-plane plugin-ом по разрешённой capability. Core хранит generic settings и interaction policy; Management API не проксирует пользовательский payload.

Capability schemas и Admin Surface принадлежат forms-db plugin; `pluginprotocol` остаётся общей transport/security библиотекой. См. [plugin Admin Pages](/plugins/admin-pages), [plugin configuration API](/gateway/api/config) и [целевую архитектуру](/gateway/architecture/target).
