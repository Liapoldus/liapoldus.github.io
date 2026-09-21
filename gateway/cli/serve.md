# `serve`

Запускает data plane и, если не задан `--no-management`, local Gateway API.

```text
gateway serve [--config PATH] [--config-dir DIR] [--no-management]
```

| Флаг | Эффект |
| --- | --- |
| `--config`, `--config-dir` | выбирают файл по [общему порядку](/gateway/cli/) |
| `--no-management` | не открывает management listener |

Перед bind Gateway собирает и валидирует полный snapshot. Ошибка конфигурации
не открывает ни один listener и завершает процесс с exit `3`. `SIGINT` и
`SIGTERM` прекращают accept, дают активным запросам 10 s и затем закрывают
plugins и listeners.
