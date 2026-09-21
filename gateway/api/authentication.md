# Аутентификация API

`/healthz` доступен без учётных данных. Все `/api/*` требуют service key с
единственной ролью `platform-admin`.

## Передача ключа

```http
Authorization: Bearer lpgw_<account>_<secret>
```

Ключ показывается ровно один раз при `gateway accounts create` или `rotate`.
В `gateway.yaml` хранится только bcrypt hash с cost `12`; raw key не попадает
в config, logs, audit или API.

| Ситуация | Ответ |
| --- | --- |
| Нет Bearer token | `401` `invalid_token` |
| Ключ отозван или не совпал | `401` `invalid_token` |
| Роль не разрешена | `403` `forbidden` |
| API выключен | соединение не устанавливается |

## Локальный статический токен

`management.staticToken` — ссылка `env:` или `file:` на token для
изолированного запуска на loopback. Он несовместим с `serviceAccounts` и не
допустим на non-loopback address. Для production используются service accounts.

## Конфигурация аккаунта

```yaml
management:
  serviceAccounts:
    - id: deploy
      role: platform-admin
      keyHash: file:/run/secrets/deploy-key.bcrypt
```

Создание, rotate и revoke выполняет только CLI: [accounts](/gateway/cli/accounts).
