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

- `create`/`rotate` печатают секрет **один раз**: `lpgw_<id>_<hex>`. В файл
  пишется только bcrypt-хеш (`keyHash`) — сам секрет восстановить нельзя.
- Запись атомарная: файл валидируется заново перед переименованием.

## Пример

```bash
gateway accounts create ops --role=platform-admin --config gateway.yaml
# service account ops created; save this key now — it will not be shown again:
# lpgw_ops_1f09c2...
```
