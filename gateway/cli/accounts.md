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

- `create`/`rotate` печатают секрет **один раз**: `lpgw_<id>_<hex>` (32 random
  bytes, base64url). В файл пишется только bcrypt-хеш с cost `12`; сам секрет
  восстановить нельзя.
- `rotate` атомарно заменяет `keyHash`: старый key сразу перестаёт проходить
  Bearer-проверку. `revoke` удаляет account; повторная операция даёт exit `5`.
- Запись атомарная: файл валидируется заново перед переименованием. Key не имеет
  TTL; срок жизни ограничивает только явный rotate/revoke.

## Пример

```bash
gateway accounts create ops --role=platform-admin --config gateway.yaml
# service account ops created; save this key now — it will not be shown again:
# lpgw_ops_1f09c2...
```
