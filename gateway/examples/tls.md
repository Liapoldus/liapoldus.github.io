# TLS и Management access

HTTP/TLS traffic и ACME выполняет совместимый Caddy runtime, настроенный
native Caddyfile. Caddy/CertMagic — единственный владелец ACME account,
challenge, issuance и renewal. Gateway активирует корректную конфигурацию, не
ожидая сертификата; readiness показывается отдельно по домену.

Management API не размещается на traffic listener. Локальный CLI может
обращаться к loopback. Удалённый API требует private network/VPN, TLS с
проверкой клиента и Bearer service key. Его trust root отличается от CA для
remote plugin workloads.

Caddy Admin API должен связываться только с loopback/local IPC. Целевой Gateway-
authenticated pass-through с checkpoint/drift пока не реализован; прямой доступ
и публикация Caddy Admin port запрещены. См. [статус реализации](/gateway/architecture/implementation).

TLS renewal/revoke endpoints управляют только Caddy-managed certificates.
Контракты описаны в [Security](/gateway/configuration/security) и
[OpenAPI](/gateway/api/openapi).
