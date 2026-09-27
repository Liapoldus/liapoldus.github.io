# Blueprint реализации

Эта спецификация позволяет создать совместимый Gateway на любом языке. Она
нормирует observable behavior, а не packages, classes или framework.
Описанные ниже state machines и границы — целевая нормативная архитектура, а
не перечень уже работающих production-маршрутов. Фактическое состояние core
фиксируется в [матрице реализации](#текущее-состояние-core); она не изменяет
требования blueprint.

## Текущее состояние core

| Область | Подтверждённая реализация | Что ещё не доказано или не подключено |
| --- | --- | --- |
| Group releases | Management handlers и SQLite-backed publish/rollback проходят TypeScript integration; первая `system` revision проверена через настоящий embedded Caddy listener. Startup recovery ошибки сохраняют public listener закрытым. Проверяются Caddyfile adaptation и staging archive. | External first-release parity и полный process crash recovery не доказаны; archive limits/negative cases покрыты, но полного positive archive conformance ещё нет. |
| Plugin dispatch | Отдельные Caddy handler slices проверяют `Call`, HTTP `Stream`, WebSocket, SSE и Caddy-L4 TCP/UDP. External custom-Caddy child-process E2E проверяет direct `Call`, HTTP request/response chunks, WebSocket handshake/subprotocol/messages, SSE serialization и TCP/UDP relay; Management API не проксирует пользовательский вызов. Отдельный real-child smoke запускает бинарники `captcha`, `forms-db` и `identity` через embedded `serve`. | Это подтверждает только проверенные local child-process сценарии. Remote replicas, `DispatchApply` barrier, rollout/drain, stream cancellation/backpressure/limits и полный embedded/external parity не подтверждены. Smoke трёх plugin binaries — интеграционное свидетельство, а не полная приёмка этих плагинов. |
| Capability → mode | Embedded Caddy провизионирует candidate Liapoldus modules до activation. External Caddy запускает штатный `caddy validate` над собранным candidate JSON; оба пути проверяют route mode по live plugin Manifest до активации. Real child-process E2E external Caddy отклоняет `forms.submit/websocket` при Manifest, объявляющем только `call`, и подтверждает сохранение действующего public snapshot. | Remote replica `DispatchApply` barrier и полный embedded/external parity gate остаются незакрытыми. |
| Cookies | Management `GET`/`PUT`, ETag/If-Match CAS, SQLite schema v3 и audit одной транзакцией. Embedded `serve` E2E проверяет restore, фильтрацию входящих cookies и ordinary/`HttpOnly` actions реального child plugin; невалидный набор actions не отправляет частичный `Set-Cookie`. Real custom external-Caddy `serve` E2E проверяет PUT → private `/load` → новый allow-list, а затем fault-inject-ит SQLite write failure и подтверждает старые ETag/policy и публичное поведение. | Embedded и external Caddy активируют candidate dispatch generation до commit; external использует закрытый Admin Unix socket. При ошибке durable commit восстанавливается прежний snapshot. Crash-recovery между процессами, rollback-failure fencing и общий cross-variant gate ещё не подтверждены. |
| HTTP Stream limits | В handler есть route-level concurrency guard; HTTP Stream/WebSocket/SSE проверяются focused E2E. | Общий configurable per-instance concurrency, idle timeout и maximum duration отсутствуют; нормативный набор лимитов не выполнен. |
| External Caddy | `serve` запускает и supervises отдельный process; focused lifecycle tests проверяют private control socket, readiness и restart. Совместимый custom-Caddy fixture проверяет direct `Call` от local supervised instance и `caddy validate` candidate module configuration до активации. | Smoke `captcha`, `forms-db` и `identity` подтверждает интеграцию child process с выбранным `serve` сценарием, но не полный набор capability каждого плагина. Remote replica/`DispatchApply` barrier и общий conformance gate embedded/external parity остаются незакрытыми. |
| Management API | Bootstrap/auth, группы, revisions, publish/rollback, operations lookup, plugin inventory read и audit имеют текущие handlers/тесты. | TLS operations, полный Caddy Admin pass-through/checkpoint/drift/reconcile и часть mutation/audit/recovery semantics остаются планом. |
| CAPTCHA/WAF | Документация и generic plugin contract задают plugin-owned boundary; отдельные handler slices существуют. | CAPTCHA WAF dispatch и production plugin composition не подключены; пример не означает готовую WAF функцию. |

Подробный изменяемый список незавершённой работы — в
[`core/TODO.md`](https://github.com/Liapoldus/core/blob/main/TODO.md). Статус
обновляется по подтверждённым runtime/test evidence; наличие OpenAPI, proto,
схемы или handler-level test само по себе не означает production готовность.

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
