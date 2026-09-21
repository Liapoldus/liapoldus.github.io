# CLI

CLI — единый интерфейс для config, registry и local runtime.

```text
gateway [--config PATH] [--config-dir DIR] [--output text|json] COMMAND
```

## Поиск конфигурации

| Приоритет | Источник |
| --- | --- |
| 1 | `--config PATH` |
| 2 | `LIAPOLDUS_GATEWAY_CONFIG` |
| 3 | `--config-dir DIR/gateway.yaml` |
| 4 | `LIAPOLDUS_CONFIG_DIR/gateway.yaml` |
| 5 | `/etc/liapoldus/gateway.yaml` |

Не найденный config даёт exit `2`; Gateway не использует скрытый встроенный
default. `--config-dir` и `LIAPOLDUS_CONFIG_DIR` подходят для image, CI и
локальных профилей, где каталог конфигурации известен, а имя остаётся
`gateway.yaml`.

## Единый вывод

`text` — краткий вывод в stdout; `json` — один объект с `ok`, `command` и
`requestId` при runtime-вызове. Ошибка всегда идёт в stderr / JSON `problem`.

| Exit | Значение |
| --- | --- |
| `0` | успех |
| `1` | внутренняя ошибка |
| `2` | аргументы или config не найден |
| `3` | validation |
| `4` | conflict |
| `5` | not found |
| `6` | authorization |
| `7` | unavailable / timeout |

## Команды

| Группа | Команды | Результат |
| --- | --- | --- |
| Runtime | `serve`, `status`, `health`, `reload` | запуск, snapshot и readiness |
| Config | `config path`, `validate [PATH]`, `print`, `format [PATH]`, `explain FIELD`, `diff` | поиск, проверка и понимание YAML |
| Site | `site publish`, `versions`, `current`, `previous`, `rollback`, `config`, `routes` | immutable releases и inspection |
| Access | `accounts create`, `rotate`, `revoke` | service keys |

Все команды, кроме `serve`, завершаются. Изменяющие state-команды сначала
валидируют input и не оставляют частично применённое состояние.
