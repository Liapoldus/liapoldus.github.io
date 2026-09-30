# Формы и plugin dispatch

Плагин forms-db вызывается напрямую data-plane plugin-ом по разрешённой capability. Core хранит generic settings и interaction policy; Management API не проксирует пользовательский payload.

Capability schemas и Admin Surface принадлежат forms-db plugin; Plugin SDK обслуживает общие REST lifecycle/admin endpoints, а `pluginprotocol` — только прямую plugin-to-plugin сеть. См. [plugin Admin Pages](/plugins/admin-pages), [plugin configuration API](/core/api/config) и [целевую архитектуру](/core/architecture/target).
