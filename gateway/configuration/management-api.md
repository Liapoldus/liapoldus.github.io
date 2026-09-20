# Management API

Резервированный HTTP API на порту `management.port` (`18090`). Нужен
операторам. Публичный рантайм на эти endpoints не влияет.

Все endpoints, кроме `/healthz`, требуют аутентификации (см.
[Безопасность](security)): Bearer-токен или API-key.

## Здоровье

| Метод | Путь | Доступ |
| --- | --- | --- |
| `GET` | `/healthz` | без авторизации |

```bash
curl http://localhost:18090/healthz
# {"status":"ok","process":"gateway-mgmt"}
```

## Наблюдаемость

| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/metrics` | метрики (Prometheus text, `gateway_` prefix) |

## Runtime и конфигурация

| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/api/status` | состояние runtime (слушатели, сайты, плагины) |
| `GET` | `/api/tenants` | список тенантов |
| `GET` | `/api/tenants/{id}` | тенант (tenant-admin ограничен своим id) |
| `POST` | `/api/reload` | перечитать `gateway.yaml` + include |
| `PUT` | `/api/config` | записать и загрузить новый `gateway.yaml` |

`POST /api/reload`: имя конфига берётся из текущего процесса. Если reload
меняет «сигнатуру слушателей» (порты, таймауты, mgmt-токен, TLS-серты, http2) —
ответ `409 restart required`, изменения требуют перезапуска процесса.

`PUT /api/config`: тело — новый YAML. Запись атомарная: файл валидируется до
переименования. Отключить нежелательное дистанционное изменение локального
конфига можно переопределением токена через `--management-token`.

## Сайты

| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/api/sites` | список сайтов |
| `GET` | `/api/sites/{slug}` | персональный конфиг сайта (unified schema) |
| `GET` | `/api/sites/{slug}/versions` | версии на диске |
| `GET` | `/api/sites/{slug}/current` | активная версия |
| `GET` | `/api/sites/{slug}/prev` | предыдущая версия |
| `POST` | `/api/sites/{slug}/rollback` | prev → current (откат) |
| `POST` | `/api/sites/{slug}/static/{path...}` | загрузить статику версии |
| `DELETE` | `/api/sites/{slug}/static/{path...}` | удалить файл статики |

Откат — перестановка каталогов registry; применяется без перезапуска.

## Плагины (supervisor)

| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/api/plugins` | список instances |
| `GET` | `/api/plugins/{id}` | состояние: status, PID, uptime, последняя ошибка, capabilities |
| `GET` | `/api/plugins/{id}/logs` | последние строки логов instance |
| `POST` | `/api/plugins/{id}/rpc` | произвольный RPC-вызов capability |
| `POST` | `/api/plugins/{id}/restart` | перезапуск (graceful stop + start) |
| `POST` | `/api/plugins/{id}/stop` | stop instance |
| `POST` | `/api/plugins/{id}/start` | start instance |

Эти эндпоинты регистрируются только когда включен супервизор плагинов.

## Примеры

```bash
# Токен
TOKEN=my-secret-token

# Состояние
curl -H "Authorization: Bearer $TOKEN" http://localhost:18090/api/status

# Конфиг сайта
curl -H "Authorization: Bearer $TOKEN" http://localhost:18090/api/sites/blog

# Откат
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:18090/api/sites/blog/rollback

# Перезагрузка конфига
curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:18090/api/reload

# Логи плагина
curl -H "Authorization: Bearer $TOKEN" http://localhost:18090/api/plugins/forms-db/logs
```

## Роли

- `platform-admin` — все endpoints.
- `tenant-admin` — только `GET /api/tenants/{id}` своего тенанта; глобальные и
  legacy endpoints возвращают `403 Forbidden`.
- Без действительного ключа/токена/loopback — `401 Unauthorized`.