# Аутентификация API

`/healthz` доступен без учётных данных. Все `/api/*` требуют service key с
единственной ролью `platform-admin`. Удалённый API дополнительно требует
проверенный mTLS client certificate.

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

## Listener и remote access

```yaml
management:
  listener:
    address: 0.0.0.0:9443
    tlsProfile: admin-api
```

Loopback listener не требует TLS. Для non-loopback `tlsProfile` обязателен и
должен иметь `clientAuth.mode: require`; после TLS handshake Bearer key всё
равно обязателен. Нет TLS profile — `422 management_tls_required`; нет required
client auth — `422 management_mtls_required`; нет client certificate — `401
mtls_required`.

## Локальный статический токен

`management.staticToken` — ссылка `env:` или `file:` на token для
изолированного запуска на loopback. Он несовместим с `serviceAccounts` и не
допустим на non-loopback address. Для production используются service accounts.

## Конфигурация аккаунта

```yaml
management:
  listener: { address: 127.0.0.1:9090 }
  serviceAccounts:
    - id: deploy
      role: platform-admin
      keyHash: file:/run/secrets/deploy-key.bcrypt
```

Создание, rotate и revoke выполняет только CLI: [accounts](/gateway/cli/accounts).
