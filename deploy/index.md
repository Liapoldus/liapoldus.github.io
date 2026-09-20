# Запуск

Gateway — единственный долгоживущий процесс. Остальные команды CLI выполняются
и завершаются (см. [CLI](/cli/)).

## Локальная разработка

Makefile в корне репозитория:

```bash
make dev       # Postgres + dev-окружение
make run       # go run ./cmd/gateway serve --config ../../gateway.yaml
make build     # сборка бинарников (с GOOS-переменными из Makefile)
```

Отдельно модули:

```bash
cd gateway/core && go run ./cmd/gateway serve --config ../../gateway.yaml
```

### Рантайм-флаги

```text
gateway serve [--config <path>] [--no-management] [--management-token <token>]
```

| Флаг | Назначение |
| --- | --- |
| `--config PATH` | путь к `gateway.yaml` (иначе `LIAPOLDUS_GATEWAY_CONFIG`, затем default) |
| `--no-management` | полностью выключить management-порт |
| `--management-token TOKEN` | переопределить `management.token` (важно в Compose) |

Graceful shutdown: `SIGINT`/`SIGTERM` → останавливаются плагины
(`manager.Close()`), затем все HTTP-серверы через `Shutdown` с таймаутом 10s.

## Docker Compose

Стек: gateway (публичный рантайм + mgmt).

```bash
docker compose up -d --build
```

- `liapoldus-gateway` — публичный рантайм (`18080`); management-порт наружу
  доступен **только на loopback хоста** (`127.0.0.1:18090`); доступ к нему —
  по токену `LIAPOLDUS_MGMT_TOKEN`.

Токен обязателен для доступа к management-порту снаружи: без токена mgmt
принимает только loopback.

```bash
export LIAPOLDUS_MGMT_TOKEN=my-secret-token
docker compose up -d
```

Gateway использует volume `appdata` для registry (`/app/data/registry`);
контейнеры запускаются `read_only` с `no-new-privileges`.

## Dockerfile (один образ)

`Dockerfile` собирает образ gateway; `docker-entrypoint.sh` выбирает процесс по
`LIAPOLDUS_MODE`. Композиция выше использует тот же образ в разных конфигурациях.

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `LIAPOLDUS_GATEWAY_CONFIG` | путь к конфигу процесса (аналог `--config`) |
| `LIAPOLDUS_GATEWAY_REGISTRY` | переопределяет `registry` | 
| `LIAPOLDUS_GATEWAY_MGMT_TOKEN` | токен для доступа к mgmt-порту (env в Compose) |
| `LIAPOLDUS_MODE` | `single` / `gateway` (выбор процесса в entrypoint) |

## Проверка здоровья

- `GET /healthz` на management-порту (без авторизации).
- CLI-команда `gateway status` — диагностика диска без работающего runtime.

## Сборка production-бинарников

```bash
cd gateway/core
GOOS=linux go build -o bin/gateway ./cmd/gateway
```

Memory/CPU лимиты плагинов — platform-specific и не должны ломать macOS,
Windows или Linux.