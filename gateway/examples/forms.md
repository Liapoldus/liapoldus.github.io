# Формы на сайте: плагин forms-db

Плагин **forms-db** сохраняет отправки форм в SQLite/PostgreSQL/MySQL и
отдаёт их списком или по удалению. YAML-route явно назначает capability
плагина, а gateway передаёт ей HTTP-запрос.

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
  forms:
    binary: ./bin/forms-db
    settings: {}
    capabilities: [forms.submit, forms.list, forms.delete]
    restart: { enabled: true, backoff: 1s }
listeners:
  web:
    type: http
    address: ':80'
    routes:
      - when: { host: site.localhost, method: [POST], path: { exact: /api/forms/submit } }
        then: { plugin: { instance: forms, capability: forms.submit } }
      - when: { host: site.localhost, method: [GET], path: { exact: /api/forms/list } }
        then: { plugin: { instance: forms, capability: forms.list } }
      - when: { host: site.localhost, method: [POST, DELETE], path: { exact: /api/forms/delete } }
        then: { plugin: { instance: forms, capability: forms.delete } }
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
curl http://localhost:9090/api/plugins/forms/logs
```

Примечания:

- Разные СУБД (placeholder-синтаксис, драйверы, возможности) скрыты внутри
  плагина общим repository-контрактом — в конфиге меняется только `driver`/`dsn`.
- `restart.enabled: true` — gateway перезапускает плагин при падении.
- Runtime-настройки плагина меняются через YAML + reload; capability не может
  создать свой маршрут или публичный listener.
