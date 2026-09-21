# Формы на сайте: плагин forms-db

Плагин **forms-db** сохраняет отправки форм в SQLite/PostgreSQL/MySQL и
отдаёт их списком или по удалению. Вызовы — через `apiRoutes`: gateway сам
прокидывает HTTP-запрос в capability плагина.

## 1. Конфиг плагина

`conf/forms-db.yaml`:

```yaml
driver: sqlite
dsn: ./data/forms.db
tablePrefix: form_
```

## 2. Декларация в gateway.yaml

```yaml
plugins:
  forms-db:
    manifest:
      name: forms-db
      capabilities: [forms.submit, forms.list, forms.delete]
    enabled: true
    binary: ./bin/forms-db
    config: ./conf/forms-db.yaml
    autoRestart: true

management:
  enabled: true
  port: "18090"
  token: ""

server:
  - serverName: [site.localhost]
    site: site
    index: index.html
    apiRoutes:
      - methods: [POST]
        path: /api/forms/submit
        plugin:
          instance: forms-db
          capability: forms.submit
      - methods: [GET]
        path: /api/forms/list
        plugin:
          instance: forms-db
          capability: forms.list
      - methods: [POST, DELETE]
        path: /api/forms/delete
        plugin:
          instance: forms-db
          capability: forms.delete
```

## 3. Проверка

```bash
./bin/gateway serve --config gateway.yaml

# сохранить отправку
curl -H 'Host: site.localhost' \
  -X POST http://localhost:18080/api/forms/submit \
  -H 'Content-Type: application/json' \
  -d '{"name":"Аня","email":"a@example.com"}'

# список
curl -H 'Host: site.localhost' http://localhost:18080/api/forms/list

# удалить (id из списка)
curl -H 'Host: site.localhost' \
  -X POST http://localhost:18080/api/forms/delete \
  -H 'Content-Type: application/json' \
  -d '{"id":"<id>"}'
```

## 4. Состояние плагина

```bash
curl http://localhost:18090/api/plugins
curl http://localhost:18090/api/plugins/forms-db/logs
```

Примечания:

- Разные СУБД (placeholder-синтаксис, драйверы, возможности) скрыты внутри
  плагина общим repository-контрактом — в конфиге меняется только `driver`/`dsn`.
- `autoRestart: true` — gateway перезапускает плагин при падении.
- Runtime-настройки плагина меняются только в `gateway.yaml` + reload, а не в
  браузере и не в отдельной таблице.
