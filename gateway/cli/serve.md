# serve

Запускает Gateway control plane, plugin runtime и выбранный Caddy build variant
после bootstrap validation и SQLite migration/recovery.

Перед открытием public traffic listeners Gateway проверяет Caddy build
identity/modules, восстанавливает pending durable operations, сверяет digests
immutable config/artifacts и гидратирует active generation в in-memory
snapshot. Ошибка bootstrap, SQLite recovery, module compatibility или snapshot
preparation не открывает traffic listeners и завершает процесс с typed startup
error. Временно нездоровый plugin не блокирует несвязанные sites: unavailable
получают только его bindings до reconnect, handshake, config apply и health.

Graceful shutdown прекращает принимать новые Management/traffic requests,
завершает bounded in-flight calls, корректно останавливает local-supervised
plugins и закрывает Caddy runtime. External Caddy останавливается как
supervised child. Remote plugins не получают process Shutdown: Gateway
закрывает только свои соединения. Call с неизвестным исходом не replay-ится,
живой Stream закрывается и не мигрирует на другую replica.
