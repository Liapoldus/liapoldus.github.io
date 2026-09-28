# Пример reverse proxy

Core не принимает Caddyfile или собственную route DSL. Reverse-proxy settings входят в versioned JSON schema Caddy plugin и push-ятся из Core по `ConfigApply`.

См. [транспорты](../configuration/transports) и [целевую архитектуру](../architecture/target).
