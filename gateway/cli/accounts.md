# accounts

Управление service accounts для management API. Роли, жизненный цикл и правила
использования ключей — в [Безопасности](/gateway/configuration/security).

```bash
gateway accounts create <id> --role=platform-admin
gateway accounts rotate <id>
gateway accounts revoke <id>
```

| Флаг | Назначение |
| --- | --- |
| `--config <gateway.yaml>` | обязателен: уровень администрирования — низкий, ключи пишутся в конфиг процесса |
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
