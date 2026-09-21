# Запуск

Единственный долгоживущий процесс — `gateway serve`; остальные CLI-команды —
разовые (см. [CLI](/gateway/cli/) и [serve](/gateway/cli/serve)).

## Сценарии запуска

:::tabs
== Локальная разработка

Мейктаргеты в корне репозитория:

```bash
make run       # go run ./cmd/gateway serve --config ../../gateway.yaml
make build     # сборка бинарников (с GOOS-переменными из Makefile)
```

`make dev` с Postgres не является зависимостью Gateway: это опциональное
окружение для разработки `forms-db`.

Отдельно модуль:

```bash
cd gateway/core && go run ./cmd/gateway serve --config ../../gateway.yaml
```

== Docker Compose

Стек: gateway (публичный рантайм + mgmt).

```bash
docker compose up -d --build
```

- `liapoldus-gateway` — публичный рантайм (`18080`); management-порт наружу
  доступен **только на loopback хоста** (`127.0.0.1:18090`), доступ — по
  service-account key из `gateway.yaml`/secret mount.
- Volume `appdata` — registry (`/app/data/registry`); контейнеры `read_only`
  с `no-new-privileges`.

== Production-бинарник

```bash
cd gateway/core
GOOS=linux go build -o bin/gateway ./cmd/gateway
./bin/gateway serve --config /etc/liapoldus/gateway.yaml
```

`Dockerfile` собирает один образ gateway; `docker-entrypoint.sh` запускает
только `gateway serve`. `LIAPOLDUS_MODE=gateway` допустим исключительно для
совместимости и не меняет запускаемый процесс.
:::

### Рантайм-флаги и завершение

Флаги `serve` и graceful shutdown — [serve](/gateway/cli/serve).

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `LIAPOLDUS_GATEWAY_CONFIG` | путь к конфигу процесса (аналог `--config`) |
| `LIAPOLDUS_GATEWAY_REGISTRY` | переопределяет корневой `registry` |
| `LIAPOLDUS_MODE` | `gateway`; `single` — устаревшее значение и не поддерживается target-spec |

## Контракт контейнерного образа

Образ запускается non-root UID/GID `10001`, workdir `/app`, entrypoint —
`gateway serve --config /etc/liapoldus/gateway.yaml`. Root filesystem read-only.
Единственные writable mounts: `/app/data/registry` (releases),
`/app/data/audit` (JSONL audit) и `/app/data/tls` (protected TLS storage).
Конфиг и service-account hashes монтируются read-only в `/etc/liapoldus` и
`/run/secrets`.

Минимальный Compose публикует `18080:18080`, а management — только
`127.0.0.1:18090:9090`; healthcheck вызывает `GET /healthz` внутри контейнера.
PostgreSQL допустим лишь отдельным `forms-db` profile и не входит в stack
Gateway. Default config отсутствует: `--config` или
`LIAPOLDUS_GATEWAY_CONFIG` обязателен для production image.

## Проверка здоровья

- `GET /healthz` на management-порту (без авторизации).
- CLI-команда `gateway status` — диагностика диска без работающего runtime.
