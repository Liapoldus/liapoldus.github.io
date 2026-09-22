# HTTP runtime

Канонический исполнимый контракт HTTP — <a href="/spec/http-runtime.json" target="_blank" rel="noopener">http-runtime.json</a>.
Он определяет defaults, порядок pipeline, routing precedence, proxy/static,
MIME, conditional/range, CORS, cache, compression, HTTP/2 и HTTP/3 limits.
Markdown-страница не расширяет этот контракт.

## Порядок обработки

![Порядок обработки HTTP-запроса](/diagrams/http-request-lifecycle.svg)

Если route не совпал, Gateway отвечает `404 route_not_found`. Если policy
отказала, terminal target не вызывается. Ошибка любого этапа использует
`application/problem+json` из [Gateway API](/gateway/api/).

## Static и SPA

Release-root — единственная filesystem-граница: decoded path нормализуется;
`..`, NUL, absolute path и symlink за пределы release дают `404`. Directory
listing всегда выключен. Для директории ищется `<path>/<index>`; MIME выбирается
по расширению, неизвестный тип — `application/octet-stream`.

`spa: true` возвращает `index` для `GET` и `HEAD`, независимо от значения
`Accept`, если путь не содержит расширения файла и static lookup дал `404`.
Он не маскирует `403`, `5xx`, API/proxy routes и отсутствующие assets.

Gateway поддерживает `ETag`, `Last-Modified`, `If-None-Match`,
`If-Modified-Since`, byte `Range` и `HEAD`; точный формат ETag и поведение
single/multipart range определяет контракт.

Для ответа с подходящим `Accept-Encoding: gzip` Gateway применяет gzip после
раздачи статического содержимого и выставляет `Content-Encoding: gzip` и
`Vary: Accept-Encoding`. `/healthz` принимает только `GET` и `HEAD`.

## Transforms

`rewrite` выполняется единожды. Группы регулярного выражения доступны как
`${1}`, `${2}` и не считаются переменными конфигурации. Преобразования response выполняются после
terminal target. Условия, priority и порядок policy описаны в contract;
синтаксис полей — в [gateway.schema.json](gateway-schema).
