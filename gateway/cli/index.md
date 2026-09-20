# CLI

Все команды — офлайн-операции над диском (registry + конфиги). Диагностика
работает без запущенного runtime. Единственный долгоживущий процесс — `serve`.

```text
gateway <подкоманда> [флаги]

gateway serve      запустить публичный рантайм (единственный долгоживущий процесс)
gateway versions   список доступных версий сайта на диске
gateway current    показать текущую версию сайта
gateway prev       показать предыдущую версию сайта
gateway rollback   откатить сайт: prev становится current
gateway config     показать персональный конфиг сайта (unified schema)
gateway routes     показать маршруты и редиректы сайта
gateway status     диагностика: состояние сайтов на диске
gateway health     проверка здоровья registry (автономно)
gateway accounts   выпуск, ротация и отзыв service account API keys
gateway help       справка по подкомандам
```

## serve

```bash
gateway serve [--config <gateway.yaml>] [--no-management] [--management-token <token>]
```

- `--config PATH` — конфиг (иначе env `LIAPOLDUS_GATEWAY_CONFIG`, затем default).
- `--no-management` — выключить management-порт.
- `--management-token TOKEN` — переопределить `management.token`.

Останавливается по `SIGINT`/`SIGTERM`: сначала graceful stop плагинов, затем
HTTP-серверы (таймаут 10s).

## Версии и откат

```bash
gateway versions <slug>            # каталоги current/, prev/, версии на диске
gateway current  <slug>            # активная версия
gateway prev     <slug>            # предыдущая версия
gateway rollback <slug>            # prev становится current (мгновенный откат)
```

Откат — перестановка каталогов в registry, без перезапуска процесса и без БД.

## Диагностика

```bash
gateway config  <slug>             # персональный конфиг сайта (YAML)
gateway routes  <slug>             # маршруты (matcher → target) и редиректы
gateway status                     # состояние всех сайтов на диске
gateway health                     # проверка registry (автономно)
```

`status`/`health` пригодятся при подозрении на «битый» диск или реестр: они не
требуют работающего gateway.

## accounts

```bash
gateway accounts create <id> --role=platform-admin[:|tenant-admin] [--tenant=<tenant>]
gateway accounts rotate <id>
gateway accounts revoke <id>
```

- `--config <gateway.yaml>` обязателен (нижний уровень администрирования).
- `create`/`rotate` печатают секрет **один раз**: `lpgw_<id>_<hex>`, в файл
  пишется только bcrypt-хеш (`keyHash`).
- `tenant-admin` требует `--tenant`.
- Запись атомарная: файл валидируется заново перед переименованием.

Пример:

```bash
gateway accounts create ops --role=platform-admin --config gateway.yaml
# service account ops created; save this key now — it will not be shown again:
# lpgw_ops_1f09c2...
```

## Глобальные флаги

```text
gateway --help    справка по подкомандам
```

Подробно про секреты и роли — в [Безопасности](/gateway/configuration/security).