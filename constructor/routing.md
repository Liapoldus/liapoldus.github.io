# Routing и network canvas

React route document v1 хранится в `liapoldus/routes/{environment}.json` и
читается/сохраняется через `/api/v1/project/routes`. Save использует
ETag/`If-Match` и проверяет schema version, уникальность route ID/path, leading
slash, page reference и chunk policy до записи.

Build regenerates `src/generated/routes.tsx`: exact routes precede parameterized
routes, which precede catch-all routes. Static routes use static page imports;
lazy and separate chunk policies use dynamic imports. Route IDs in `layouts`
refer to `src/layouts/{id}.layout.tsx`; each default React component receives
its child page through `children`, and the array is composed from outermost to
innermost layout. The legacy singular `layout` field remains accepted and, if
combined with `layouts`, is treated as the outermost wrapper.

An `access` value is a kebab-case policy ID passed to the generated
`createRoutes(canAccess)` resolver. Generated protected routes render Access
denied unless the host supplies an auth-backed resolver. The scaffold defaults
to deny. This is frontend visibility; API and data access still require
server-side authorization. Route metadata, layout, access and preload references
are also carried in React Router `handle` metadata.

Constructor ведёт две разные, но сопоставленные модели: React routes и Gateway
routes. Route graph для React содержит path, page/component, layout, access,
chunk, lazy loading, preload и metadata. Constructor генерирует стандартную
React Router configuration; для типового случая developer не пишет dynamic
imports вручную.

## Chunking

Route можно пометить `same chunk`, `separate chunk`, `lazy` или `preload`.
Graph показывает принадлежность страниц chunk group и предупреждает о
неэффективной зависимости. Build сохраняет итоговую chunk map в metadata.

Generator сортирует exact before parameter before catch-all. Save требует
leading slash, unique route ID/path and valid page reference. Route содержит
Page, optional Layout chain, access reference, metadata, preload list и chunk
policy. Remove блокируется пока navigation/action ссылается на route.

## Единый запросный путь

`/products/42` проходит Browser → Gateway → Static frontend → React Router →
ProductPage. `/api/products/42` должен пройти Browser → Gateway → Products API.
Cross-validator обнаруживает перекрытие frontend route Gateway rule, отсутствие
SPA fallback, missing upstream и конфликт paths.

Network Canvas — проекция Gateway desired config, а не второй network model.
Node edit передаёт Gateway digest; conflict перезагружает graph и показывает
diff. Canvas никогда не открывает listener и не хранит TLS material.

Network canvas показывает Internet → domain → Gateway → route → upstream/static
site/plugin. Изменение route допустимо только когда Gateway API предоставляет
typed capability; иначе canvas read-only и показывает [required extension](/architecture/api-boundaries).
