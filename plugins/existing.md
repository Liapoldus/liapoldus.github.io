# Существующие plugins

| Plugin | Назначение |
| --- | --- |
| [tls-issuer](/plugins/tls-issuer) | ACME и TLS/mTLS material через scoped control-plane capability |
| [forms-db](/plugins/forms-db) | сохранение и управление отправками форм |
| [captcha](/plugins/captcha) | verification challenge providers |
| [Identity plugin](/plugins/identity) | browser identity flows и token/session lifecycle |

Gateway по-прежнему владеет mTLS transport security.

## Статус локального каркаса

Для всех четырёх плагинов создан runnable skeleton в каталоге
`/Users/docup/Projects/Liapoldus Engine/plugins/`. Каждый каталог является
отдельной локальной Git-репозиторией и использует текущий `core` и
`pluginprotocol` без их изменения.

| Plugin | Состояние каркаса | Local smoke |
| --- | --- | --- |
| `forms-db` | gRPC lifecycle, forms capabilities, deterministic memory repository | `tests/gateway_smoke.sh` |
| `captcha` | gRPC lifecycle, `captcha.verify`, deterministic provider | `tests/gateway_smoke.sh` |
| `identity` | gRPC lifecycle, declared identity capabilities, deterministic provider | `tests/gateway_smoke.sh` |
| `tls-issuer` | gRPC lifecycle, TLS capabilities, deterministic ACME double | `tests/gateway_smoke.sh` |

Каркас не является production-реализацией SQLite/PostgreSQL/MySQL, внешних
captcha-провайдеров, OAuth/OIDC или ACME. Для локальной проверки нужны соседние
репозитории `core` и `pluginprotocol`; remote и push для plugin-репозиториев не
настроены.
