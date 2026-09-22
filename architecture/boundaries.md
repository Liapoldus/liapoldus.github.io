# Границы и инварианты

## Инварианты

- **Git — source of truth** исходного React-проекта. БД Constructor хранит
  operational metadata, но не закрытую копию исходников.
- **React-only.** Constructor не вводит универсальный слой для Vue, Svelte или
  Angular; итогом является обычный оптимизированный React static frontend.
- **Visual first, code escape hatch.** Структурированные вещи редактируются
  визуально; сложная логика остаётся TypeScript/React-кодом.
- **Gateway владеет Gateway.** Constructor использует его API и документирует
  отсутствующую возможность как gap, а не дублирует runtime.
- **Plugin владеет plugin-specific logic.** Constructor строит UI по контракту,
  а не по списку заранее известных плагинов.
- **Designer не меняет JSX internals.** Он действует только в рамках схемы,
  опубликованной разработчиком.
- **Secrets не попадают в Git, Snapshot или static frontend.** В моделях
  сохраняются ссылки на secret storage.

## Runtime boundary

Редакторские модели (component schema, asset metadata, visual routes) нужны
Constructor. Build превращает их в React chunks, CSS, assets, i18n JSON и
конфигурационные артефакты. В browser bundle не требуется Constructor backend.

Server-side webhook, cron и handler не могут исполняться в static frontend: их
надо реализовать отдельным upstream либо plugin/runtime capability.
