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

Access record содержит `timestamp`, `requestId`, `listener`, `route`, method,
host, path, status, duration и bytes. Секреты, cookies, authorization, private
keys и plugin grants redacted до записи.

## Экспорт

| Endpoint | Назначение |
| --- | --- |
| `GET /metrics` | Prometheus exposition |
| OTLP metrics | периодический export; default 15 s |
| OTLP traces | W3C Trace Context, parent-based sampling |
| `GET /api/audit` | authenticated audit pagination |

Метрики и labels, trace attributes и JSON formats определяет active contract;
см. [OpenAPI](/gateway/api/openapi) и [архитектуру](/gateway/architecture/).
