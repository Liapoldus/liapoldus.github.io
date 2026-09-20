# Версии и откат

Работа с версиями сайта в registry. Схема каталогов (`current` / `prev` /
публичный `/__prev/`) — на странице [Конфиг сайта](/gateway/configuration/site-config).

```bash
gateway versions <slug>   # список версий на диске
gateway current  <slug>   # активная версия
gateway prev     <slug>   # предыдущая версия (резерв для отката)
gateway rollback <slug>   # prev становится current
```

| Подкоманда | Что показывает / делает |
| --- | --- |
| `versions` | каталоги `current/`, `prev/` и сохранённые версии |
| `current` | путь активной версии |
| `prev` | путь резервной версии |
| `rollback` | мгновенная перестановка каталогов `current` ↔ `prev` |

## rollback

- Перестановка каталогов в registry через `.rollback-tmp` (атомарно);
- без перезапуска процесса и без БД;
- откатывает на одну версию назад — для следующего шага нужна новая публикация.

## Пример

```bash
gateway versions blog
# currents: v3 (2026-01-15) … prev: v2 (2026-01-10)

gateway rollback blog   # v2 снова current
gateway current blog    # …/sites/blog/current -> v2
```