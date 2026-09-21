# Проверка и inspection

Эти команды не меняют registry или active runtime.

| Команда | Назначение |
| --- | --- |
| `gateway config path` | печатает выбранный config и источник выбора |
| `gateway config validate [PATH]` | проверяет YAML, include, references и secrets без применения |
| `gateway config print` | печатает merged config; secrets redacted |
| `gateway config format [PATH]` | выводит canonical YAML в stdout; файл не перезаписывает |
| `gateway config explain FIELD` | тип, default, ограничения и topic для YAML path |
| `gateway config diff` | сравнивает disk config с active snapshot; требует runtime API |
| `gateway site config SLUG` | active `site.yaml` release |
| `gateway site routes SLUG` | bindings, redirects и locale prefixes |
| `gateway status` / `health` | offline registry summary / integrity check |

`config explain listeners.web.limits.bodyBytes` — быстрый путь к полю без
поиска по полной схеме. JSON mode возвращает стабильные ключи `path`, `value`,
`source`, `diagnostics` и `requestId` (если команда обращалась к runtime).
