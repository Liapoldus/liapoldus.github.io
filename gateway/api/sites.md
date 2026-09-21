# Sites API

`GET /api/sites` перечисляет named site resources с source type и состоянием.
Списки используют opaque `cursor` и `limit` 1–100.

| Source | Доступные операции | Guarantee |
| --- | --- | --- |
| `release` | publish, versions, rollback | immutable releases, atomic pointers |
| `directory` | read state | read-only root; без publish и rollback |

`POST /api/sites/{slug}/publish` и `/rollback` требуют idempotency key.
Повтор с тем же actor и body возвращает сохранённый результат в течение 24 h;
другой body даёт `409`. Для directory source обе операции дают `409
site_source_immutable`.
