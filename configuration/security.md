# Безопасность

## Management-порт

Management API — **резервированный** порт (`18090` по умолчанию), отдельный от
публичного. Аутентификация определяется по приоритету:

1. Если в `controlPlane.auth.serviceAccounts` есть записи — принимаются только
   service account API keys (`lpgw_<id>_…` + bcrypt-проверка); простой токен
   игнорируется.
2. Иначе, если задан `management.token` — Bearer-токен.
3. Иначе **только loopback** (`127.0.0.1`/`::1`/`localhost`).

Ключ из заголовка: `Authorization: Bearer <key>` → `X-API-Key` →
`X-Management-Token`.

Токен передаётся в Compose отдельной переменной (`LIAPOLDUS_MGMT_TOKEN`), а не
зашит в конфиг. `--no-management` полностью выключает порт; CLI-диагностика при
этом работает офлайн.

:warning: без токена management принимает только loopback; для доступа к mgmt
из внешней сети токен обязателен.

## Service accounts и роли

Ключи `lpgw_<id>_<hex>` (192 бита энтропии) создаёт только CLI:

```bash
gateway accounts create ops --role=platform-admin --config gateway.yaml
```

Секрет показывается **один раз**; в `gateway.yaml` пишется только bcrypt-хеш
(`keyHash`). Роли:

| Роль | Права |
| --- | --- |
| `platform-admin` | все глобальные endpoints и тенанты |
| `tenant-admin` | только `/api/tenants/<свой-id>` (проверка tenant) |

Ротация/отзыв — `gateway accounts rotate <id>` / `revoke <id>`; отзыв делает
запись неактивной, не удаляя её. Запись в конфиг атомарная, файл
перевалидируется перед переименованием.

## Публичные сайты

### Security-заголовки

```yaml
server:
  - security:
      enabled: true
      csp: "default-src 'self'"
      frame: SAMEORIGIN              # или DENY
      nosniff: true
      referrerPolicy: strict-origin-when-cross-origin
      hsts: "max-age=31536000"       # только при TLS
      httpsRedirect: true            # 301 всех HTTP-запросов на HTTPS
      httpsPort: 443                 # целевой порт для редиректа
```

`httpsRedirect` оставляет `/healthz` без редиректа и не применяется на
TLS-слушателе.

### TLS

- Минимум TLS 1.2; HTTP/2 по ALPN при TLS.
- Мульти-серт SNI-подбор по Host, fallback — первый сертификат слушателя.
- HSTS ставится только поверх TLS.

### Rate limit и CORS

```yaml
server:
  - rateLimit:
      enabled: true
      rps: 10
      burst: 20
      window: "1m"
    cors:
      enabled: true
      allowedOrigins: [https://mydomain.example]
      methods: [GET, POST, OPTIONS]
      maxAge: 600
```

При превышении — `429` с `Retry-After`. Дефолт CORS-методов: `GET,POST,OPTIONS`.

## Плагины

- TCP **только loopback**; порт выбирает gateway и передаёт через `--port`.
- Плагин не принимает соединений извне.
- `allowedHosts` captcha-плагина ограничивает исходящие вызовы провайдеров.
- Конфиг с секретами (в примерах — `secret` капчи) читается из `gateway.yaml`
  и передаётся per-call, в конфиг плагина не пишется.

## Docker

- Контейнеры `read_only` + `no-new-privileges`, не root процессы кода не
  требуют.
- Management-порт наружу — только `127.0.0.1:18090` (не публиковать в сеть).
- Токен — через env, не в образ и не в `docker compose config` по умолчанию.

## Репозиторий

- Секреты не коммитятся: `.gitignore` покрывает `*.pem`, ключи, базы в
  registry; примеры конфигов используют placeholder'ы.
- Сервисные ключи нигде не логируются: `accounts` печатает секрет только в
  момент создания/ротации.