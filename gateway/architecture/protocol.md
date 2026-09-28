# Plugin protocol: границы и порядок взаимодействия

Страница фиксирует архитектурное использование протокола Gateway. Единственный
владелец wire/API и SDK — репозиторий
[`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol): там находятся
`.proto`, JSON schemas, capability contracts, ошибки и conformance vectors.
VitePress намеренно не копирует структуры protobuf и payload schemas.
Go consumers используют только публичную SDK-точку входа
`github.com/Liapoldus/pluginprotocol/presentation/sdk`; внутренние слои
библиотеки и generated transport types не являются самостоятельными
интеграционными API. Структура слоёв описана в
[`README pluginprotocol`](https://github.com/Liapoldus/pluginprotocol#структура-sdk).

Целевая архитектура всей системы описана в
[канонической странице Gateway](target), последовательность подключения
процессов — в [plugin deployment](plugin-deployment), а незавершённые SDK-задачи
— в [TODO pluginprotocol](https://github.com/Liapoldus/pluginprotocol/blob/main/TODO.md).

## Владение

| Область | Владелец | Граница |
| --- | --- | --- |
| Manifest, capability modes, versioned JSON payloads | Plugin + `pluginprotocol` | Core проверяет опубликованные схемы/дескрипторы общим кодом; в Core нет веток конкретного plugin или capability. |
| gRPC transport, server/client, typed handler registry | `pluginprotocol` | SDK предоставляет единый путь регистрации и lifecycle для supervised и external deployments. |
| Workload mTLS, credentials, health, revocation | `pluginprotocol` | SDK выполняет handshake и fail-closed проверку; Core не CA и не хранит private keys. |
| Desired settings и policies | Core | Core хранит их в SQLite и отправляет через typed push RPC; plugin ничего не pull-ит. |
| Plugin business behavior и runtime state | Соответствующий plugin | Plugin превращает собственные settings в in-memory runtime; Core знает только общий контракт. |
| Public traffic | Caddy plugin | Caddy напрямую вызывает подключённые capabilities; Management API не участвует в traffic path. |

## Connection и готовность replica

Для обеих моделей deployment используется один namespace
`liapoldus.plugin.v1`, gRPC поверх HTTP/2 и один handshake. Локальный транспорт
не означает альтернативный plaintext protocol: local supervised launch
использует временную workload identity SDK, доставляемую по приватному
inherited bootstrap channel, и после него workload RPC защищены mTLS. Для
межмашинных connections применяется внешне выданная workload identity.

Для каждого instance lifecycle имеет следующий смысловой порядок:

1. Установить защищённый control connection и передать только operational
   bootstrap metadata через typed `Bootstrap`.
2. Получить `Manifest`; проверить plugin/release identity и объявленные
   capability→invocation-mode пары.
3. Получить `ConfigSchema`; провалидировать Core-owned desired settings без
   интерпретации product fields.
4. Передать полную активируемую JSON revision через `ConfigApply`; дождаться
   точного revision/digest acknowledgement.
5. Передавать полный desired `DispatchApply` generation каждой replica,
   дождаться acknowledgement, связанного с TLS-identity конкретной replica.
6. Проверить стандартный `grpc.health.v1`. До завершения обязательных шагов
   replica исключена из Ready set и из соответствующих dispatch bindings.

Порядок поколений/реплик и исключения при reconnect подробно заданы в
единственном protocol source. Ключевые правила: повторная connection выполняет
полный TLS и handshake заново; Core не принимает ответ load-balanced Service за
ack каждой replica; Call с неизвестным outcome не повторяется автоматически;
оборванный Stream закрывается. Изменение plugin membership выполняет оператор
через Core API, а не через оркестраторный API из Core.

## `ConfigApply` и grants

`ConfigApply` — направление Gateway → plugin. Запрос содержит полную
versioned JSON configuration, revision/generation metadata и только opaque
references на секреты. Plugin проверяет candidate полностью, атомарно заменяет
in-memory settings и подтверждает точную revision и digest. Он не получает
application settings через environment variables, командную строку или
application configuration files; SDK не должен реализовывать скрытый pull
settings.

Секретные bytes не входят в Manifest, Bootstrap, ConfigApply, logs или ответы.
Core разрешает secret reference и выдаёт scoped grant только для заранее
авторизованного назначения. Долгоживущая конфигурационная зависимость может
использовать grant, ограниченный instance и settings revision; операция или
вызов использует более узкий grant. Plugin хранит раскрытое значение только в
памяти и прекращает его использовать после неуспешной активации/замены revision
или shutdown согласно lifecycle-контракту. Формат grant, redemption и redaction
не дублируются здесь.

## `DispatchApply` и прямые вызовы

Core — control plane authorization decision owner, но не proxy capability
payload. Он сохраняет deny-by-default rules вида
`caller instance → target instance / capability / mode`, разрешает endpoint и
ожидаемую identity каждого peer, затем отправляет полный монотонный generation
через `DispatchApply`.

Каждая target replica проверяет собственную identity, capability/mode из своего
Manifest, settings/release digests и целостность generation, затем атомарно
заменяет активный inbound scope. ACK привязан к данной replica. SDK выдаёт
caller-у peer client только на подтверждённые target identities/endpoints;
запрещённые или устаревшие связи закрываются. Payload идёт напрямую между
plugins по workload mTLS. Caddy plugin использует тот же общий peer/dispatch
механизм для вызовов, заданных его собственным settings contract.

При удалении endpoint сначала исключаются новые вызовы, затем выполняется
ограниченный drain активных connections и подтверждается новое поколение.
Недоступность участника оставляет generation pending/failed и деградирует
только зависимые bindings. Core не обещает exactly-once исполнение пользовательского
Call и не replay-ит запрос с неизвестным исходом.

## Unary `Call` и bidirectional `Stream`

`Call` обслуживает ограниченный конечный request/response. Capability payload
остаётся версионированным JSON; Protobuf определяет транспортную оболочку, а
не отдельные DTO для каждой бизнес-функции. HTTP/L4 context, response actions,
ошибки, cookie filtering/redaction и grants остаются типизированными
versioned contracts pluginprotocol.

`Stream` применяется для конечных по соединению, но потенциально долгих
двунаправленных операций: HTTP body chunks и response chunks, WebSocket
message boundaries, structured SSE events и L4 TCP/UDP. Caddy выполняет HTTP
и WebSocket framing/handshake responsibilities; plugin возвращает только
согласованные protocol actions. Точные Open/Data/Close состояния, размеры,
порядок кадров, лимиты и backpressure определяются protocol contracts и не
дублируются в VitePress.

Обязательные runtime properties:

- body-size accounting использует фактически принятые bytes, включая chunked;
- long-lived streams имеют отдельные concurrency, idle-timeout и max-duration
  limits, независимые от unary deadline;
- gRPC flow control создаёт bounded backpressure; cancellation/disconnect
  распространяется на handler;
- response-start/actions проходят полную валидацию до headers или WebSocket
  upgrade; после commit ответа ошибка только закрывает stream, не подменяет
  status/body;
- при логировании и audit значения cookies, Authorization, secret bytes,
  private keys, grant handles и чувствительное содержимое редактируются.

## Workload TLS и отзыв identity

SDK предоставляет TLS server/client lifecycle, identity verification и
credential providers. Для remote workloads используются externally provisioned
PEM credentials или SPIFFE Workload API; Gateway не выдаёт сертификаты и не
совмещает workload trust с Management API trust. Signed CRL bundle доставляет
внешний оператор: invalid, stale, expired, rollback или revoked state
обрабатывается fail-closed. После принятого изменения/истечения CRL SDK закрывает
затронутые активные connections; reconnect требует полного нового handshake.
Insecure fallback и plaintext downgrade запрещены.

Точная структура identity, revocation, rotation и SDK API задаётся только в
[`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol), включая
[remote deployment](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/remote-deployment.json)
и [remote revocation](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/remote-revocation.json).

## Доказательства и текущая готовность

Protocol conformance отдельно доказывает корректность SDK/transport; Core tests
доказывают composition, а child-process plugin tests — реальное межпроцессное
поведение. Наличие Manifest или unit test не считается доказательством полного
Core runtime lifecycle. Требуемые cross-repository сценарии и команды собраны
в [матрице приёмки](../configuration/acceptance), фактические открытые задачи —
в [Core TODO](https://github.com/Liapoldus/core/blob/main/TODO.md) и
[protocol TODO](https://github.com/Liapoldus/pluginprotocol/blob/main/TODO.md).
