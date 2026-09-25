# forms-db

> **Статус:** реализованы memory- и SQLite-хранилища, атомарное применение
> настроек и проверка отправок по переданным JSON Schema Draft 2020-12.
> Equality-фильтр по разрешённому top-level-полю schema и HMAC-защищённая
> cursor pagination также реализованы. PostgreSQL/MySQL adapters и полное
> выполнение declarative admin actions пока отсутствуют и не считаются
> поддерживаемыми. Схемы не сохраняются в БД: их нужно передавать при каждом
> применении конфигурации.

Плагин форм: приём и просмотр отправок веб-форм с хранением в памяти или SQLite.
Эталонный пример плагина для [гайда по созданию плагинов](/gateway/architecture/guide).

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

`data` валидирует schema, зарегистрированная у instance, и ограничивается 256
полями по plugin payload contract. Неизвестный ключ даёт `validation_failed`.

Конфигурация instance передаёт `schemas` как объект, где ключ — имя схемы, а
значение — JSON Schema. Поддерживается Draft 2020-12; имя должно соответствовать
`^[a-z][a-z0-9_-]{0,63}$`. Внешняя загрузка схем и удалённые `$ref` запрещены:
все используемые определения должны находиться внутри самой схемы (например,
в `$defs`). `ConfigApply` сначала компилирует все схемы и готовит новое
хранилище, и только затем атомарно заменяет активную конфигурацию. При ошибке
активные настройки и хранилище остаются без изменений. Список схем пока живёт
только в памяти процесса и не восстанавливается из SQLite.

### `forms.list`

```json
{"site":"portal","schemaName":"contact","cursor":"optional","limit":50,"filter":{"field":"email","equals":"a@example.com"}}
```

Cursor — непрозрачное значение; плагин защищает его HMAC и использует для
keyset pagination. Результаты упорядочиваются по `createdAt DESC, id DESC`;
`id` обеспечивает стабильный порядок при совпадении времени. Cursor привязан к
точным значениям `site`, `schemaName` и equality-фильтра. Повторное применение
cursor с другим site, schema или фильтром отклоняется как `validation_failed`.
`filter` поддерживает точное JSON-equality по верхнеуровневому полю активной schema: учитываются
`properties`, `patternProperties`, локальные `$ref` и композиции schema.
Без `limit` используется 50; допустимый диапазон — 1–100. Нулевое,
отрицательное и превышающее максимум значение отклоняется. Неизвестное поле,
незарегистрированная schema или некорректный фильтр дают `validation_failed`
(`422`). Явное значение `null` отличается от отсутствующего поля. Cursor
ограничен по времени действия; при истечении, повреждении или несовпадении
scope плагин возвращает общий отказ без раскрытия содержимого cursor.
Срок действия cursor — 15 минут с момента выдачи.

Для подписи используется внешний общий secret-файл, который должен быть
доступен всем replicas, работающим с общим хранилищем. При отсутствии или
недоступности ключа `forms.list` завершается fail-closed с
`storage_unavailable`; остальные capabilities могут продолжать работу.
`ConfigApply` не меняет этот ключ. После ротации внешнего секрета ранее выданные
cursors становятся недействительными; для согласованного поведения replicas
ключ заменяют и выполняют rolling restart всех экземпляров. Секрет не входит
в настройки форм, базу, ответы или логи.

### `forms.delete`

```json
{"site":"portal","schemaName":"contact","id":"frm_…"}
```

Повторное удаление возвращает `not_found`; mapping в HTTP определяет контракт.

## Конфиг instance

Поддерживаются `memory` и `sqlite`. `memory` — значение по умолчанию и не
сохраняет записи после перезапуска. SQLite сохраняет их в указанном файле.
Настройки PostgreSQL и MySQL пока не поддерживаются реализацией, даже если
названия этих драйверов присутствуют в схеме формы настроек.

Пример SQLite:

```yaml
driver: sqlite
dsn: data/forms.db
tablePrefix: form_
```

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `driver` | `memory` или `sqlite` | `memory` |
| `dsn` | путь к файлу БД при `sqlite`; для `memory` не используется | — |
| `tablePrefix` | префикс таблиц плагина | `form_` |

`dsn` указывает путь SQLite относительно рабочего окружения процесса плагина.
Используйте постоянный volume, если данные должны переживать пересоздание
контейнера.

Декларация плагина и привязка capability к маршруту — общий синтаксис
[«Обзор и настройка»](/plugins/).

`admin.surface.get` возвращает декларативную страницу из единственного
[forms-db v1 contract в `pluginprotocol`](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/forms-db/v1/admin-surface.json);
Go adapter читает её через embedded read-only filesystem модуля. Плагин не
дублирует JSON-контракт у себя.

## Локальная проверка

Из каталога plugin-репозитория:

```bash
go build ./...
go vet ./...
go test ./...
LIAPOLDUS_CORE_ROOT="../../core" ./tests/gateway_smoke.sh
```

Smoke test собирает текущий Gateway из соседнего `core`, запускает отдельный
процесс forms-db через `LIAPOLDUS_PLUGIN_ENDPOINT` и проверяет HTTP dispatch.

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
as HTML. `site` получает варианты из объявленного `optionsSource` capability
forms.list; `schemaName` запрашивает варианты тем же fixed query endpoint с
выбранным `site` как typed dependency. Constructor не превращает пустой select
в свободный ввод.

`Delete submission` вызывает `forms.delete` только для выбранной записи и
требует `plugins.forms-db.write`. Перед mutation Gateway возвращает
неисполняющий `428 confirmation_required` с одноразовым token; Constructor
показывает объявленное confirmation-сообщение и повторяет неизменный запрос
только после явного подтверждения. Оба запроса используют один
`Idempotency-Key`, а digest Surface передаётся через `If-Match`. Gateway
создаёт audit record с actor, instance, site, schemaName, record ID и outcome;
plugin получает минимальный typed input. Полный handshake описан в
[Plugin Admin Pages](/plugins/admin-pages).
Surface action объявляет `inputSchema` для `recordId` и `rowInput`
`{"recordId":"id"}`; поэтому UI передаёт ровно ID выбранной строки, а не весь
объект submission.

### Storage configuration

Страница видна при `plugins.forms-db.write` и рендерит уже существующую
`config.schema`: `driver`, `dsn`, `tablePrefix`. `dsn` является `secret`
write-only field. Save отправляет новый `plugins.<instance>.settings` через
стандартный Gateway config apply с active digest; forms-db не изменяет YAML
напрямую. После успешного apply Gateway invalidates surface cache and
Constructor refreshes schema/status.

Reference surface fixture —
[`forms-db/v1/admin-surface.json`](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/forms-db/v1).
