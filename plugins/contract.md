# Контракт протокола

Контракт между gateway и плагином. Плагин — отдельный кроссплатформенный
binary; gateway сам запускает instance и передаёт порт через аргументы.
Канонический wire-спецификация — [Plugin protocol](/architecture/protocol);
здесь — выжимка, которой достаточно автору плагина.

## Transport

- localhost TCP, bind только на loopback;
- gateway заранее выбирает свободный порт и передаёт плагину через
  аргументы: `--port <port>` обязателен, `--config <path>` — опциональный
  путь к конфигу instance;
- protobuf messages **без gRPC**;
- length-prefixed binary frames, multiplexing по request ID и stream ID;
- никакого HTTP/gRPC/UDP.

## Методы протокола

| Метод | Куда | Назначение |
| --- | --- | --- |
| `manifest` | gateway → plugin | имя, версия, protocol, capabilities |
| `health` | gateway → plugin | `{ready: true}` |
| `config.schema` | gateway → plugin | YAML-схема конфигурации |
| `config.apply` | gateway → plugin | применить runtime-конфиг (payload — содержимое файла) |
| `shutdown` | gateway → plugin | graceful stop |
| бизнес-методы | gateway ↔ plugin | объявленные capabilities (unary / stream) |

## Фрейм

Каждый фрейм:

- 4-байтовый BigEndian length-префикс;
- protobuf `Frame` с полями `kind`, `request_id`, `stream_id` и payload —
  protobuf `Envelope` (method, capability, metadata, payload, error).

Frame kind: `CALL` / `CALL_RESULT` / `STREAM_OPEN` / `STREAM_DATA` /
`STREAM_CLOSE` / `CANCEL` / `EVENT` (протокольный лог) / `ERROR`.

Гейтway устанавливает лимиты `MaxPayloadBytes`, `CallTimeoutMillis`,
`MaxFrameBytes` — превышение трактуется как protocol violation.

## Streams

Поддерживаются все четыре направления обмена:

- unary `Call`;
- client stream;
- server stream;
- bidirectional stream.

Отмена: gateway шлёт `CANCEL` (или закрывает соединение), плагин обязан
уважать контекст. Backpressure — плагин не обязан буферизовать бесконечно:
gateway приостанавливает отправку, если плагин не успевает.

## Protocol logs

Протокольные события (`EVENT`) передаются gateway отдельными сообщениями и
не смешиваются с payload бизнес-вызовов. stdout/stderr плагина идут в
системный stderr и доступны через `GET /api/plugins/{id}/logs` (кольцевой
буфер на 200 строк).

## Typed errors → HTTP

Ошибка плагина — protobuf `Error{code, message, retryable}`. Gateway
преобразует её в согласованный HTTP-ответ:

| Ситуация | HTTP |
| --- | --- |
| startup failure / timeout | 503 |
| disconnect / call timeout | 503 / 504 |
| protocol violation / malformed / oversized frame | 502 |
| plugin internal error | 502 |

`retryable` плагина — сигнал gateway про повтор; клиент всегда получает
согласованный 5xx.

## Соблюдение протокола

- Плагин обязан открыть сокет на `127.0.0.1:<port>` к моменту
  `startTimeout` и ответить на `health`/`manifest`.
- Manifest плагина должен совпадать с декларацией в `gateway.yaml`
  (name, protocol, capabilities).
- `config.apply` должен вернуть `{"applied": true}`.
- Плагин должен корректно завершаться по `shutdown` / `SIGTERM`.