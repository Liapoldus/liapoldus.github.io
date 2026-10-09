# AGENTS.md — документация Liapoldus (liapoldus-docs)

Рабочая инструкция для AI-агентов и разработчиков, изменяющих каталог
`liapoldus-docs`. Для кода проекта действует отдельный корневой `AGENTS.md`;
под этим каталогом применяется только этот файл: здесь лежит документация,
и сайт разворачивается на GitHub Pages.

## Назначение

Официальный единый сайт документации Liapoldus — генератор статики
[VitePress](https://vitepress.dev) (1.6.x). Этот репозиторий владеет главной,
общими материалами экосистемы, гайдлайнами, публичными агрегированными
контрактами и сборкой сайта. Архитектура и продуктовая документация каждого
сервиса, SDK и plugin принадлежит его репозиторию и синхронизируется для сборки
по закреплённым ревизиям из `docs-sources.yaml`.

Продакшн-адрес: `https://liapoldus.github.io/` (после переименования репо —
тот же домен).

## Репозиторий

- Remote: `https://github.com/Liapoldus/liapoldus.github.io.git`, ветка `main`.
- Деплой: GitHub Actions `.github/workflows/deploy.yml` на каждый `push` в
  `main` (build → Pages). Ручного копирования артефактов нет.
- Креденшелы: HTTPS + `osxkeychain` (`docup1`); токен при необходимости —
  `security find-internet-password -s github.com -a docup1 -w` (не печатать в
  консоль/коммиты).

## Команды (из корня репозитория)

```bash
npm install        # один раз; package-lock.json в реестре
npm run dev        # локальный dev-сервер (VitePress)
npm run build      # сборка в .vitepress/dist
npm run docs:sync  # пересобрать локальный staging из репозиториев-владельцев
npm run docs:sync -- --remote # получить закреплённые удалённые ревизии
npm run preview    # статический предпросмотр сборки
```

Порядковый контроль перед коммитом контентного изменения:

```bash
npm run build   # обязателен, сайт должен собираться
```

После деплоя (push в main) подождать ~40–60с и проверить затронутые маршруты:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://liapoldus.github.io/core/configuration/
# ожидается 200; 301 — легальный редирект каталога
```

## Конвенции контента

- Язык: `ru-RU`. `cleanUrls: true` — ссылки пишутся без `.md`
  (`/cli/commands`, не `.../commands.md`), анкоры — только при необходимости.
- **Единый источник**: одна каноническая страница на тему; таблицы, списки эндпоинтов
  и YAML-блоки **не дублируются** между страницами — дубли заменяются ссылкой на канон.
- **Тонкие страницы**: лендинг-обзор + страницы-факты (данные таблицами, без
  пересказа). Сплошные абзацы-«очерки» дробятся.
- Навигация по разделам — карточки `<div class="cards">` (обязательно внутри
  раздела, не на пустом холсте страницы). На корневой странице не дублируют
  карточки перечислением в тексте.
- Варианты конфигов — вкладки `:::tabs` / `== Имя` / `:::`
  (`vitepress-plugin-tabs`).
- Общие схемы хранятся исходниками `diagrams/*.mmd`; схемы сервисов — в их
  `docs/site/diagrams/`. Синхронизация собирает их в `.site-src/diagrams`,
  VitePress генерирует `public/diagrams/*.svg` перед dev/build. Runtime Mermaid и его
  VitePress-плагин не используются: это исключает тяжёлый клиентский chunk.
- `BASE_PATH: /` задаётся в workflow env; в конфиге default `/`. Не менять
  без отдельного решения.
- Sidebar/nav редактируются только в `.vitepress/config.mts`. Новая страница
  обязательно добавляется в sidebar.
- Канонический раздел продукта называется `/core/`; `/gateway/` и прежние
  Gateway IDs/paths не поддерживаются после breaking migration. Не добавлять
  redirect-страницы и старые ссылки как совместимый API.

## Источник документации и структура агрегатора

- Канонические исходники Core — `core/docs/site/`; protocol —
  `pluginprotocol/docs/site/pluginprotocol/`; SDK — `plugin-sdk/docs/site/` и
  `plugin-sdk/README.md`; Server/forms-db — `plugins/{server,forms-db}/docs/site/`.
- Каждый владелец редактирует только свой источник. Главная, product overview,
  общая архитектура экосистемы и гайдлайны остаются здесь. Не создавать в
  агрегаторе вторую копию страниц сервиса.
- `docs-sources.yaml` закрепляет repository URL и commit SHA источника. Сборка
  синхронизирует эти ревизии, если локального workspace-соседа нет. После
  изменения документации сначала сохранить и опубликовать commit владельца,
  затем обновить его SHA здесь. Не использовать плавающий `main` в сборке.
- `.site-src/` — generated staging VitePress, `.docs-sources/` — remote
  checkouts; оба каталога нельзя редактировать вручную или коммитить.
- `.vitepress/diagram-source-hashes.json` — generated cache of source digests.
  Не править вручную: SVG перегенерируется только при изменении соответствующего
  Mermaid source, чтобы unchanged builds не вносили nondeterministic SVG diffs.

```text
.vitepress/config.mts        # nav, sidebar, base, search
.vitepress/diagram-source-hashes.json # generated diagram source digest cache
scripts/sync-doc-sources.mjs # сборка владельческих источников в .site-src
docs-sources.yaml            # remotes, commit pins и карта маршрутов
diagrams/                     # общие Mermaid-исходники
.site-src/                    # generated merged VitePress source (ignored)
.vitepress/theme/            # кастомные компоненты (CoreNav), custom.css
.vitepress/shim/             # fastdom-заглушки для сборки (не трогать)
public/                      # favicon, versioned contracts и сгенерированные SVG
plugins/                      # общие overview и замороженные v2 указатели
architecture/ guidelines/     # общие границы экосистемы и правила документации
public/                       # общие versioned contracts и generated SVG
product/                     # «О продукте» (обзор, user-experience)
index.md                     # корневая страница (layout: home)
```

## Правила безопасных изменений

- Минимальные связанные изменения; после каждого крупного этапа — `npm run build`.
- После явного утверждения целевой архитектуры устаревшие контракты, инструкции
  и код заменяются согласованным breaking-change переходом, а не сохраняются как
  вторая поддерживаемая архитектура. Не проектировать permanent compatibility
  shims, legacy fallback или параллельные lifecycle-модели. В одном законченном
  переходе обновлять владельца контракта, всех потребителей, тесты и ссылки;
  итоговая ветка должна собираться без старого пути. Если межрепозиторная
  миграция не готова целиком, не публиковать и не считать её завершённой.
- Перед изменением читать контекст файла; при правках соседних страниц
  проверять, что дубль действительно дубль, а не «другой» контент.
- Не выполнять деструктивных git-команд (`reset`, `push -f`, удаление) без явного
  запроса.
- Не трогать чужие незакоммиченные изменения (например, правки `config.mts`).
- Коммит/пуш — только по явному запросу; сообщение коммита по-русски в стиле
  репозитория («docs: ...»).
- Как проверить деплой после пуша — см. выше (curl 200 на затронутых маршрутах).

## Полезные ссылки в контенте

- Общие страницы остаются в `architecture/`, `guidelines/` и `product/`.
  Сервисные страницы видны в generated `.site-src/`, но редактируются только в
  соответствующем репозитории-владельце; owner map закреплён в корневом
  `AGENTS.md`.
- Решения по структуре/стилю сессии документируются в этом файле и в коммитах.
