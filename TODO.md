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
- [x] Разделены v1 и v2: v1 — Core, Plugin SDK, `pluginprotocol`, Server plugin
  и forms-db; ручной запуск plugin binaries. Docker/Compose/Swarm/Kubernetes,
  process supervision/install, Caddy-L4/public L4, CAPTCHA, Identity/OIDC/OAuth
  и TUF перенесены в v2.
- [x] Core↔plugin lifecycle отнесён к Plugin SDK REST; `pluginprotocol` описан
  только как generic plugin↔plugin library. Product schemas и capabilities
  остаются у конкретных plugins.
- [x] Зафиксирован plugin config lifecycle: точные raw JSON bytes; durable
  `active`/`previous`/internal `staging`; staging недоступен plugin pull и
  используется для восстановления незавершённой durable operation; успешная
  активация транзакционно двигает active/previous.
- [x] Документация Core, публичные contracts, sidebar и ссылки обновлены;
  локальный `npm run build` прошёл 2026-09-30. Из-за заморозки Constructor
  Mermaid-генератор в этом запуске пропустил его diagram sources; Core ER SVG
  был сгенерирован отдельно из собственного источника.
- [x] Manifest hashes для изменённых `errors.json` и `management.openapi.yaml`
  пересчитаны; YAML разбирается, OpenAPI содержит 12 paths / 14 operations и
  не содержит отсутствующих локальных `$ref`.
- [x] Проверить GitHub Pages deployment breaking rename: HTTP вернул `200` для
  `/core/`, `/core/configuration/` и `/core/configuration/acceptance`, а старый
  `/gateway/configuration/` — `404`. Текущая ветка `main` синхронизирована с
  `origin/main`; все её commits опубликованы.

## Открыто

- [ ] Синхронизировать public contracts с фактически компилируемыми Plugin SDK,
  Server и forms-db owner contracts после завершения их миграции. Сейчас обе
  активные plugin integrations падают при Go compile; не объявлять contract
  parity или production readiness до сквозного Core→SDK→plugin smoke.
- [ ] Добавить/подтвердить CI gate hashes опубликованных schemas/OpenAPI/vectors
  и целостность ссылок на внешние owner contracts без копирования `.proto` или
  plugin-owned JSON schemas.
- [ ] После следующего документационного изменения собрать сайт командой
  `npm run build`, но сначала проверить затронутые diagram sources: build
  регенерирует `public/diagrams/*.svg`. Не перезаписывать пользовательские
  Constructor diagrams, пока Constructor заморожен.

## Вне области

Не менять product code/tests в `Constructor/`, `react-lib/`, замороженных `plugins/captcha/` и
`plugins/identity/`, `archive/plugins/tls-issuer/` или `test/`. Не менять код,
contracts активных plugins вместо их владельцев. Не коммитить, не
пушить и не публиковать последующие изменения без отдельного явного запроса.

## Миграция документационных исходников

- [x] Разделить ownership: общая главная, product overview, ecosystem
  architecture и guidelines остаются в агрегаторе; Core, protocol, SDK, Server,
  forms-db, Constructor и React SDK владеют собственными Markdown/Mermaid.
- [x] Добавить pinned-source manifest, локальный staging assembler и VitePress
  `srcDir`; публичные URL сохраняются, исходники не дублируются при сборке.
- [ ] Завершить проверку owner commits и remote pins после сохранения изменений
  во всех репозиториях; затем выполнить `npm run build` из режима remote sources.
- [ ] CAPTCHA/Identity остаются замороженным v2-исключением в aggregator до
  отдельного решения о разморозке их documentation owners.
