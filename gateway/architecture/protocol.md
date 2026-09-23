# Plugin protocol

Gateway и plugin process обмениваются сообщениями по **gRPC поверх HTTP/2 и
TCP-loopback**. Gateway остаётся владельцем listener-ов, маршрутизации,
transport security, process supervision и grants; plugin получает только
типизированный capability-контекст.

Нормативный источник протокола — репозиторий
[`github.com/Liapoldus/pluginprotocol`](https://github.com/Liapoldus/pluginprotocol):
[protobuf API](https://github.com/Liapoldus/pluginprotocol/tree/main/proto/liapoldus/plugin/v1)
и [versioned contracts](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts), включая
[схему контекста L4 stream](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/stream-open-context.schema.json).
Эта страница описывает архитектурные границы Gateway и ссылается на source of
truth; определения сообщений и поля вручную здесь не копируются.

## Версии и совместимость

Эта миграция входит в Gateway v1. Protobuf namespace, Go import path и
`ProtocolVersion` остаются `liapoldus.plugin.v1` и
`github.com/Liapoldus/pluginprotocol`. По прямому решению проекта breaking
transport migration остаётся в ветке protocol v1; следующая запланированная
публикация — `v1.1.0`.
Это исключение из обычного ожидания semantic versioning, и потребители обязаны
обновить plugin вместе с Gateway: старые TCP length-prefixed плагины не
обслуживаются. Dual-stack, automatic fallback и угадывание версии по байтам
сокета отсутствуют.

## Транспорт и граница доверия

Текущий запуск ограничен local-supervised endpoint на loopback. Планируемый
remote mode с фиксированным TLS/mTLS endpoint и требованиями к GrantBroker
описан в [архитектуре подключения plugin](/gateway/architecture/plugin-deployment);
он не меняет protobuf API и пока не поддерживается runtime.

- Plugin поднимает gRPC server только на IPv4 loopback; удалённый/public bind
  запрещён. Supervisor выбирает временный порт, передаёт адрес через
  `LIAPOLDUS_PLUGIN_ENDPOINT`; нормативный launch contract находится в
  [`pluginprotocol/contracts/protocol/v1/launch.json`](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/launch.json).
- Plugin SDK открывает переданный адрес через `transport.ListenLoopback`, а
  Gateway подключается с insecure gRPC credentials. Это локальный IPC, а не
  публичный сетевой API. Unix socket не
  используется по умолчанию, чтобы сохранить одинаковое поведение macOS и
  Linux.
- Для scoped-secret grants Gateway отдельно выдаёт plugin loopback endpoint
  брокера `GrantBroker`; его переменная запуска зафиксирована в launch contract.
  Это callback-поверхность plugin → Gateway, не публичный listener и не часть
  REST control plane Constructor.
- gRPC/HTTP/2 отвечает за framing, multiplexing, flow control и stream
  cancellation. Самописные Frame, 4-byte length prefix, request/stream ID,
  session multiplexer и их ошибки больше не являются частью транспорта.
- Standard gRPC reflection включён на loopback endpoint для диагностики через
  `grpcurl`; авторизация, лимиты и корректность handshake от reflection не
  зависят. Reflection не передаёт конфигурацию, grants или capability payload.
- Gateway не передаёт socket, filesystem path или raw secret. Остаются прежние
  JSON boundary-типы `HTTPRequest`, `L4Request` и
  `RequestContext`, их JSON Schemas, grants и редактирование секретов на
  Gateway boundary.

## RPC поверхность

| RPC | Тип | Кто вызывает | Назначение |
| --- | --- | --- | --- |
| `Manifest` | unary | Gateway → plugin | имя, protocol namespace и список capabilities |
| `ConfigSchema` | unary | Gateway → plugin | декларативная схема plugin settings |
| `ConfigApply` | unary | Gateway → plugin | атомарно принять проверенный runtime config |
| `Shutdown` | unary | Gateway → plugin | штатное завершение процесса |
| `Health/Check` | standard `grpc.health.v1` | Gateway/оператор → plugin | readiness; отдельный самодельный health RPC отсутствует |
| `Call` | unary | Gateway → plugin | capability-вызов с versioned JSON payload |
| `Stream` | bidirectional | Gateway ↔ plugin | L4 data flow и двунаправленные stream/event сообщения |
| `GrantBroker.RedeemGrant` | unary | plugin → Gateway | выдать секрет только по непрозрачному handle текущего вызова и проверить purpose/domain |

Control plane Constructor ↔ Gateway остаётся REST и этим изменением не
затрагивается.

## Handshake и lifecycle

Gateway запускает процесс через Supervisor, получает его loopback endpoint,
создаёт gRPC connection и ограничивает dial вместе со всем handshake одним
`plugins.<instance>.limits.startTimeout` (default `10s`). Это отдельный предел;
`plugins.<instance>.limits.timeout` (default `5s`) применяется к последующим
capability-вызовам и не продлевает startup. Порядок handshake:

1. `Manifest`: Gateway сверяет имя и объявленные capabilities с конфигурацией.
2. `Health/Check`: plugin должен сообщить `SERVING`.
3. `ConfigSchema`: Gateway получает декларативную settings schema.
4. `ConfigApply`: plugin применяет текущую runtime-конфигурацию и подтверждает
   успех.
5. Только после успешного handshake instance становится доступным для dispatch.

`Shutdown` используется при штатном stop; Supervisor сохраняет существующие
restart/backoff, RSS/call limits и process ownership. Ошибка шага handshake не
публикует частично готовый instance: Gateway классифицирует её как
`plugin_unavailable` или `protocol_violation` по существующему каталогу ошибок.
Каждый RPC получает bounded context deadline; отмена HTTP/L4 операции отменяет
соответствующий gRPC call/stream.

## Capability `Call`

`Call` — единая unary-точка входа. Запрос включает capability name и bytes,
содержащие UTF-8 JSON по versioned capability schema. Ответ содержит JSON
payload либо typed `code`/`message`; транспортабельные ошибки gRPC остаются
transport errors и преобразуются Gateway в существующие `plugin_timeout`,
`plugin_unavailable` или `protocol_violation`.

Отдельные protobuf request/response types для каждой бизнес-capability не
создаются: контракты capabilities, admin surface и settings
остаются декларативными JSON schemas. В частности, transport migration не
меняет версии и shape `HTTPRequest`, `L4Request`,
`RequestContext`, HTTP response actions или admin surface.

### Scoped secret grants

Raw secret не помещается в capability JSON, plugin settings или обычные IPC
metadata. Gateway прикладывает к `CallRequest` только opaque grant handle,
`purpose`, разрешённые `domains` и capability-binding; binding включает plugin
instance, конкретную capability, секрет и scope. Плагин получает endpoint брокера из
versioned launch contract и может запросить значение отдельным typed RPC
`RedeemGrant`. Gateway проверяет handle, активность исходного Call, purpose и
совпадение capability, указанной при вызове и redemption, а также точное
соответствие запрошенного domain allow-list; пустой domain допустим только для
grant без ограничения по доменам.

Grant существует не дольше одного capability-вызова и отзывается при его
успехе, ошибке, отмене либо истечении deadline. Secret bytes возвращаются
только как typed response `RedeemGrantResponse`. Запрещено записывать secret
или handle в logs, traces, audit, errors/events и следующий IPC вызов. Gateway
остаётся владельцем разрешения, резолвинга и редактирования; plugin не получает
пути к файлам или права запрашивать произвольный secret по имени. Обычные
плагины без выданного handle не могут использовать брокер для доступа к
секретам.

## Bidirectional `Stream`

Каждый вызов `Stream` создаёт отдельный двунаправленный gRPC stream. L4 lifecycle
состоит из typed open/data/close сообщений: TCP использует один gRPC stream на
соединение, UDP — один stream на datagram. Data передаёт raw bytes и явное
направление; TCP bytes не преобразуются в текст и UDP datagram не разбивается
или не объединяется с соседними datagram. Ограниченный JSON-контекст открытия
содержит только metadata соединения, не socket handle, filesystem path или
секреты. Поля, enum-ы, правила валидации и примеры задаются только в
`pluginprotocol` proto и versioned schema. gRPC flow control обеспечивает
bounded backpressure, а context cancellation завершает stream с обеих сторон.

Logs/metrics/live-operation events не смешиваются с capability response payload;
их envelopes определяются отдельными stream message variants. Ни события, ни
ошибки не должны содержать cookies, Authorization, service key, raw secret,
private key или grant handle.

## Payload, ошибки и conformance

gRPC message size ограничивается до decode; для unary capability сохраняется
лимит payload v1 **10 MiB**, а для одного stream message — **1 MiB**. Эти лимиты
применяются к protobuf message/payload, а не к удалённому custom frame. Точный
field shape и JSON Schema публикуются из `pluginprotocol/contracts/`.

Совместимость проверяется protobuf service/message descriptors и TypeScript
conformance tests для JSON schemas и примеров capability payload. Golden-векторы
сырого wire hex от framing v1 выводятся из эксплуатации: они не являются
контрактом gRPC. Gateway v1 golden vectors остаются только для наблюдаемого
поведения Gateway и не кодируют protobuf wire bytes.

Реализацию проверяют через `go vet ./...`, `go build ./...`, `make check`,
TypeScript suites, а также реальный child-process plugin в integration tests на
macOS/Linux. `grpcurl` и reflection применяются для диагностики, а не вместо
автоматических conformance-тестов.
