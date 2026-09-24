# Конфигурационный интерфейс Gateway

В v1 нет Gateway route-configuration API. Bootstrap gateway.yaml читается при
старте; его ограниченная схема описана в
[Bootstrap configuration](/gateway/configuration/bootstrap).

Traffic runtime задаётся native Caddyfile group fragments и изменяется через
[Group Releases API](groups). Для advanced operator доступен полный native
Caddy Admin API pass-through под Management API authentication. Изменение
через Admin API создаёт checkpoint; при drift group publish блокируется до
явного reconcile или restore.

PUT /api/config, POST /api/config/validate и POST /api/reload являются
удалёнными endpoints старой Gateway DSL и не входят в целевой v1 contract.
