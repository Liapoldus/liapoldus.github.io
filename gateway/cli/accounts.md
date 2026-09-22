# accounts

Управление service accounts для Gateway API. Формат Bearer key и правила
доступа — в [аутентификации API](/gateway/api/authentication).

```bash
gateway accounts create <id> --role=platform-admin
gateway accounts rotate <id>
gateway accounts revoke <id>
```

| Флаг | Назначение |
| --- | --- |
| `--config`, `--config-dir` | выбирают config по [общему порядку](/gateway/cli/) |
| `--role` | обязательное значение `platform-admin` |

## Как это работает

- `create`/`rotate` печатают секрет **один раз**: `lpgw_<id>_<payload>`, где
  `payload` — ровно 32 случайных байта в `base64url` без padding. В файл пишется только bcrypt-хеш с cost `12`; сам секрет
  восстановить нельзя.
- `rotate` атомарно заменяет `keyHash`: старый key сразу перестаёт проходить
  Bearer-проверку. `revoke` удаляет account; `create` существующего аккаунта
  завершается exit `4`, а `rotate`/`revoke` неизвестного — exit `5`.
- Запись выполняется через временный файл и atomic rename с режимом `0600`.
  CLI создаёт каталог `secrets/accounts`, но никогда не переписывает
  `gateway.yaml`: оператор сам добавляет `keyHash: file:...`.

## Пример

```bash
gateway accounts create ops --role=platform-admin --config gateway.yaml
# service account ops created; save this key now — it will not be shown again:
# lpgw_ops_1f09c2...
```
