# Безопасность Gateway

Эта страница кратко фиксирует trust boundaries конфигурации. Полный контракт
Management authentication, Constructor roles и desktop bridge описан в
[Аутентификации Management API](/gateway/api/authentication); здесь правила не
дублируются.

## Сетевые поверхности

- Публичные HTTP/TLS/L4 listener-ы принадлежат Caddy и не обслуживают
  Management API.
- Management API имеет отдельный listener. Web Constructor backend подключается
  только из private network/VPN по HTTPS+mTLS и Bearer token.
- Desktop Constructor открывает SSH port-forward через внешний OpenSSH/bastion
  к loopback Management API; tunnel не даёт shell или произвольного forwarding.
  Внутри tunnel проверяются TLS server identity и Gateway Bearer token.
- Caddy Admin API external process привязан к permissioned Unix socket, доступному
  Gateway process; embedded variant использует внутренний adapter. Socket/API
  не публикуется через host port, Docker/Kubernetes Service, Ingress или
  reverse proxy.
- Plugin endpoints доступны только из разрешённой plugin/Caddy network policy.
  Прямой plugin-to-plugin traffic запрещён.

## Plugin trust

Local plugin запускается Gateway Supervisor на назначенном loopback endpoint.
Remote plugin подключается по стабильному Docker/Kubernetes Service endpoint с
TLS/mTLS; процессом, replicas, readiness и restart policy владеет внешняя
среда. Каждая Pod имеет уникальную externally-issued workload identity,
связанную с logical plugin instance. Все Ready replicas обязаны иметь один
совместимый release/Manifest/settings digest; новая gRPC connection заново
проверяет сертификат и protocol handshake. Management CA, plugin workload CA и
Caddy/ACME state разделены; Gateway не является CA и не имеет insecure fallback.

Потеря одного plugin instance деградирует только связанные Caddy bindings.
Неопределённый unary Call не повторяется автоматически; оборванный Stream
закрывается и не переносится между replicas. Полный lifecycle и recovery
описан в [режимах подключения plugin](/gateway/architecture/plugin-deployment).

## Секреты и audit

Plaintext secrets запрещены в Caddyfile revisions, Gateway API bodies, SQLite,
external Caddy control payloads, logs, traces и audit. Config содержит только
внешние secret references. Constructor credentials и plugin workload
credentials никогда не экспортируются в UI. Ошибки безопасны и redacted;
Admin audit хранит actor binding, method, normalized path, operation/checkpoint
IDs и результат, но не request/response bodies или sensitive headers.

Сертификатная готовность отслеживается отдельно по домену. TLS/ACME ownership и
Caddy trust configuration заданы в
[архитектуре control plane](/gateway/architecture/control-plane).
