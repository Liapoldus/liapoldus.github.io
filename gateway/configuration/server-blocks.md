# Маршруты и условия

HTTP-listener содержит упорядоченный список `routes`. Алгоритм без исключений:
Gateway идёт по порядку; отсутствующий `when` равен `true`; при `true` выбирает
`then`; при `false` выбирает `else`, если оно есть, иначе продолжает со
следующим route. `default` допускается только в последнем route и выбирается,
только если ни один route не выбрал terminal action. Нарушение даёт
`config_invalid`. Это единственная условная логика в YAML: она не исполняет
код и не имеет циклов.

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
        then: { site: blog }
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
| `headers`, `cache`, `compression`, `rewrite` | меняет обработку HTTP в пределах правила; `spa` задаётся только в `site.yaml` |

В одном route action допустим ровно один terminal target: `site`, `proxy`,
`redirect`, `plugin` или `deny`. Политики и преобразования дополняют target,
а не заменяют его. У WAF отдельный набор terminal actions: `allow`, `deny`,
`challenge`, `limit`; это не route target.

Точные формы matcher, proxy allow-list, request/response headers и порядок
pipeline определяют <a href="/spec/gateway.schema.json" target="_blank" rel="noopener">gateway.schema.json</a> и
<a href="/spec/http-runtime.json" target="_blank" rel="noopener">http-runtime.json</a>.

## HTTP-функции ядра

Gateway встроенно поддерживает static files, SPA fallback, reverse proxy,
WebSocket upgrade, redirects/rewrites, headers, CORS, compression, cache,
health checks, балансировку, WAF, mTLS и access logs. Identity/OIDC/JWT
выполняется plugin capability. Прикладная
операция, например запись формы или обработка peer-протокола, выполняется
плагином через `plugin` target.
