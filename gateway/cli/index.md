# CLI

CLI — локальный control-plane клиент. Все команды, кроме `serve`, завершаются;
они не требуют работающего runtime, если явно не обращаются к Management API.

```text
gateway [--config PATH] [--output text|json] COMMAND
```

`--output text` — default, данные идут в stdout, ошибки — в stderr. `--output
json` печатает один JSON object с `requestId` для runtime-операций. Exit code:
`0` success, `2` invalid arguments, `3` validation, `4` conflict, `5` not
found, `6` authorization, `7` unavailable/timeout, `1` internal failure.

## Команды

| Command | Input | Результат |
| --- | --- | --- |
| `serve` | `--config`, `--no-management` | запускает data/control plane |
| `config validate [PATH]` | YAML path | validate без записи; exit `3` при ошибке |
| `reload` | `--config` | validate + atomic apply; exit `4` если нужен restart |
| `site publish SLUG SOURCE` | complete release dir | создаёт immutable release и переключает `current` |
| `versions SLUG` | slug | release list, current, previous |
| `current SLUG` / `previous SLUG` | slug | active/reference revision |
| `rollback SLUG` | slug | атомарно меняет current и previous |
| `status` / `health` | — | offline registry summary / integrity check |
| `accounts create`, `rotate`, `revoke` | account id | создаёт или изменяет platform-admin key |

`site publish` и `rollback` печатают `{site,revision,previousRevision}`. Source
публикации не изменяется. Порядок publish/rollback и layout — на странице
[Конфиг сайта](/gateway/configuration/site-config).
