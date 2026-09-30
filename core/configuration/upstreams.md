# Upstream и balancing

Core не имеет собственной модели upstream-ов и не принимает native Caddyfile.
Traffic settings задаются plugin-owned strict JSON schema, Core хранит полную
desired revision в SQLite, а Server plugin компилирует её в runtime
configuration. Допустимые origin, веса, балансировка, пассивное исключение,
TLS verification и безопасный retry определены в [контракте Server plugin](/plugins/server).
Отдельной Core upstream DSL нет.

Плагины вызываются по explicit Core interaction policies напрямую через
`pluginprotocol`, а не становятся произвольными network upstreams. См.
[транспорты](transports), [plugin interactions](../architecture/control-plane)
и [target architecture](../architecture/target).
