# Развёртывание Gateway

Gateway поставляется как один Liapoldus server process. Constructor — отдельный
desktop/web-продукт, plugins остаются отдельными binaries/services. Caddy имеет два
варианта запуска: embedded в Gateway process либо compatible external binary,
который Gateway запускает и supervises как child process.

## Выбор Caddy build

Оба build variants обязательны для v1 и используют общий Management API и
одинаковый Liapoldus data-plane handler:

- embedded: Caddy и Liapoldus/Caddy-L4 modules включены в Gateway executable;
- external: Gateway запускает указанный совместимый Caddy binary отдельным
  процессом.

External binary обязан иметь зафиксированные совместимые Liapoldus modules и
Caddy-L4; обычный Caddy не поддерживается. Gateway проверяет build/module
identity до открытия traffic listeners и передаёт external runtime config и
immutable dispatch snapshots через закрытый Admin API на permissioned Unix
socket. Сам handler вызывает plugin напрямую по gRPC; Management API не
проксирует пользовательские запросы. Caddy Admin listener не публикуется в
host/container network. Gateway supervises external Caddy, перезапускает child
с bounded backoff и выставляет data-plane readiness отдельно от Management
readiness. Оба variants проходят общий parity suite; Caddy-L4 failure блокирует
release.

## Хранилище

`gateway.yaml` задаёт путь к локальной SQLite database и artifact root. SQLite
содержит группы/revisions/pointers, plugin metadata, service-key verifiers,
operations/idempotency, audit, plugin settings/revisions и Caddy checkpoints.
Immutable Caddyfile revisions, frontend roots и checkpoint snapshots хранятся
как файлы. При старте Gateway сверяет metadata/digests, загружает plugin
settings из SQLite и гидратирует active generation в immutable in-memory
snapshot; пользовательские запросы не читают SQLite или файлы. SQLite на
сетевой filesystem не поддерживается.

Backup должен согласованно включать online SQLite backup и immutable artifacts
из одного snapshot boundary. ACME internal state остаётся под управлением
Caddy/CertMagic.

## Сеть и безопасность

Публичный traffic слушается только Caddy. Management listener отделён. Web
Constructor backend подключается только из private network/VPN по HTTPS+mTLS и
отдельному Bearer platform-admin token для каждого Gateway. Desktop Constructor
использует short-lived SSH certificate через OpenSSH/bastion, ограниченный
forwarding к loopback Management API; внутри tunnel проверяются TLS server
identity и Bearer token. Caddy Admin доступен только Gateway по permissioned
Unix socket и не публикуется через
container port, Kubernetes Service/Ingress, host ingress или reverse proxy.

Plugin mode задаётся на instance. Local mode использует supervised process и
назначенный loopback endpoint. Remote mode подключается к стабильному Service
по TLS/mTLS; внешняя среда запускает и рестартует workload. Каждая replica
имеет unique identity, привязанную к logical instance; Ready replicas должны
иметь одинаковые release/config digests, а Gateway повторяет handshake на
каждом новом connection. Gateway не запускает remote plugin и не replay-ит
неопределённый Call. Plugin workload CA и Management CA разделяются; identities
ротируются внешним CA.

## Container

Embedded variant работает в одном контейнере Gateway. External variant
содержит совместимый Caddy binary в том же image либо в ограниченно доступном
каталоге на той же машине/Pod; Gateway supervises его lifecycle. Это два
процесса в одном deployment unit, но Caddy control endpoint остаётся private
permissioned Unix socket, а не отдельной публичной службой. Gateway process
работает non-root; database, artifacts и ACME state находятся в отдельных
persistent mounts с ограниченными правами.

Bootstrap описан в [схеме gateway.yaml](/gateway/configuration/bootstrap),
plugin modes — в [архитектуре подключения plugins](/gateway/architecture/plugin-deployment),
а общий порядок миграции — в [roadmap](/gateway/architecture/v1-migration-roadmap).
