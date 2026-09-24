# Архитектура и lifecycle plugins

Plugin — отдельный процесс/service с declared capabilities. Caddy выполняет
public listener/TLS/routing и его Liapoldus handler вызывает capability
непосредственно по gRPC. Gateway управляет instance lifecycle, доверенными
endpoints и immutable dispatch snapshots, но не проксирует клиентский запрос.
Plugin не получает public socket, filesystem path или raw secret без scoped
grant. Transport и data contract — в [Plugin protocol](/gateway/architecture/protocol).

Lifecycle: spawn → manifest → health → config apply → ready → graceful
shutdown/restart. Gateway ограничивает deadline, concurrency, payload и память;
unhealthy instance перезапускается с bounded backoff.
