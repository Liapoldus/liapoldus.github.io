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

## Декларация в gateway.yaml

```yaml
plugins:
  forms-db:
    manifest:
      protocol: liapoldus.plugin/v2
      name: forms-db
      capabilities: [forms.submit, forms.list, forms.delete]
    enabled: true
    binary: ./bin/forms-db
    config: ./conf/forms-db.yaml
    autoRestart: true
```

Вызов capability из маршрута:

```yaml
server:
  - apiRoutes:
      - methods: [POST]
        path: /api/forms/submit
        plugin:
          instance: forms-db
          capability: forms.submit
```

Runtime-конфиг меняется только через `gateway.yaml` + reload.