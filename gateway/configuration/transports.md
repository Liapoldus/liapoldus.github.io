# Транспорты Gateway

## HTTP и TLS

HTTP/HTTPS, HTTP/2/3, reverse proxy, static serving, WebSocket и ACME
исполняются совместимым Caddy runtime. Его конфигурация задаётся native
Caddyfile, входит в активные group revisions и проходит embedded/external
parity gate. HTTP streaming request/response, WebSocket и SSE используют
Liapoldus handler module и прямой gRPC `Stream` к plugin; Gateway Management
API не находится в пользовательском request path. Caddy Admin API остаётся
внутренним и недоступным с публичного интерфейса.

## L4

Gateway v1 использует [Caddy-L4](https://github.com/mholt/caddy-l4) за Liapoldus adapter для TCP/UDP relay и direct plugin streams. Это
обязательный компонент обоих Caddy build variants. Caddy-L4 экспериментален,
поэтому расширенный conformance suite — блокирующий release gate. При провале
v1 не объявляется готовым; переход на Go net или gnet fallback не допускается.

L4 в v1 — relay к заранее заданному peer/upstream; peer discovery, rendezvous,
hole punching и NAT traversal не обещаются. TCP stream соответствует одному
соединению; UDP сохраняет datagram boundaries. Лимиты, timeouts, cancellation,
reload и поведение при partial failure должны совпадать между embedded и
external variant.

Точные conformance cases собраны в [Acceptance matrix](acceptance), а module
build policy — в [Control plane](/gateway/architecture/control-plane).
