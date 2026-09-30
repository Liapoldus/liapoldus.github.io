# TODO — нормативная документация Core v1

Документация и versioned public contracts этого репозитория — источник истины
для Core v1 до завершения release gates. Общая архитектура, v1/v2 граница и
межрепозиторный порядок работ находятся в workspace-файле
`../tasks/README.md`; пять исполнителей получают отдельные задания из
`../tasks/prompts/` (это пути вне VitePress и они не являются ссылками сайта).

## В работе

- [ ] Закрепить один согласованный target по Core, Plugin SDK REST, generic
  pluginprotocol и двум v1 plugins; удалить противоречия, старые названия
  Gateway и lifecycle RPCs из нормативных страниц и публичных contracts.
- [ ] Проверить links, sidebar, schema/openapi/vector references после breaking
  migration `/gateway/` → `/core/`, включая API paths, JSON IDs, CLI/binary
  labels и examples. Не оставлять compatibility links как поддерживаемый API.
- [ ] Сверить contracts/errors/schema/OpenAPI/golden vectors с кодом Core и
  owner contracts Plugin SDK, pluginprotocol, Server и forms-db; не копировать
  чужие `.proto` или plugin JSON schemas.
- [ ] Явно разделить v1 и v2 на всех страницах: public L4/Caddy-L4, CAPTCHA,
  Identity/OIDC/OAuth, TUF/catalog/install, local workload supervision,
  Docker/Compose/Swarm/Kubernetes — только v2 и не v1 API/schema/dependencies/
  acceptance.
- [ ] Отразить remaining implementation gates только со ссылками на repo-owned
  TODO; не дублировать длинные implementation checklists на нескольких
  документационных страницах.
- [ ] Проверить translation/navigation: русская документация, sidebar без
  мёртвых путей, generated diagram artifacts согласованы с `.mmd` sources.

## Проверка

- [ ] После связанных content changes `npm run build`.
- [ ] Проверить SHA-256 опубликованных assets в `public/spec/manifest.json` и
  schema/OpenAPI/vector links.
- [ ] Зафиксировать затронутые страницы и актуальные, реально исполненные
  проверки в workspace status/отчёте; не объявлять production readiness по
  сборке сайта.

## Вне области

Не менять `Constructor/`, `react-lib/`, замороженные `plugins/captcha/` и
`plugins/identity/`, `archive/plugins/tls-issuer/` или `test/`. Не менять код,
schemas или TODO активных plugins вместо их owner-агентов. Не делать commit,
push, deploy или release без явного отдельного запроса.
