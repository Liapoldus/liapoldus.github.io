# Liapoldus Plugin Data Protocol

Эта страница описывает распределение ролей. Единственный канонический источник
wire-протокола, protobuf definitions, versioned JSON schemas и conformance
vectors — [`github.com/Liapoldus/pluginprotocol`](https://github.com/Liapoldus/pluginprotocol):
[proto v1](https://github.com/Liapoldus/pluginprotocol/tree/main/proto/liapoldus/plugin/v1)
и [контракты](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts).
Формы сообщений на этой странице намеренно не дублируются.

## Граница data plane

Caddy исполняет пользовательский traffic. Liapoldus handler в Caddy отправляет
capability request непосредственно plugin по gRPC; путь не проходит через
Gateway Management API, его REST handlers или application use cases. Gateway
заранее управляет plugin lifecycle и формирует immutable dispatch snapshot.
Embedded Caddy читает snapshot внутри Gateway process. External Caddy получает
целый snapshot через закрытый аутентифицированный Admin API/IPC, после чего
самостоятельно диспетчеризует пользовательские запросы.

В control plane остаются Manifest/config/health lifecycle, spawn/shutdown для
local plugins, remote endpoint configuration, authorization, limits,
GrantBroker, audit и redaction. Caddy handler не читает SQLite на request path,
не вызывает Management API и не передаёт plugin socket, filesystem path или raw
secret. Единственное plugin → Gateway обращение — отдельный scoped
`GrantBroker.RedeemGrant`; оно не является общим request proxy.

## Версия и transport

Protocol namespace и Go import path остаются `liapoldus.plugin.v1` и
`github.com/Liapoldus/pluginprotocol`. Протокол использует gRPC over HTTP/2.
Local-supervised plugins слушают назначенный IPv4 loopback endpoint и могут
использовать insecure gRPC credentials только внутри этого локального
deployment boundary. Remote plugins имеют фиксированный endpoint и обязательный
TLS; для межмашинной среды требуется mTLS с отдельной externally-issued
identity. Management и plugin workload trust roots не совмещаются.

Расширение `Stream` публикуется в ветке v1 аддитивно: сохраняются существующие
L4 field numbers и поведение. Старые framing-плагины не поддерживаются; нет
dual-stack, autodetection или insecure downgrade. Следующий protocol release —
`v1.1.0` согласно принятой политике репозитория.

## RPC и владельцы

| RPC/поверхность | Вызов | Назначение |
| --- | --- | --- |
| `Manifest`, `ConfigSchema`, `ConfigApply`, `Shutdown` | Gateway → plugin | Контрольная плоскость instance и settings. |
| `grpc.health.v1` | Gateway/оператор → plugin | Стандартный readiness/health contract. |
| `Call` | Caddy handler → plugin | Обычный ограниченный request/response с versioned JSON payload. |
| `Stream` | Caddy handler ↔ plugin | HTTP streaming, WebSocket, SSE и L4. |
| `GrantBroker.RedeemGrant` | plugin → Gateway | Однократное redemption заранее выданного scoped grant. |
| Caddy Admin API/IPC | Gateway → Caddy process | Конфигурация runtime и external-варианта; не часть plugin protocol. |

REST Constructor ↔ Gateway остаётся только control plane. Caddy Admin API
остаётся закрытым; его операторский pass-through через Gateway проходит
authentication, checkpointing и drift protection.

Manifest дополняется аддитивным descriptor для каждой capability: явный список
поддерживаемых invocation modes (`Call`, HTTP stream, WebSocket, SSE, TCP, UDP).
Существующее поле списка имён сохраняется. Gateway проверяет соответствие
descriptor с выбранным `liapoldus_plugin` mode до activation group revision;
runtime-вызов неподдерживаемого mode не используется как механизм discovery.
Точная protobuf-структура и её versioning определяются только в
`pluginprotocol`.

## `Call`

`Call` используется для конечного HTTP request/response, когда request body и
response можно безопасно ограничить и передать одним вызовом. Сохраняются
существующие JSON boundary models и их versioned schemas: HTTP request/context,
identity context, L4 request и response actions. Не добавлять protobuf DTO на
каждую бизнес-capability и не переносить HTTP method/path/headers/body в
отдельную route DSL.

Лиаполдус Caddy handler берёт route-selected instance, capability и mode из
нативного Caddyfile handler directive, удаляет запрещённые credentials из
context, проверяет входящие cookies по allow-list instance/capability и
вызывает `Call`. Response payload/action целиком валидируется до передачи в
Caddy. Обычные и HttpOnly cookies применяются только через типизированные
response actions; чувствительные значения не попадают в logs, errors, audit,
traces или diagnostic events.

## Универсальный `Stream`

Один gRPC bidirectional stream представляет одну ограниченную streaming
операцию. Он использует versioned open context и явные lifecycle/data/metadata
frames. Точные enums, JSON fields, sequence rules и size limits определяются
только в `pluginprotocol`: [open-context schemas](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/stream-open-context.schema.json)
и [HTTP response-start metadata](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/http-stream-response-metadata.schema.json).

### HTTP streaming request/response

Caddy открывает stream с HTTP metadata и context; тело не включается в open
payload и передаётся последующими request-data chunks. Plugin может независимо
послать response-start metadata, затем response-data chunks, пока продолжается
загрузка запроса. Request half-close, response completion, cancellation и
errors представлены явным lifecycle, а не неограниченной очередью или
буферизацией тела.

### WebSocket

Caddy проверяет и выполняет внешний WebSocket handshake и framing. До отправки
`101` plugin принимает или отклоняет upgrade и может выбрать только subprotocol,
предложенный клиентом; Caddy проверяет выбор и завершает handshake. После
upgrade Stream передаёт text/binary messages с сохранением message boundaries.
Ping/pong и протокольный handshake принадлежат Caddy; нормальное закрытие,
ошибочный close и cancellation отражаются в stream lifecycle.

### Server-Sent Events

Plugin отправляет отдельные структурированные SSE events с `data` и
необязательными `event`, `id`, `retry`. Caddy сериализует их в wire format и
управляет HTTP flush. Plugin не обязан реализовывать HTTP/SSE server.

### L4

Сохраняется текущая модель: TCP — один gRPC stream на соединение, UDP — один
stream на datagram. TCP передаёт raw bytes, UDP сохраняет границы datagram;
порядок, направление и close/cancel не теряются. Caddy-L4 принимает и
маршрутизирует внешнее соединение; plugin не получает listener socket.

## Limits, cancellation и ошибки

- Для long-lived streams применяются отдельные instance/route limits:
  concurrency, idle timeout и maximum duration. Unary `timeout` не применяется
  вместо этих ограничений.
- Максимум request body считается по фактически принятым bytes, в том числе
  chunked; превышение завершает upload независимо от `Content-Length`. Каждый
  gRPC message ограничен до обработки, а flow control обеспечивает bounded
  backpressure.
- Клиентский disconnect, route cancellation, остановка plugin или превышение
  limits отменяют связанный gRPC stream. Для UDP datagram не объединяются и не
  дробятся между вызовами.
- Ошибка до response-start отображается в обычную типизированную Gateway
  ошибку. После HTTP headers, SSE body или WebSocket `101` заменить response
  невозможно: Caddy прекращает соответствующий stream/connection.
- Response-start metadata и все response actions/cookies валидируются
  атомарно до commit headers/upgrade. Ошибки и telemetry не содержат
  Authorization, cookies, secrets, private keys, service keys или grant
  handles.

## Handshake и grants

Gateway plugin manager подключается к instance, сверяет Manifest, проверяет
стандартный health, получает settings schema и применяет settings. Только
готовый instance попадает в dispatch snapshot. Local Supervisor владеет
spawn/stop/restart только local instances; remote lifecycle остаётся у Docker,
Kubernetes или оператора. Caddy handler обновляет active dispatch reference
атомарно и не использует частичный snapshot.

Grant handle связан с instance, capability, purpose и разрешённым scope, живёт
не дольше разрешённого вызова и отзывается при завершении, ошибке, отмене или
deadline. Plugin не может перечислять secrets или запрашивать их по имени.
Gateway остаётся владельцем разрешения и выдачи; redemption — только narrow
callback, а не forwarding пользовательского body.

## Conformance

Conformance проверяет protobuf descriptors, JSON schemas и примеры, а также
последовательности `Call`/`Stream`: malformed/oversized frames, запрещённый
state transition, deadlines, cancel, concurrency, backpressure, close race,
WebSocket negotiation, SSE serialization semantics и корректное завершение
после response-start. Отдельные Gateway E2E тесты проверяют direct
Caddy-handler-to-plugin path и parity embedded/external. Golden vectors
наблюдаемого поведения Gateway не должны кодировать protobuf wire bytes.
