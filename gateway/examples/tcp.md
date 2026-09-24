# TCP relay

Gateway v1 использует Caddy-L4 для L4 listeners и TCP relay. Режим и правила
задаются в native Caddyfile и входят в application group revision. Liapoldus
не вводит отдельную YAML-модель TCP listeners/upstreams.

Caddy-L4 — экспериментальное внешнее Go module; его Caddyfile directives,
версии и ограничения публикуются в
[репозитории Caddy-L4](https://github.com/mholt/caddy-l4). Liapoldus custom
build фиксирует его версию, а TCP SNI/pass-through, TLS handling, plugin flow,
timeouts, limits, reload и error mapping проверяет conformance suite.

До фиксации конкретной версии и поддержанного handler subset этот документ не
приводит непроверяемый конфигурационный пример. Приёмка Caddy-L4 — обязательный
release gate, без fallback на Go net или gnet. См.
[описание L4](/gateway/configuration/transports).
