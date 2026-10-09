# Существующие plugins

Плагины используют общий Plugin SDK для Core↔plugin lifecycle.
`pluginprotocol` предназначен только для generic plugin↔plugin взаимодействий.

| Plugin | Назначение |
| --- | --- |
| [forms-db](/plugins/forms-db) | сохранение и управление отправками форм |
| [captcha](/plugins/captcha) | verification challenge providers — полностью заморожен, вне v2 |
| [Identity plugin](/plugins/identity) | browser identity flows и token/session lifecycle — полностью заморожен, вне v2 |

Core управляет plugin trust и разрешёнными identities; Caddy handler
устанавливает защищённое data-plane соединение непосредственно с plugin.

## Продуктовые плагины

Исходный код предметных plugins находится в соседнем workspace-каталоге
`plugins/`; каждый plugin владеет своими продуктовыми контрактами и настройками.

| Plugin | Продуктовая ответственность | Lifecycle |
| --- | --- | --- |
| `forms-db` | приём и управление отправками форм | Plugin SDK REST; см. [контракт forms-db](/plugins/forms-db) |
| `captcha` | проверка CAPTCHA-токенов и публичная конфигурация виджета | Полностью заморожен; не входит в v2 |
| `identity` | browser identity flows и token/session lifecycle | Полностью заморожен; не входит в v2 |

Каждый plugin сам запрашивает у Core точную generation настроек после REST
`Reload(generation)`. Настройки передаются как исходный JSON object; Core
сохраняет исходные bytes и применяет plugin-owned JSON Schema, не интерпретируя
продуктовые поля. Для plugin↔plugin сетевого обмена плагины могут отдельно
подключить generic `pluginprotocol`; он не участвует в Core lifecycle.
