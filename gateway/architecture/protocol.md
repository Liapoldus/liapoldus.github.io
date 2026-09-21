# Plugin protocol

Transport и wire-формат взаимодействия gateway с plugin-процессами. Это
единственный способ IPC: **никакого HTTP/gRPC для plugin-протокола** и никакого
UDP (UDP не гарантирует доставку, порядок, целостность stream и backpressure).

Реализация — общая библиотека `pkg/pluginprotocol` (модуль
`liapoldus.local/pkg/pluginprotocol`), импортируемая и gateway (клиент), и
каждым плагином (сервер).

## Принципы транспорта

- **localhost TCP**, bind только на loopback; порт заранее выбирает gateway и
  передаёт плагину через `--port`.
- **protobuf messages без gRPC**: frame — protobuf-сообщение, передаваемое
  поверх TCP.
- **length-prefixed binary frames**: 4 байта big-endian длина + payload
  (поддерживает partial reads, потоковые ответы, multiplexing).
- **request ID и stream ID** для мультиплексирования параллельных вызовов на
  одном соединении.
- **cancellation, deadlines, backpressure, graceful shutdown** — встроены в
  сессию.

![Кадр plugin protocol](/diagrams/plugin-frame.svg)

Флоу чтения сессии разделяет кадры по `StreamID`/`RequestID`:

- `StreamID != 0` → в канал соответствующего stream;
- иначе → в `pending[RequestID]` для unary call;
- `EVENT` кадры (protocol logs) → в колбэк onEvent (не смешиваются с вызовами).

## FrameKind

| Значение | Имя | Назначение |
| --- | --- | --- |
| 0 | `FRAME_KIND_UNSPECIFIED` | не используется |
| 1 | `CALL` | unary вызов / начало stream `STREAM_OPEN` |
| 2 | `CALL_RESULT` | ответ на unary call |
| 3 | `STREAM_OPEN` | открытие stream |
| 4 | `STREAM_DATA` | очередной фрагмент stream |
| 5 | `STREAM_CLOSE` | завершение stream (клиент ↔ сервер) |
| 6 | `CANCEL` | отмена (в т.ч. при таймауте) |
| 7 | `EVENT` | protocol log / event (не RPC) |
| 8 | `ERROR` | реджект на старте stream |

## Нормативные сообщения

Полный wire-контракт v1, включая field numbers, `Manifest`, `ConfigSchema` и
`ConfigField`, находится в [plugin.proto](/spec/plugin.proto). Payload
бизнес-вызова — JSON согласно capability contract; unary payload ограничен
10 MiB, frame — 1 MiB, большие данные передаются `STREAM_DATA` фрагментами.

## Методы протокола

| Метод | Тип | Назначение |
| --- | --- | --- |
| `manifest` | unary | self-description: имя и capabilities |
| `health` | unary | `{ready: true}` — готовность |
| `config.schema` | unary | YAML-схема конфига плагина |
| `config.apply` | unary | применить runtime-конфиг (payload — содержимое файла) |
| `shutdown` | unary | graceful stop (`{closed: true}`) |
| `*` (бизнес) | unary или stream | объявленные capabilities плагина |

`manifest`, `health`, `config.schema`, `config.apply`, `shutdown` — только
unary: попытка открыть по ним stream отклоняется `ERROR` с кодом
`invalid_stream_method`. Runtime конфигурация плагина — часть `gateway.yaml`;
при запуске/reload она передаётся плагину через `config.apply`.

Protocol logs: плагин шлёт `EVENT`-кадры с payload `{"level","message",
"fields"}` (уровни `debug|info|warn|error`); gateway видит их отдельными
сообщениями и не путает с ответами на вызовы.

## Startup handshake и grants

Gateway выбирает свободный loopback port, запускает plugin c `--port`, затем в
рамках `startTimeout: 10s` строго вызывает `manifest`, `health`,
`config.schema`, `config.apply`. Только после `{"applied":true}` instance
становится ready. `manifest` обязан вернуть
`{"name":"…","capabilities":["…"]}`; `health` — `{"ready":true}`;
`config.schema` — `{"fields":[…]}`; `shutdown` — `{"closed":true}`.
Name/capabilities, не совпадающие с `gateway.yaml`, invalid JSON, timeout или
любая error response дают `protocol_violation`/`plugin_unavailable` и instance
не получает трафик.

Grant передаётся только control-plane call как
`{"id":"grant_…","kind":"storage|secret","purpose":"…","expiresAt":"RFC3339","handle":"opaque"}`.
Gateway создаёт его для указанного instance/capability, отзываёт сразу после
call независимо от результата и не передаёт filesystem path или raw secret в
metadata. Memory limit измеряется RSS процесса каждые 1 s; превышение 256 MiB
(или `limits.memory`) отменяет calls, завершает process и даёт
`resource_exhausted`.

## Unary call

![Unary call plugin protocol](/diagrams/plugin-unary-call.svg)

Лимиты сессии: `MaxPayloadBytes` (ошибка `payload_too_large`),
`CallTimeoutMillis` (авт. deadline через context), `MaxFrameBytes`
(`frame_too_large`, проверяется при отправке).

## Streams

Одно соединение мультиплексирует многоstream параллельно. Stream-ид
присваивается gateway; все фреймы stream несут `StreamID`.

![Stream plugin protocol](/diagrams/plugin-stream.svg)

- `STREAM_OPEN` → сервер сам решает: ответить данными или `ERROR` (rejected).
- `STREAM_DATA` — фрагмент потока (client→server и server→client одновременно:
  bidirectional).
- `STREAM_CLOSE` с одной стороны — сигнал `io.EOF` получателю.
- `CANCEL` — отмена (по таймауту/запросу); не считается штатным завершением.
- Backpressure: сессия имеет конечный буфер в 1 MiB на stream + TCP flow
  control. Запись блокируется до освобождения буфера или context cancellation;
  бесконечная буферизация запрещена.

## L4 sessions и UDP flows

После выбора YAML-rule Gateway открывает capability session для TCP либо
datagram flow для UDP. Gateway остаётся владельцем публичного socket, лимитов,
TLS и маршрутизации; plugin получает только поток/датаграммы и разрешённый
контекст. Плагин не открывает listener и не определяет сетевую политику.

TCP session использует bidirectional stream с lifecycle connect → data → close.
UDP flow использует сообщения datagram → result до flow idle timeout. Отмена,
backpressure, payload limits и typed errors соответствуют общему protocol
contract.

TCP `STREAM_OPEN` payload: `{"kind":"tcp","source":"ip:port",
"destination":"ip:port","sni":"…","alpn":"…"}`. UDP payload:
`{"kind":"udp","source":"ip:port","destination":"ip:port","data":"base64"}`;
каждый `STREAM_DATA` содержит один datagram. Payload не содержит HTTP headers,
cookies, identity или secret, если route не выдал их явным context/grant.

## Cancellation и deadlines

- У каждой операции есть `context.Context`; default call deadline 5 s; при
  истечении deadline gateway шлёт
  `CANCEL` и возвращает `ctx.Err()`.
- `CANCEL` удаляет stream/request из таблиц мультиплексера.
- Session `Close()` рассылает `ErrSessionClosed` всем pending/stream каналам,
  закрывает TCP и дожидается завершения readLoop (graceful teardown).

## Ошибки → 5xx

Gateway классифицирует сбои и выдаёт согласованные HTTP-ответы:

| Ошибка | HTTP |
| --- | --- |
| failure запуска плагина | 502 / 503 |
| startup timeout | 503 Service Unavailable |
| connection refused / disconnect | 503 / 504 |
| call timeout | 504 Gateway Timeout |
| protocol violation / malformed frame | 502 Bad Gateway |
| oversize frame/request/response | 502/503 по типу |
| concurrency / resource limit | 503 |
| plugin internal error (`Error{code}`) | 502 |

Retryable-ошибки плагина могут повторяться собрано (gateway решает), но ответ
клиенту всегда согласованный 5xx.

## Требования к реализации

Для протокола обязательны: race-тесты, fuzz/negative tests, malformed frames,
oversized messages, concurrent calls, все направления stream, cancellation,
restart и cross-platform compile checks (macOS/Windows/Linux).
