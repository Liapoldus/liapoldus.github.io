# Общие диаграммы экосистемы

Здесь хранятся только схемы, не принадлежащие одному сервису. Диаграммы Core,
Plugin SDK, `pluginprotocol`, plugins, Constructor и React SDK живут рядом с
документацией владельца в его `docs/site/diagrams/`.

`npm run docs:sync` собирает owner sources в `.site-src/diagrams/`; SVG в
`public/diagrams/` генерируются перед сборкой и подключаются как статические
assets, поэтому Mermaid не попадает в runtime bundle VitePress. Не создавайте
редактируемую копию owner diagram в этом каталоге.

VitePress генерирует SVG перед `npm run dev` и `npm run build`. В dev-режиме
изменение общей `.mmd` пересобирает затронутую схему и перезагружает страницу.
Для изменения owner diagram сначала редактируется файл в репозитории-владельце,
после чего нужно пересинхронизировать staging.

Для проверки документации достаточно:

```bash
npm run build
```
