# Логи и наблюдаемость

Наблюдаемость — часть эксплуатации: exporter не влияет на обработку трафика.
Сбой sink записывается локально, а request получает свой нормальный результат.

## Хранилище

| Данные | Место | Retention |
| --- | --- | --- |
| Access/application logs | назначенный log sink | политика платформы |
| Audit JSONL | `${registry.path}/audit/YYYY-MM-DD.jsonl` | 90 дней |
| Operations | local control-plane state | 24 часа |
| Traces | внешний OTLP backend | Gateway локально не хранит |

Если `registry.path` не задан, Gateway использует `registry` рядом с активным
файлом конфигурации. Для `management.staticToken` поле `actor` содержит только
маркер `static-token`, а не credential; для service account записывается его ID.
Runtime записывает успешные и неуспешные операции `config.reload` и
`config.update`, успешный release publish (`site_published`) и успешный/неуспешный
вызов rollback (`site_rolled_back`); подключение остальных изменяющих операций
Management API отслеживается в TODO Gateway.

Access record содержит `timestamp`, `requestId`, `listener`, `route`, method,
host, path, status, duration и bytes. Секреты, cookies, authorization, private
keys и plugin grants redacted до записи.

`duration` — JSON number: прошедшие секунды с дробной частью от входа в Gateway
HTTP handler до его возврата после записи response. Поле не является
миллисекундами; машинный контракт — [`http-runtime.json`](/spec/http-runtime.json).

Если запрос не содержит `X-Request-ID`, Gateway генерирует идентификатор и
возвращает его в этом response header; заданный клиентом идентификатор
сохраняется. В `path` записывается только URL path без query string. `bytes` —
число байтов тела ответа, записанных в HTTP response после content encoding;
заголовки и request body в access record не включаются.

Access records пишутся для data-plane и Management API запросов во все sinks,
указанные в `logging.access`; если список не задан, используется `stdout`.
Событие сериализуется одной JSON-строкой.

Предупреждения application-level компонентов, включая сбой OTLP export,
пишутся в `logging.application`; default sink — `stderr`. Допустимы `stdout` и
`stderr`, можно указать несколько sinks или пустой список для отключения таких
сообщений. Export failure counter продолжает обновляться независимо от sinks.
В предупреждение не включаются endpoint, URL, содержимое ответа или transport
error.

## Экспорт

| Endpoint | Назначение |
| --- | --- |
| `GET /metrics` | Prometheus exposition |
| OTLP metrics | периодический export; default 15 s |
| OTLP traces | OTLP/HTTP protobuf; W3C Trace Context и настроенный sampling |
| `GET /api/audit` | authenticated audit pagination |

Метрики и labels, trace attributes и JSON formats определяет active contract;
см. [OpenAPI](/gateway/api/openapi) и [архитектуру](/gateway/architecture/).

`tracing.sampling` принимает `parent-based` (default), `always-on` и
`always-off`. При `parent-based` sampled флаг входного W3C `traceparent`
соблюдается; при отсутствии parent применяется always-on root sampler.
Gateway создаёт серверный span, извлекает входной trace context и передаёт
upstream дочерний `traceparent`. Span содержит только HTTP method, listener и
response status; query, headers, request/response body и endpoint exporter в
trace attributes не добавляются.
