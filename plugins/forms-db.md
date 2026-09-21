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

Канонические JSON Schema requests/responses и mapping typed errors — в
<a href="/spec/plugin-contracts.json" target="_blank" rel="noopener">plugin-contracts.json</a>.
`site` Gateway берёт из route target, а не от клиента.

### `forms.submit`

```json
{"site":"portal","schemaName":"contact","data":{"name":"Аня","email":"a@example.com"}}
```

`data` валидирует schema, зарегистрированная у instance. Неизвестный ключ даёт
`validation_failed`.

### `forms.list`

```json
{"site":"portal","schemaName":"contact","cursor":"optional","limit":50,"filter":{"field":"email","equals":"a@example.com"}}
```

Cursor opaque; filter поддерживает только equality по полю, разрешённому schema.

### `forms.delete`

```json
{"site":"portal","schemaName":"contact","id":"frm_…"}
```

Повторное удаление возвращает `not_found`; mapping в HTTP определяет контракт.

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
