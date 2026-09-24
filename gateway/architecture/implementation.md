# Blueprint реализации

Эта спецификация позволяет создать совместимый Gateway на любом языке. Она
нормирует observable behavior, а не packages, classes или framework.

## Process boundaries

| Boundary | Владелец | Контракт |
| --- | --- | --- |
| Public sockets | Caddy | HTTP(S), TCP, UDP, TLS, protocol limits и native listeners |
| Traffic snapshot | Caddy runtime adapter | immutable Caddy config + Liapoldus dispatch generation, atomic activation |
| Static source | Caddy Liapoldus module | immutable frontend root, без mutable source path |
| Upstream | external service | Native Caddy HTTP/L4 handlers и upstream policy |
| Plugin | отдельный процесс/service | gRPC/HTTP/2, direct Caddy-handler calls, capabilities и scoped grants |
| Control plane | Gateway | CLI/Management API → desired state, lifecycle, reconciliation и releases |

## Обязательные state machines

`config`: collect → resolve → persist immutable candidate files + journal →
validate → build in-memory Caddy config/dispatch snapshot → synchronize external
Caddy if selected → activate generation → atomically publish runtime pointer and
SQLite `current`/`previous`. Любой failure оставляет старые active generations
и release pointers неизменными; candidate остаётся failed/staged.

`release`: stage → validate → durable immutable file → activation journal →
Caddy activation → publish `previous`/`current` in SQLite → audit. Metadata
cannot point at a missing or digest-mismatched file. Directory source не
проходит эту машину.

`plugin`: local spawned → handshake/config apply/health → ready → unhealthy →
bounded restart; remote connected → mTLS+handshake/health → ready → unavailable →
reconnect. Local and remote modes may be mixed per instance. Remote restart and
replica rollout belong to Docker/Kubernetes/operator.
Handshake, grants, cancellation и streams определяет
[versioned Plugin protocol](/gateway/architecture/protocol). Исходные `.proto`
находятся в
[`github.com/Liapoldus/pluginprotocol`](https://github.com/Liapoldus/pluginprotocol).
Schema capabilities и settings принадлежат подключённым plugin repositories.

Публичный `request` исполняет Caddy и загруженные Liapoldus modules. Gateway
Management API и SQLite отсутствуют в request path. Для plugin routes Caddy
module делает bounded `Call` или bidi `Stream` напрямую к plugin; exact stream
ordering и payload schemas определяет
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol).

## Concurrency и failures

Data-plane handler получает только active immutable dispatch snapshot; update
готовится вне request path, синхронизируется в external-варианте и активируется
поколением. Старое поколение освобождается после drain. Publish сериализуется
по group. `Call` имеет bounded unary timeout; `Stream` имеет собственные
concurrency, idle-timeout и maximum-duration limits. Ошибка до response-start
возвращает typed Problem Details, после commit headers/upgrade закрывает stream.

## Trust boundaries

Client не управляет source path, upstream headers, identity, grants или
secrets. Plugin не получает public socket, filesystem path или raw secret.
Web Constructor backend проходит TLS client authentication + per-Gateway
Bearer; desktop SSH bridge форвардит к loopback API и сохраняет TLS server
verification + Bearer. Constructor owns per-user RBAC. Caddy handler не отдаёт
plugin socket, filesystem path или raw secret; только plugin GrantBroker
redemption остаётся узким обратным callback.
Полный security contract —
<a href="/spec/security-runtime.json" target="_blank" rel="noopener">security-runtime.json</a>.
