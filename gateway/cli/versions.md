# Сайты и releases

```text
gateway site publish SLUG SOURCE [--idempotency-key KEY]
gateway site versions SLUG
gateway site current SLUG
gateway site previous SLUG
gateway site rollback SLUG [--idempotency-key KEY]
```

| Команда | Успех | Ошибка |
| --- | --- | --- |
| `publish` | новый `current`, старый `previous` | `3` invalid release, `4` lock/conflict |
| `versions` | retained `current` и `previous` | `5` site missing |
| `current` / `previous` | revision или `null` | `5` site missing |
| `rollback` | атомарно меняет ссылки местами | `5` previous missing |

`--idempotency-key` обязателен в automation; при отсутствии CLI генерирует
ключ на один вызов. `--output json` publish/rollback возвращает
`site`, `revision`, `previousRevision`, `requestId`. Source не изменяется;
Gateway хранит только две версии. Lifecycle — в [конфиге сайта](/gateway/configuration/site-config).
