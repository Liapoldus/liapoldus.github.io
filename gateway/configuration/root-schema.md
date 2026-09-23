# Корневые ресурсы

Корень `gateway.yaml` объявляет ресурсы процесса. Ресурс получает имя из ключа
map; route и другие ресурсы ссылаются на него по этому имени.

## Загрузка

| Поле | Тип | Назначение |
| --- | --- | --- |
| `includes` | `string[]` | дополнительные YAML-файлы или glob |
| `variables` | `map<string>` | подстановка `${name}` в строковые значения |
| `secrets` | `map<env:|file:>` | ссылочные секреты без plaintext |
| `registry.path` | path | release, audit и TLS storage |

Include раскрываются до validation. Цикл, duplicate resource name, отсутствующий
файл и unresolved reference дают `config_invalid`; active snapshot остаётся
прежним.

## Трафик и маршрутизация

| Поле | Объявляет | Использует |
| --- | --- | --- |
| `listeners` | HTTP/TCP/UDP bind и rules | OS socket |
| `sites` | release или directory static source | `then.site` |
| `upstreams` | proxy target group | `then.proxy` |
| `plugins` | supervised process/capabilities | `then.plugin` |

`listeners.<name>.type` выбирает `http`, `tcp` или `udp`. HTTP использует
`routes`, L4 — `rules`. Синтаксис и evaluation — в
[маршрутах](server-blocks) и [транспортах](transports).

## Безопасность

| Поле | Назначение |
| --- | --- |
| `tlsProfiles` | server certificates и mTLS |
| `authPolicies` | route policy → подключённая plugin capability |
| `dataProviders`, `wafPolicies` | MMDB source, WAF rules и generic capability dispatch |
| `rateLimits` | token bucket |

Все security resources именованные: объявление само по себе не защищает
трафик, пока route не укажет `auth`, `waf` или `rateLimit`.

## Управление и export

| Поле | Назначение |
| --- | --- |
| `management` | control-plane listener и service accounts |
| `logging` | JSON log sinks |
| `metrics` | Prometheus / OTLP metrics |
| `tracing` | OTLP traces и sampling |

Полные типы, defaults и ограничения — в
<a href="/spec/gateway.schema.json" target="_blank" rel="noopener">gateway.schema.json</a>.
