# forms-db

Плагин форм: простые формы веб-сайта, сохраняемые в SQLite, PostgreSQL или
MySQL. Эталонный пример плагина для [гайда по созданию плагинов](/gateway/architecture/guide).

Репозиторий: **отдельный git-репозиторий** плагина — свой Go-модуль,
не в репозитории ядра gateway. Бинарник собирается из этого репозитория.

## Capabilities

| Capability | Тип | Назначение |
| --- | --- | --- |
| `forms.submit` | unary | сохранить отправку формы |
| `forms.list` | unary | список отправок |
| `forms.delete` | unary | удалить отправку |

## Business contract

Gateway вызывает capability с JSON payload. `site` берётся из route target, а
не от клиента; `schemaName` соответствует `[a-z][a-z0-9_-]{0,63}`. Любой
неизвестный ключ даёт typed error `validation_failed`.

### `forms.submit`

```json
{"site":"portal","schemaName":"contact","data":{"name":"Аня","email":"a@example.com"}}
```

`data` — JSON object глубиной до 8, размером до 1 MiB; его schema валидирует
плагин. Успех: `{"id":"frm_…","createdAt":"RFC3339","data":{…}}`.
Ошибки: `validation_failed`, `duplicate`, `storage_unavailable` (`retryable`)
и `resource_exhausted`.

### `forms.list`

```json
{"site":"portal","schemaName":"contact","cursor":"optional","limit":50,"filter":{"field":"email","equals":"a@example.com"}}
```

`limit` — 1–100, default 50. Успех:
`{"items":[{"id":"frm_…","createdAt":"RFC3339","data":{…}}],"nextCursor":"…"}`.
Cursor opaque; filter поддерживает только equality по полю, разрешённому schema.

### `forms.delete`

```json
{"site":"portal","schemaName":"contact","id":"frm_…"}
```

Успех: `{"deleted":true,"id":"frm_…"}`. Повторное удаление возвращает
`not_found`; Gateway преобразует его в `404`, а остальные plugin typed errors —
по правилам [Plugin protocol](/gateway/architecture/protocol).

## Конфиг instance

Пример DSN по каждой поддерживаемой СУБД:

:::tabs
== SQLite

```yaml
driver: sqlite          # путь к файлу БД
dsn: data/forms.db
tablePrefix: form_
```

== PostgreSQL

```yaml
driver: postgres
dsn: postgres://forms:secret@localhost:5432/forms?sslmode=disable
tablePrefix: form_
```

== MySQL / MariaDB

```yaml
driver: mysql           # mariadb = mysql
dsn: forms:secret@tcp(localhost:3306)/forms?parseTime=true
tablePrefix: form_
```
:::

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `driver` | одна из: `sqlite` / `postgres` / `mysql` | — |
| `dsn` | connection string СУБД (для sqlite — путь к файлу) | — |
| `tablePrefix` | префикс таблиц плагина | `form_` |

Различия СУБД (placeholder-синтаксис, возможности, driver setup) скрыты общим
repository-контрактом плагина: различия не протекают в domain/application.

Декларация плагина и привязка capability к маршруту — общий синтаксис
[«Обзор и настройка»](/plugins/).
