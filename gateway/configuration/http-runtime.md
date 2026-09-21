# HTTP runtime

Эта страница задаёт каноническое поведение HTTP. Для стандартных HTTP-семантик
Gateway следует RFC; ниже перечислены правила Liapoldus и места, где
конфигурация влияет на результат.

## Порядок обработки

```mermaid
flowchart LR
  A[Request] --> B[Listener / TLS]
  B --> C[Первый matching route]
  C --> D[auth → WAF → rate limit]
  D --> E[rewrite]
  E --> F[site | proxy | plugin | redirect | deny]
  F --> G[response headers → cache → compression]
  G --> H[Response + telemetry]
```

Если route не совпал, Gateway отвечает `404 route_not_found`. Если policy
отказала, terminal target не вызывается. Ошибка любого этапа использует
`application/problem+json` из [Management API](management-api).

## Static и SPA

Release-root — единственная filesystem-граница: decoded path нормализуется;
`..`, NUL, absolute path и symlink за пределы release дают `404`. Directory
listing всегда выключен. Для директории ищется `<path>/<index>`; MIME выбирается
по расширению, неизвестный тип — `application/octet-stream`.

`spa: true` возвращает `index` только когда запрос принимает `text/html`, метод
`GET` или `HEAD`, путь не содержит расширения файла и static lookup дал `404`.
Он не маскирует `403`, `5xx`, API/proxy routes и отсутствующие assets.

Gateway поддерживает `ETag`, `Last-Modified`, `If-None-Match`,
`If-Modified-Since`, byte `Range` и `HEAD` по RFC. ETag включает immutable
release revision, поэтому publish автоматически инвалидирует cache key.

## Transforms

| Функция | Нормативное поведение |
| --- | --- |
| `rewrite` | выполняется один раз до target; regex RE2, `$1…$9`; результат обязан быть absolute path, иначе `422 rewrite_invalid` |
| `redirect` | формирует `Location` из scheme/host/path/query; default status `308`; небезопасный CR/LF запрещён |
| headers | `set`, `setIfAbsent`, `delete`; hop-by-hop headers запрещены; CORS — отдельный `cors` object |
| cache | `no-store` отключает storage; иначе формируется `Cache-Control`; `Vary` дополняется только реально использованными вариантами |
| compression | выбирает `br`, затем `gzip` по `Accept-Encoding`; только response ≥ 1 KiB без `Content-Encoding`, не для range/upgrade |
| WebSocket | proxy передаёт RFC upgrade после auth/WAF/rate limit; static и plugin не делают implicit upgrade |

HTTP request body лимит по умолчанию 10 MiB. Превышение — `413 body_too_large`.
