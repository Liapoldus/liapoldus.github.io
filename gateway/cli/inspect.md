# Диагностика

Чтение состояния сайтов и registry без запущенного runtime — пригодится при
подозрении на «битый» диск или реестр.

```bash
gateway config  <slug>  # персональный конфиг сайта (unified schema, YAML)
gateway routes  <slug>  # маршруты (matcher → target) и редиректы
gateway status          # состояние всех сайтов на диске
gateway health          # проверка здоровья registry (автономно)
```

| Подкоманда | Назначение |
| --- | --- |
| `config` | выводит `sites/<slug>/config.yaml` — единый источник для CLI, management API и runtime |
| `routes` | маршруты и редиректы сайта (в виде, в котором их использует маршрутизация) |
| `status` | сводка по всем сайтам: активные/резервные версии, найденные проблемы |
| `health` | самостоятельная проверка целостности registry (без работающего gateway) |

Схема конфига сайта — [unified schema](/gateway/configuration/site-config).

## Пример

```bash
gateway config blog
# slug: blog
# hosts: [blog.localhost]
# languages: [ru, en]
# defaultLang: ru

gateway routes blog
# /api/* -> https://backend.example
# /old -> /new (301)
```