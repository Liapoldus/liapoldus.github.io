# Язык `gateway.yaml`

`gateway.yaml` — декларативный язык: Gateway собирает все include, раскрывает
ссылки, валидирует граф и только затем применяет новый snapshot. Неизвестное
поле, неразрешённая ссылка или конфликт имени не меняют работающий runtime.

## Корневые поля

| Поле | Назначение | Поведение |
| --- | --- | --- |
| `includes` | YAML-файлы и glob | раскрываются относительно файла, по лексикографическому порядку |
| `variables` | строковые значения | подставляются как `${name}` только в значения строк |
| `secrets` | именованные `env:`/`file:` ссылки | plaintext запрещён; значение не сериализуется обратно |
| `registry` | диск releases, audit и TLS | `path` обязателен, если есть site или TLS storage |
| `sites` | named static sources | `release` registry или `directory` local root |
| `listeners` | публичные HTTP/TCP/UDP sockets | один name — один listener; конфликт address не применяется |
| `upstreams` | target groups proxy | targets, discovery, health, balance и retry |
| `tlsProfiles`, `tlsIssuers` | сертификаты и TLS | profile назначается listener, issuer выдаёт material |
| `authPolicies`, `wafPolicies`, `rateLimits` | политики | route ссылается по имени; порядок всегда auth → WAF → limit |
| `dataProviders`, `captchaProviders` | внешние security resources | доступны только явно назначенной политике |
| `plugins` | отдельные plugin processes | binary, capabilities, limits и grants |
| `management` | control-plane listener | listener, accounts или local static token |
| `logging`, `metrics`, `tracing` | export telemetry | runtime traffic не зависит от exporter |

## Формы значений

| Форма | Использование |
| --- | --- |
| `name` | `[a-z][a-z0-9-]{0,62}`; ключ именованного ресурса |
| duration | целое число + `ms`, `s`, `m`, `h` или `d` |
| size | bytes или `KiB`/`MiB`/`GiB` |
| reference | name существующего ресурса, например `auth: users` |
| matcher | scalar exact match, список либо object `exact`/`prefix`/`regex` |

Полные типы, required, defaults и validation constraints — в
<a href="/spec/gateway.schema.json" target="_blank" rel="noopener">gateway.schema.json</a>.
