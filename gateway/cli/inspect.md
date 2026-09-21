# Диагностика

Команды читают registry без работающего runtime и не меняют состояние.

```bash
gateway site config <slug>
gateway routes  <slug>
gateway status
gateway health
```

| Подкоманда | Результат |
| --- | --- |
| `site config` | канонический `sites/<slug>/site.yaml` |
| `routes` | route bindings и site redirects |
| `status` | release, current/previous и найденные проблемы |
| `health` | целостность registry; exit `3` при invalid release |

```bash
gateway site config blog
# slug: blog
# locales: [ru, en]
# defaultLocale: ru

gateway routes blog
# /old -> /new (301)
```
