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
  локальный `npm run build` прошёл 2026-09-30.

## Открыто

- [ ] Проверить завершение GitHub Pages deployment для опубликованного commit
  `ae2a734`: после push `/core/` маршруты возвращали 404, а старый
  `/gateway/configuration/` — 200. Повторить HTTP-проверку и проверить Actions;
  локальная сборка не является доказательством деплоя.
- [ ] Синхронизировать public contracts с фактически компилируемыми Plugin SDK,
  Server и forms-db owner contracts после завершения их миграции. Сейчас обе
  активные plugin integrations падают при Go compile; не объявлять contract
  parity или production readiness до сквозного Core→SDK→plugin smoke.
- [ ] Проверить в CI hashes опубликованных schemas/OpenAPI/vectors и целостность
  ссылок на внешние owner contracts без копирования `.proto` или plugin-owned
  JSON schemas.
- [ ] После следующего документационного изменения собрать сайт командой
  `npm run build`, но сначала проверить затронутые diagram sources: build
  регенерирует `public/diagrams/*.svg`. Не перезаписывать пользовательские
  Constructor diagrams, пока Constructor заморожен.

## Вне области

Не менять `Constructor/`, `react-lib/`, замороженные `plugins/captcha/` и
`plugins/identity/`, `archive/plugins/tls-issuer/` или `test/`. Не менять код,
contracts или TODO активных plugins вместо их владельцев. Не коммитить, не
пушить и не публиковать последующие изменения без отдельного явного запроса.
