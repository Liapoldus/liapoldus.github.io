# Site publishing

Core v1 не предоставляет `/api/sites` и не владеет Caddy group release API.
Публикация site artifacts — функция Caddy plugin и доступна через его
объявленную Admin Surface. Caddy plugin хранит immutable releases и
`current/previous` на persistent filesystem; конфигурация самой traffic-схемы
остаётся в Core SQLite и push-ится через `ConfigApply`.

Общая Management API граница применяет авторизацию, plugin scope, лимиты,
идемпотентность и audit; Caddy plugin проверяет архив и атомарно активирует
site release. Точная форма upload/action будет частью versioned Admin Surface
контракта Caddy plugin, а не отдельной Caddy-specific Core API.

См. [Caddy ownership](../architecture/target) и
[plugin Admin UI](../../plugins/admin-pages).
