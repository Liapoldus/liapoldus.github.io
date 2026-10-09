# TODO — нормативная документация Core v1

Нормативная цель, границы v1/v2 и критерии готовности описаны в канонических
страницах [`core/architecture/target`](core/architecture/target),
[`core/architecture/v1-migration-roadmap`](core/architecture/v1-migration-roadmap)
и [`core/configuration/acceptance`](core/configuration/acceptance). Реализация
и её открытые задачи принадлежат TODO соответствующих репозиториев.

## Завершено в документационном срезе

- [x] Breaking rename Gateway → Core в VitePress структуре, sidebar, API paths,
  contract IDs и примерах; старый `/gateway/` путь не является поддерживаемым
  compatibility surface.
- [x] Разделены v1, v2 и v3: v1 — Core, Plugin SDK, `pluginprotocol`, Server
  plugin и forms-db с ручным запуском. В v2 — внешнее размещение,
  self-registration/rollout, mixed transports, Domain и Runtime; Server/forms-db
  остаются неизменённым v1 baseline. В v3 — все дальнейшие Server/forms-db
  product changes, включая Server scaling/storage/ACME, forms-db SQL cohort и
  website/content, а также Caddy-L4/public L4, Identity/CAPTCHA, FFI/Python,
  монолитная композиция. Установка и обновление Core/plugins принадлежат
  оператору. Studio развивается отдельно.
- [x] Core↔plugin lifecycle отнесён к Plugin SDK REST; `pluginprotocol` описан
  только как generic plugin↔plugin library. Product schemas и capabilities
  остаются у конкретных plugins.
- [x] Зафиксирован plugin config lifecycle: точные raw JSON bytes; durable
  `active`/`previous`/internal `staging`; staging недоступен plugin pull и
  используется для восстановления незавершённой durable operation; успешная
  активация транзакционно двигает active/previous.
- [x] Документация Core, публичные contracts, sidebar и ссылки обновлены;
  локальный `npm run build` прошёл 2026-09-30.
- [x] Manifest hashes для изменённых `errors.json` и `management.openapi.yaml`
  пересчитаны; YAML разбирается, OpenAPI содержит 12 paths / 14 operations и
  не содержит отсутствующих локальных `$ref`.
- [x] Проверить GitHub Pages deployment breaking rename: HTTP вернул `200` для
  `/core/`, `/core/configuration/` и `/core/configuration/acceptance`, а старый
  `/gateway/configuration/` — `404`. Текущая ветка `main` синхронизирована с
  `origin/main`; все её commits опубликованы.

## Открыто

- [ ] После owner commits обновить SHA pins в `docs-sources.yaml` для Core,
  Plugin SDK, protocol, Server, forms-db, Domain и Runtime; незакоммиченные
  owner docs нельзя закрепить commit pin. Затем выполнить `npm run docs:sync`
  и `npm run build`, проверить маршруты и не коммитить generated staging.

- [x] В рамках общего v2 закрепить опубликованные owner commits для
  `plugins/domain` и `plugins/runtime` в `docs-sources.yaml`, добавить
  канонические страницы в sidebar и проверить локальную сборку.
- [ ] После публикации актуальных owner revisions синхронизировать public
  contracts и pins с Plugin SDK, Server и forms-db. В рамках v2 Server/forms-db
  остаются неизменёнными v1 regression targets; их дальнейшие product изменения
  и conformance принадлежат v3. Не объявлять parity/production readiness без
  сквозных проверок соответствующего этапа.
- [ ] Добавить/подтвердить CI gate hashes опубликованных schemas/OpenAPI/vectors
  и целостность ссылок на внешние owner contracts без копирования `.proto` или
  plugin-owned JSON schemas.
- [ ] После следующего документационного изменения собрать сайт командой
  `npm run build` и проверить изменившиеся SVG с исходными Mermaid-файлами.

## Вне области

Не менять product code/tests в замороженных `plugins/captcha/` и
`plugins/identity/`, `archive/plugins/tls-issuer/` или `test/`. Не менять код,
contracts активных plugins вместо их владельцев. Не коммитить, не
пушить и не публиковать последующие изменения без отдельного явного запроса.

## Миграция документационных исходников

- [x] Разделить ownership: общая главная, product overview, ecosystem
  architecture и guidelines остаются в агрегаторе; Core, protocol, SDK, Server
  и forms-db владеют собственными Markdown/Mermaid.
- [x] Добавить pinned-source manifest, локальный staging assembler и VitePress
  `srcDir`; публичные URL сохраняются, исходники не дублируются при сборке.
- [x] Owner commits созданы, source pins сверены с их полными SHA, локальный
  `npm run build` проходит на sibling workspace checkouts.
- [ ] После отдельного разрешения отправить owner commits; только после этого
  проверить `DOCS_SYNC_MODE=remote npm run build` и публиковать aggregator.
- [x] CAPTCHA/Identity остаются замороженными v3 backlog items в aggregator;
  их owner repositories не трогаются до отдельной разморозки.
