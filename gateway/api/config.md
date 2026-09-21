# Config API

`GET /api/config` читает redacted active YAML. `POST /api/config/validate`
проверяет переданный YAML без записи. `PUT /api/config` применяет новый snapshot.

| Запрос | Защита | Результат |
| --- | --- | --- |
| `GET /api/config` | Bearer; remote также mTLS | active YAML, secrets `***`, digest |
| `POST /api/config/validate` | Bearer; remote также mTLS | diagnostics без изменения runtime |
| `PUT /api/config` | Bearer; remote также mTLS, `If-Match` | новый revision/digest |
| `POST /api/reload` | Bearer; remote также mTLS | перечитывает configured files |

`PUT` сравнивает `If-Match` с active digest. Несовпадение даёт `409
digest_conflict`; ошибка validation даёт `422`; в обоих случаях active snapshot
остаётся прежним. Полная форма тел — в [OpenAPI](openapi).
