# Архитектура и lifecycle plugins

Plugin — отдельный процесс с declared capabilities. Gateway выбирает маршрут,
применяет TLS/policy/limits и вызывает capability по loopback protocol;
плагин не получает public socket, filesystem path или raw secret без scoped
grant. Transport и control contract — в [Plugin protocol](/gateway/architecture/protocol).

Lifecycle: spawn → manifest → health → config apply → ready → graceful
shutdown/restart. Gateway ограничивает deadline, concurrency, payload и память;
unhealthy instance перезапускается с bounded backoff.
