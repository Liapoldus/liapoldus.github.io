# Маршруты и условия

HTTP-listener содержит упорядоченный список `routes`. Gateway берёт первое
правило с истинным `when`; если оно отсутствует, используется `else` правила
или `default`. Это единственная условная логика в YAML: она не исполняет код,
не имеет циклов и валидируется при загрузке.

```yaml
listeners:
  api:
    type: http
    address: ':443'
    tls: public
    routes:
      - when:
          host: api.example.com
          method: [GET, POST]
          path: { regex: '^/users(?:/[^/]+)?$' }
          headers: { x-client: { exists: true } }
        then:
          proxy: app-api
          auth: users
          waf: public
          rateLimit: public-api
          headers: { request: { set: { x-gateway: liapoldus } } }
        else:
          deny: { status: 404 }
      - when: { path: { prefix: / } }
        then: { site: blog, spa: true }
```

## Условия `when`

| Поле | Применяется к | Значение |
| --- | --- | --- |
| `host`, `method`, `path` | HTTP | строка, список, `{prefix}`, `{exact}`, `{regex}` |
| `headers`, `query` | HTTP | наличие, exact, regex, список значений |
| `sourceIp`, `destinationPort` | HTTP/L4 | CIDR, IP, порт или диапазон |
| `sni`, `alpn`, `tls` | TLS/TCP | имя, список ALPN, `{enabled: true}` |
| `requestSize`, `connectionAge` | HTTP/L4 | `{gt}`, `{gte}`, `{lt}`, `{lte}` |
| `all`, `any`, `not` | все | композиция условий |

Регулярные выражения используют безопасный RE2-совместимый синтаксис. Они
компилируются вместе с итоговым YAML; ошибка содержит путь наподобие
`listeners.api.routes[0].when.path.regex`.

## Действия `then` и `else`

| Действие | Результат |
| --- | --- |
| `site` | раздаёт опубликованный сайт из registry |
| `proxy` | отправляет HTTP-запрос в upstream-группу |
| `redirect` | отвечает redirect, при необходимости изменяя scheme/host/path |
| `plugin` | передаёт разрешённый запрос в capability plugin instance |
| `deny`, `challenge` | прекращает запрос или запускает policy challenge |
| `auth`, `waf`, `rateLimit` | применяет именованную политику до основного действия |
| `headers`, `cache`, `compression`, `rewrite` | меняет обработку HTTP в пределах правила |

В одном действии допустим ровно один terminal target: `site`, `proxy`,
`redirect`, `plugin` или `deny`. Политики и преобразования дополняют target,
а не заменяют его.

## HTTP-функции ядра

Gateway встроенно поддерживает static files, SPA fallback, reverse proxy,
WebSocket upgrade, redirects/rewrites, headers, CORS, compression, cache,
health checks, балансировку, WAF, JWT/OIDC/mTLS и access logs. Прикладная
операция, например запись формы или обработка peer-протокола, выполняется
плагином через `plugin` target.
