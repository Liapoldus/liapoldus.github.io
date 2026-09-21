# Корневая схема

Полный вид `gateway.yaml` (комментированный) и справочник корневых ключей.
Server-блоки и конфиг сайта — отдельных страницах.

```yaml
instance:                        # идентификация процесса
  mode: gateway
  name: Liapoldus gateway

registry: ./data/registry        # корень реестра сайтов

listen: "18080"                  # публичный порт по умолчанию

management:                      # резервированный порт управления
  enabled: true
  port: "18090"
  token: ""                      # пусто = только loopback

controlPlane:                    # service accounts для management API
  auth:
    serviceAccounts:
      - id: ops
        role: platform-admin     # platform-admin | tenant-admin
        keyHash: "$2a$10$..."    # bcrypt-хеш ключа lpgw_<id>_<hex>

include: ["./conf.d/*.yaml"]     # доп. конфиги (server-блоки объединяются)

tenants:                         # изолированные владельцы ресурсов
  - id: acme
    domains: [acme.localhost]

http:                            # таймауты публичных слушателей
  readTimeout: 30s
  writeTimeout: 30s
  idleTimeout: 120s
  maxHeaderBytes: 65536

logging:                         # access-лог
  access: [stdout]               # или путь к файлу
  format: json                   # json | plain

metrics:                         # наблюдаемость
  prometheus: true
  otlp:
    enabled: false
    endpoint: ""
    interval: "15s"

server:                          # серверные блоки (см. server-blocks)
  - listen: "18080"
    serverName: ["blog.localhost"]
    site: blog

plugins:                         # внешние плагины (см. «Плагины»)
  forms-db:
    manifest:
      capabilities: [forms.submit, forms.list, forms.delete]
    enabled: true
    binary: ./bin/forms-db
    config: ./conf/forms-db.yaml
```

## Справочник корневых ключей

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `instance.mode` | режим процесса: `gateway` или `single` | — |
| `instance.name` | имя процесса (в логах) | — |
| `registry` | корень реестра сайтов `sites/<slug>/…` | — |
| `listen` | публичный порт по умолчанию | — |
| `management` | порт управления + токен (`enabled` требует `port`) | выключен |
| `controlPlane.auth.serviceAccounts` | service accounts управления | `[]` |
| `include` | доп. конфиги; server-блоки объединяются | `[]` |
| `tenants` | изолированные владельцы ресурсов | `[]` |
| `http` | таймауты публичных слушателей | 30s/30s/120s/64K |
| `logging` | access-лог: `access` (куда), `format` (`json`/`plain`) | `[stdout]`, `plain` |
| `metrics` | `prometheus` (bool) + `otlp` (endpoint, interval) | выключены |
| `server` | серверные блоки | `[]` |
| `plugins` | декларации плагинов | `{}` |

> Плагины и service accounts хранятся только в корневом `gateway.yaml`,
> не в tenant include.
