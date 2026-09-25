# Bootstrap `gateway.yaml`

`gateway.yaml` — небольшой startup contract, а не описание traffic routes.
Его полная схема: [`gateway.schema.json`](/spec/gateway.schema.json). Все
listeners, sites, proxy rules, TLS automation и L4 configuration задаются
нативным Caddyfile, который хранится в group revisions.

## Область bootstrap

Разрешены только четыре блока:

| Блок | Назначение |
| --- | --- |
| `state` | SQLite database path и служебные параметры долговременного состояния. |
| `artifacts` | Корень immutable group revisions, uploads и checkpoints. |
| `management` | Отдельный bind API, TLS server identity, optional clientCA для non-loopback mTLS и request limits. |
| `caddy` | `embedded` либо `external`; для external — путь к compatible custom Caddy binary и проверяемый build identity. |

Не допускаются `includes`, переменные/подстановки общего назначения, sites,
listeners, routes, upstreams, plugin declarations/settings, `site.yaml`,
route/policy DSL и локальные secret values. Неизвестное поле отклоняется.

## Минимальный пример

```yaml
state:
  path: ./data/gateway.db
artifacts:
  path: ./data/artifacts
management:
  listen: 127.0.0.1:9090
  tls:
    certificate: file:/run/secrets/gateway-management.crt
    key: file:/run/secrets/gateway-management.key
caddy:
  variant: embedded
```

Для любого Management bind обязательны TLS server certificate/key и
Bearer-аутентификация. Service-key verifiers и их lifecycle metadata хранятся
в SQLite; отдельного verifier-файла или raw key в YAML нет. Первичный ключ
создаётся локальной командой `gateway access bootstrap`, а raw token выводится
только один раз. До создания хотя бы одного действующего ключа все
авторизованные Management endpoints закрыты (`401`); анонимный fallback
запрещён. Для literal loopback IP (`127.0.0.0/8` или `::1`) `clientCA`
не указывается: Desktop SSH bridge подключается только через restricted
OpenSSH/bastion port-forward и проверяет server identity. Для любого другого
bind, включая hostname и wildcard address, необходимы private network/VPN,
`clientCA` для mTLS и Bearer authorization одновременно.
Публичный
interface или публичный website listener для Management API запрещён. При `external`
`caddy.binary` должен указывать на совместимый Liapoldus custom build; обычный
Caddy без требуемых app/module и Caddy-L4 будет отклонён при startup.

Этот пример показывает форму, но не устанавливает production defaults.
Required fields, типы, defaults, форматы reference и validation semantics
определяет schema. Секреты остаются вне YAML и передаются только как ссылки на
файлы/внешнее secret management.

## Изменения и перезапуск

`gateway.yaml` читается до открытия traffic listeners. Bootstrap settings не
редактируются Caddy Admin API и не являются group release. Изменение `state`
или `artifacts` требует остановки процесса и backup/migration процедуры;
смена Management bind/trust либо Caddy build variant требует контролируемого
restart. Нельзя молча переключать active DB или принимать downgrade на другой
Caddy module manifest.

Полный Caddyfile может изменяться отдельно через group API. Для ручной локальной
работы оператор может использовать Caddyfile файлы, но установленный runtime
всегда принимает только целую validated group composition.
