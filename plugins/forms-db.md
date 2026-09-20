# forms-db

Плагин форм: простые формы веб-сайта, сохраняемые в SQLite, PostgreSQL или
MySQL. Эталонный пример плагина для [гайда по созданию плагинов](/gateway/architecture/guide).

Каталог: `gateway/plugins/forms-db` (отдельный Go-модуль).

## Capabilities

| Capability | Тип | Назначение |
| --- | --- | --- |
| `forms.submit` | unary | сохранить отправку формы |
| `forms.list` | unary | список отправок |
| `forms.delete` | unary | удалить отправку |

## Конфиг instance

```yaml
driver: sqlite          # sqlite | postgres | mysql (mariadb = mysql)
dsn: forms.db
tablePrefix: form_
```

- `driver` — одна из поддерживаемых СУБД.
- `dsn` — connection string соответствующей СУБД (для sqlite — путь к файлу).
- `tablePrefix` — префикс таблиц плагина (default `form_`).

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