# Gateway CLI

CLI управляет локальным Core и дополняет Management API. В обоих глобальных
профилях CLI может проверять статус/operations и bootstrap доступ; в
`supervised` дополнительно доступно управление plugin installation/process
lifecycle. В `external` команды install/start/stop/restart запрещены, потому что
lifecycle принадлежит оркестратору.

CLI не предоставляет Caddy-specific commands. Caddy settings передаются через
generic plugin configuration API; site releases принадлежат Caddy plugin Admin
Surface.

- [`serve`](serve) — запуск Core и восстановление active state.
- [`versions`](versions) — plugin versions и plugin-owned site releases.
- [Management API](../api/) — конфигурация, operations, access и audit.
