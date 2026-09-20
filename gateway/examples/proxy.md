# Reverse proxy: gateway перед бэкендом

Gateway может проксировать трафик на HTTP-бэкенд: либо весь server-блок целиком
(`proxyPass`), либо отдельные пути (`routes`) — например, `/api/*` на приложение,
а остальное раздавать статикой.

## 1. Полный прокси server-блока

Весь `blog.localhost` отдаётся приложением на `127.0.0.1:8080`:

```yaml
instance:
  mode: gateway
  name: Proxy example

registry: ./data/registry
listen: "18080"

management:
  enabled: true
  port: "18090"
  token: ""

server:
  - serverName: [app.localhost]
    proxyPass: "http://127.0.0.1:8080"
    # путь при проксировании не меняется: /articles/1 -> /articles/1
```

Проверка:

```bash
./bin/gateway serve --config gateway.yaml
curl -H 'Host: app.localhost' http://localhost:18080/health
# -> ответ бэкенда на /health
```

## 2. Статика + прокси по маршрутам

Фронтенд раздаётся из registry, а `/api/*` идёт на бэкенд. `routes` задаёт
`matcher → target` с приоритетом, `spa: true` отдаёт `index.html` на не
совпавшие с файлами пути (SPA-роутинг):

```yaml
server:
  - serverName: [spa.localhost]
    site: spa
    index: index.html
    spa: true
    routes:
      - matcher: /api/*
        target: https://backend.example
      - matcher: /media/*
        target: https://cdn.example
```

Проверка:

```bash
curl -H 'Host: spa.localhost' http://localhost:18080/
# -> index.html (статик)

curl -H 'Host: spa.localhost' http://localhost:18080/api/users
# -> ответ backend.example на /api/users (путь сохраняется)

curl -H 'Host: spa.localhost' http://localhost:18080/settings
# -> index.html (SPA-fallback, файла settings нет)
```

Примечания:

- `routes` и `proxyPass` применяются до статики; точность `matcher` задаёт
  приоритет (чем длиннее префикс/точнее маршрут — тем раньше он выбран).
- Прокси-цель может быть внешней; таймауты публичных слушателей задаются в
  корневом `http.*`.