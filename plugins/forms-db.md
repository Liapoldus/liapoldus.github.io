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
| `admin.surface.get` | control | декларация страниц forms-db в Constructor |

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

## Страницы в Constructor

forms-db публикует две declarative admin pages через общий
[Plugin Admin Pages](/plugins/admin-pages) contract. Он не поставляет React
код и не открывает отдельный endpoint.

### Form submissions

Страница видна при `plugins.forms-db.read`. Верхняя filter form выбирает `site`
и `schemaName`, а также optional `field`/`equals`. Table вызывает `forms.list`
через Gateway `POST /api/plugins/{instance}/admin/pages/submissions/query`;
она показывает только `id`, `createdAt`, `data`, использует opaque cursor и
limit не выше 100. Значения `data` экранируются Constructor и never rendered
as HTML.

`Delete submission` вызывает `forms.delete` только для выбранной записи,
требует `plugins.forms-db.write`, dangerous-confirmation token и idempotency
key. Gateway создаёт audit record с actor, instance, site, schemaName, record
ID и outcome; plugin получает минимальный typed input.

### Storage configuration

Страница видна при `plugins.forms-db.write` и рендерит уже существующую
`config.schema`: `driver`, `dsn`, `tablePrefix`. `dsn` является `secret`
write-only field. Save отправляет новый `plugins.<instance>.settings` через
стандартный Gateway config apply с active digest; forms-db не изменяет YAML
напрямую. После успешного apply Gateway invalidates surface cache and
Constructor refreshes schema/status.

Reference surface fixture —
[`forms-db/v1/admin-surface.json`](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/forms-db/v1).
