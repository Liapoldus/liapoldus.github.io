# serve

Единственный долгоживущий процесс gateway: публичный рантайм (HTTP/HTTPS,
раздача сайтов, capability-вызовы плагинов) + management. Все остальные
подкоманды работают офлайн и не требуют запущенного `serve`.

```bash
gateway serve [--config <gateway.yaml>] [--no-management]
```

## Флаги

| Флаг | Назначение |
| --- | --- |
| `--config PATH` | путь к конфигу процесса |
| `--no-management` | выключить management-порт |

Порядок выбора конфига: `--config` → env `LIAPOLDUS_GATEWAY_CONFIG` →
встроенный default.

## Запуск и проверка

```bash
./bin/gateway serve
curl http://localhost:18090/healthz          # {"status":"ok",...}
curl -H 'Host: example.localhost' http://localhost:18080/
```

## Завершение

`SIGINT`/`SIGTERM` запускают graceful shutdown: сначала останавливается
супервизор плагинов (`manager.Close()`), затем все `http.Server` через
`Shutdown(ctx)` с таймаутом 10s. Детали — в [архитектуре](/gateway/architecture/gateway).
