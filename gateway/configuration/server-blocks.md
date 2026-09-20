# Server-блоки

Один или несколько `server`; выбор блока — по `serverName` (Host), fallback —
первый блок слушателя.

:::tabs
== Статический сайт из registry

```yaml
server:
  - serverName: ["blog.localhost"]  # hosts (алиас: hosts:)
    site: blog                      # корень = registry/sites/blog/current
    index: index.html
    languages: [ru, en]
    defaultLang: ru
    compression: brotli             # gzip | brotli | off
    cache:                          # Cache-Control для статики и index
      static: "public, max-age=3600"
      index: "no-cache"
    prev: true                      # публичный /__prev/ (сверка перед откатом)
```

== Reverse proxy и маршруты

```yaml
server:
  - serverName: ["api.localhost"]
    proxyPass: "http://127.0.0.1:8080"  # reverse-proxy (путь не меняется)
    redirects:
      - from: /old
        to: /new
        status: 301
    routes:
      - matcher: /api/*
        target: https://backend.example
    apiRoutes:                        # внешний capability поверх HTTP
      - methods: [POST]
        path: /api/forms/submit
        plugin:
          instance: forms-db
          capability: forms.submit
```

== TLS и HTTP/2

```yaml
server:
  - listen: "18443"
    serverName: ["secure.localhost"]
    site: blog
    tls:
      certFile: ./tls/blog.crt
      keyFile: ./tls/blog.key
    http2: true                 # при TLS — ALPN h2; на голом HTTP — h2c
```
:::

## Справочник ключей блока

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `listen` | порт блока (пусто = корневой `listen`) | корневой порт |
| `serverName` | Host-маски для выбора блока (алиас: `hosts`) | — |
| `site` | сайт из registry: `sites/<slug>/current` | — |
| `root` | альтернатива: прямой каталог статики | — |
| `proxyPass` | backend reverse-proxy (путь не меняется) | — |
| `index` | индексный файл | `index.html` |
| `spa` | fallback в `index` для SPA | `false` |
| `prev` | публичный `/__prev/` (сверка перед откатом) | `false` |
| `languages` / `defaultLang` | языки сайта и язык по умолчанию | — |
| `redirects` | `from → to` + `status` | `[]` |
| `routes` | маршруты `matcher → target` | `[]` |
| `apiRoutes` | вызовы capability поверх HTTP (`methods`, `path`, `plugin`) | `[]` |
| `compression` | `gzip` / `brotli` / `off` | — |
| `cache` | Cache-Control для `static` и `index` | — |
| `http2` | h2c на голом HTTP; при TLS — ALPN h2 (nil = включён) | включён |
| `tls.certFile` / `keyFile` | сертификат блока | отключён |

Security-заголовки, rate limit и CORS задаются в том же блоке — смотри
[Безопасность](security).

## Имплицитные сайты из registry

Сайт с `<registry>/sites/<slug>/config.yaml` автоматически получает
**имплицитный** server на listen по умолчанию с хостами из конфига. Явный
`server` с тем же `site` переопределяет имплицитный (свой порт, TLS, proxyPass
и т.д.).