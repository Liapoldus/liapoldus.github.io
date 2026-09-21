# Ресурсы и операции

API разделён на чтение состояния, изменение snapshot и асинхронные операции.

| Группа | Методы | Назначение |
| --- | --- | --- |
| Runtime | `GET /api/status`, `/api/listeners`, `/api/upstreams`, `/api/plugins`, `/api/tls` | read-only состояние active snapshot |
| Конфигурация | `GET/PUT /api/config`, `POST /api/config/validate`, `/api/reload` | validate, compare и atomic apply |
| Registry | `GET /api/sites`, `POST /api/sites/{slug}/publish`, `/rollback` | releases и указатели `current`/`previous` |
| Plugin/TLS | `POST /api/plugins/{id}/restart`, `/api/tls/{issuer}/renew`, `/revoke` | операции с ожиданием |
| Audit | `GET /api/audit`, `GET /api/operations/{id}` | история и результат |

## Конкурентность

`PUT /api/config` принимает обязательный `If-Match: <active-digest>`. Старый
digest возвращает `409 digest_conflict`; active runtime при этом не меняется.
Publish, rollback, renew и revoke требуют `idempotencyKey` длиной 16–128 ASCII
символов. Повтор ключа для того же actor и body возвращает сохранённый ответ;
другой body даёт `409`. Запись живёт 24 часа.

## Списки и операции

Списки используют `limit` (1–100, default 50) и opaque `cursor`; клиент
передаёт `nextCursor` без разбора. Long-running вызов возвращает
`{ "operationId", "requestId" }`. Статусы: `pending`, `running`, `succeeded`,
`failed`; terminal объект содержит либо typed `result`, либо `problem`.

`GET /api/config` возвращает исходный YAML active snapshot, но secret values
заменяет `***`; ссылки `env:` и `file:` сохраняются. API никогда не выдаёт
secret, key hash, cookie, authorization header или private key.
