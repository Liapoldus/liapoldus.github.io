# Существующие plugins

| Plugin | Назначение |
| --- | --- |
| [forms-db](/plugins/forms-db) | сохранение и управление отправками форм |
| [captcha](/plugins/captcha) | verification challenge providers |
| [Identity plugin](/plugins/identity) | browser identity flows и token/session lifecycle |

Gateway управляет plugin trust и разрешёнными identities; Caddy handler
устанавливает защищённое data-plane соединение непосредственно с plugin.

## Статус локального каркаса

Для предметных plugins созданы runnable skeletons в каталоге
`/Users/docup/Projects/Liapoldus Engine/plugins/`. Каждый каталог является
отдельной локальной Git-репозиторией и использует текущий `core` и
`pluginprotocol` без их изменения.

| Plugin | Состояние каркаса | Local smoke |
| --- | --- | --- |
| `forms-db` | gRPC lifecycle, forms capabilities, deterministic memory repository | `tests/gateway_smoke.sh` |
| `captcha` | gRPC lifecycle, `captcha.verify`, deterministic provider | `tests/gateway_smoke.sh` |
| `identity` | gRPC lifecycle, declared identity capabilities, deterministic provider | `tests/gateway_smoke.sh` |

Каркас не является production-реализацией SQLite/PostgreSQL/MySQL, внешних
captcha-провайдеров или OAuth/OIDC. Для локальной проверки нужны соседние
репозитории `core` и `pluginprotocol`. Remote plugins используют тот же
versioned protocol; их deployment окружение управляется отдельно.
