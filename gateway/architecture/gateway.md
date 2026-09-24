# Control plane и data plane

Gateway управляет системой, но не является пользовательским HTTP proxy.
Management API, CLI, SQLite, reconciler и plugin lifecycle принадлежат control
plane. Caddy принимает публичный traffic и исполняет native Caddyfile; Liapoldus
handler внутри Caddy отправляет capability-вызовы непосредственно plugin по
gRPC. Constructor и plugin executables остаются отдельными продуктами или
процессами.

| Компонент | Владеет | Persistence/API |
| --- | --- | --- |
| Bootstrap loader | Пути, Management transport/trust, Caddy variant/binary | Минимальный `gateway.yaml` и строгая schema. |
| Group manager | Immutable revisions, current/previous, release activation | SQLite metadata + content-addressed files; Group API. |
| Caddy runtime adapter | Caddyfile adaptation, runtime snapshot и Liapoldus modules | Embedded Caddy либо supervised compatible external Caddy. |
| Plugin control manager | Local Supervisor, remote connections, health, grants, dispatch snapshots | Generic plugin instance API; конкретные plugin contracts подключаются отдельно. |
| Caddy data-plane handler | Маршрут по instance/capability/mode и прямой gRPC dispatch | Immutable in-memory dispatch snapshot; не обращается к Management API/SQLite на запросе. |
| Admin proxy/checkpoint manager | Native pass-through, checkpoint, drift/reconcile | Management API + SQLite operation/audit metadata. |
| Access manager | One `platform-admin` principal; web mTLS+Bearer and loopback/SSH-forwarded Bearer | SQLite verifier hashes; per-user Constructor RBAC is enforced before Gateway calls. |
| Operation/audit store | Durable operations, idempotency, audit | SQLite, redacted output. |

## Путь пользовательского запроса

Для HTTP, WebSocket, SSE и L4 Caddy выполняет listener, matcher, TLS и native
protocol semantics. Liapoldus handler получает уже сопоставленные
instance/capability/mode и ограниченный request context, после чего обращается
к plugin напрямую по gRPC. Он не вызывает REST use case, Management API или
SQLite и не передаёт plugin socket, filesystem path либо raw secret. Plugin
response валидируется и переводится в Caddy response до начала отправки; для
потоков ошибка после commit headers/upgrade приводит к закрытию stream.

```text
Client → Caddy listener/matcher → Liapoldus Caddy handler → plugin gRPC
                                                   ↘ response validation → Client

Constructor web backend / desktop SSH bridge → Gateway Management API → SQLite/reconciler
                                          ↘ Caddy Admin API/IPC → runtime snapshot
```

В external-варианте Gateway запускает отдельный совместимый Caddy child
process. До активации traffic snapshot Gateway отправляет ему целый immutable
dispatch snapshot через закрытый аутентифицированный Admin API/IPC. Caddy
handler использует snapshot локально и подключается к plugins напрямую. Ошибка
синхронизации сохраняет предыдущие dispatch и Caddy snapshots. Узкий
GrantBroker callback для scoped secret redemption не является HTTP proxy.

## Конфигурационный поток

Bootstrap конфигурация загружается до запуска listener-ов. Traffic runtime
создаётся из совокупности active group revisions. Новый group release
проверяется совместимым Caddy build, связывается с immutable frontend roots,
собирает candidate Caddy config и соответствующий plugin dispatch snapshot, а
затем активируется как единое согласованное состояние.

Полная детализация композиции и восстановления: [Control plane](control-plane).
Wire plugin contract: [Plugin protocol](protocol).

## Владение

Caddy владеет исполнением HTTP/HTTPS, HTTP/2/3, reverse proxy, static serving,
WebSocket, TLS/ACME и Caddy-L4 TCP/UDP. Gateway владеет Management API,
authorization, groups/revisions, plugin lifecycle и grants, audit,
reconciliation и созданием dispatch snapshots. Caddy handler отвечает за
data-plane dispatch и валидацию plugin response. Ни Management API, ни
application/use-case слой Gateway не стоят на пути пользовательского запроса.
Продуктовые guarantees не растворяются в native Caddy Admin API.
