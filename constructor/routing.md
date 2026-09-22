# Routing и network canvas

Constructor ведёт две разные, но сопоставленные модели: React routes и Gateway
routes. Route graph для React содержит path, page/component, layout, access,
chunk, lazy loading, preload и metadata. Constructor генерирует стандартную
React Router configuration; для типового случая developer не пишет dynamic
imports вручную.

## Chunking

Route можно пометить `same chunk`, `separate chunk`, `lazy` или `preload`.
Graph показывает принадлежность страниц chunk group и предупреждает о
неэффективной зависимости. Build сохраняет итоговую chunk map в metadata.

## Единый запросный путь

`/products/42` проходит Browser → Gateway → Static frontend → React Router →
ProductPage. `/api/products/42` должен пройти Browser → Gateway → Products API.
Cross-validator обнаруживает перекрытие frontend route Gateway rule, отсутствие
SPA fallback, missing upstream и конфликт paths.

Network canvas показывает Internet → domain → Gateway → route → upstream/static
site/plugin. Изменение route допустимо только когда Gateway API предоставляет
typed capability; иначе canvas read-only и показывает [required extension](/architecture/api-boundaries).
