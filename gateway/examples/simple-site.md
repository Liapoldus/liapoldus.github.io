# Простой сайт: статика из registry

Самый простой вариант: сайт раздаётся из registry-каталога, хосты берутся из
персонального конфига сайта (unified schema). Настроим редирект, сжатие и
кэш-заголовки.

## 1. Структура registry

```text
data/registry/sites/blog/
├── current/
│   ├── index.html
│   └── assets/app.css
└── config.yaml
```

## 2. Конфиг сайта

`data/registry/sites/blog/config.yaml`:

```yaml
slug: blog
hosts: [blog.localhost, localhost]
languages: [ru]
defaultLang: ru
loginRequired: false
redirects:
  - from: /start
    to: /
    status: 302
```

Хосты из `config.yaml` автоматически дают сайту **имплицитный** server на порту
по умолчанию из корневого `listen`. Явный `server` (см. ниже) переопределяет его.

## 3. gateway.yaml

```yaml
instance:
  mode: gateway
  name: Example blog

registry: ./data/registry
listen: "18080"

management:
  enabled: true
  port: "18090"
  token: ""

server:
  - serverName: [blog.localhost, localhost]
    site: blog
    index: index.html
    compression: brotli          # gzip | brotli | off
    cache:
      static: "public, max-age=3600"
      index: "no-cache"
```

## 4. Запуск и проверка

```bash
./bin/gateway serve --config gateway.yaml

curl -H 'Host: blog.localhost' http://localhost:18080/
# -> содержимое current/index.html, Cache-Control: no-cache

curl -IH 'Host: blog.localhost' http://localhost:18080/assets/app.css
# -> Cache-Control: public, max-age=3600, Content-Encoding: br

curl -I http://localhost:18080/start
# -> HTTP/1.1 302 Found, Location: /
```

Что обратить внимание:

- `Location` редиректа считается относительно хоста запроса.
- Сжатие применяется, только если клиент прислал соответствующий
  `Accept-Encoding`; `gzip`/`brotli` настраивается на уровне server-блока.
- `prev: true` добавит публичный `/__prev/` — сверку перед откатом на
  предыдущую версию.