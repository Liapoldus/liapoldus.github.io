# UDP relay и P2P scope

Gateway v1 поддерживает UDP relay к явно заданному peer/upstream через
Caddy-L4. Это не peer discovery, rendezvous service, NAT traversal или
hole-punching network. Адреса и правила принадлежат native Caddyfile; Gateway
не публикует отдельную UDP route DSL.

Flow state, idle timeouts, datagram/byte limits и behavior при reload должны
быть bounded и проверены Caddy-L4 conformance suite на embedded и external
build variants. Неподдержанный contract блокирует v1; запасного Go net/gnet
implementation нет.

Точную Caddy-L4 configuration reference см. в
[официальном repository](https://github.com/mholt/caddy-l4), а продуктовый
scope — в [transports](../configuration/transports).
