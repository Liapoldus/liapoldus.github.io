# Upstream и balancing

Core не имеет собственной модели upstream-ов и не принимает native Caddyfile.
Traffic settings задаются JSON-схемой Caddy plugin и хранятся Core в SQLite;
plugin компилирует их в runtime configuration. Разрешённые backend fields и
behavior будут нормативно закреплены в versioned Caddy plugin schema, не в
Gateway-specific YAML DSL.

Плагины вызываются по explicit Core interaction policies напрямую через
`pluginprotocol`, а не становятся произвольными network upstreams. См.
[транспорты](transports), [plugin interactions](../architecture/control-plane)
и [target architecture](../architecture/target).
