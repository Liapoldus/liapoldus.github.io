# forms-db

> **Статус:** реализованы memory-, SQLite-, PostgreSQL- и MySQL-хранилища,
> атомарное применение настроек и проверка отправок по переданным JSON Schema
> Draft 2020-12. Equality-фильтр по разрешённому top-level-полю schema и
> защищённая cursor pagination также реализованы. Проверки реальных PostgreSQL
> и MySQL подключаются только при наличии DSN; без соответствующей переменной
> окружения тест помечается `skipped`, поэтому обычный зелёный `go test ./...`
> сам по себе не подтверждает подключение к серверу БД. Полная orchestration
> declarative admin actions через Gateway/Constructor ещё не завершена. Схемы
> не сохраняются в БД: их нужно передавать при каждом применении конфигурации.

Плагин форм: приём и просмотр отправок веб-форм с memory-, SQLite-, PostgreSQL-
или MySQL-хранилищем. Эталонный пример плагина для
[гайда по созданию плагинов](/gateway/architecture/guide).

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

Канонические JSON Schema requests/responses и mapping typed errors принадлежат
forms-db plugin и хранятся в его `contracts/v1/`. Общий protocol SDK переносит
эти payloads как opaque JSON и не содержит forms-db contract.
`site` Gateway берёт из route target, а не от клиента.

### `forms.submit`

```json
{"site":"portal","schemaName":"contact","data":{"name":"Аня","email":"a@example.com"}}
```

`data` валидирует schema, зарегистрированная у instance, и ограничивается 256
полями по plugin payload contract. Неизвестный ключ даёт `validation_failed`.

Конфигурация instance передаёт `schemas` как объект, где ключ — имя схемы, а
значение — JSON Schema. Поддерживается Draft 2020-12; имя должно соответствовать
`^[a-z][a-z0-9_-]{0,63}$`. Core хранит desired plugin settings в SQLite и валидирует их по
schema, но не передаёт plugin-у secret bytes или локальные file paths. Для SQL
DSN конфигурация содержит только opaque secret reference; Gateway прикладывает к
`ConfigApply` instance/revision-scoped grant, по которому plugin отдельно
redeem-ит DSN через GrantBroker. DSN живёт только в памяти активной ревизии и
заменяется атомарно при успешном применении новой конфигурации. Внешняя загрузка
схем и удалённые `$ref` запрещены:
все используемые определения должны находиться внутри самой схемы (например,
в `$defs`). `ConfigApply` сначала компилирует все схемы и готовит новое
хранилище, и только затем атомарно заменяет активную конфигурацию. При ошибке
активные настройки и хранилище остаются без изменений. Plugin держит применённую
revision в памяти; после рестарта Core повторно отправляет durable active
revision до того, как instance считается готовым.

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

Ключ подписи не является plugin setting: Gateway выдаёт plugin-у краткоживущий
scoped grant для `forms.list`, а plugin получает значение только через
`GrantBroker.RedeemGrant` по plugin protocol при обработке конкретного вызова.
Ключ не читается из env или локального файла и не сохраняется plugin-ом между
вызовами; он очищается после создания/использования signer-а. При отсутствии
или недоступности grant `forms.list` завершается fail-closed с
`storage_unavailable`; остальные capabilities могут продолжать работу. Все
replicas, работающие с общим хранилищем, получают один и тот же Gateway-owned
logical key через индивидуальные scoped grants. После ротации ключа ранее
выданные cursors становятся недействительными. Секрет не входит в `ConfigApply`,
настройки форм, базу, ответы или логи.

### `forms.delete`

```json
{"site":"portal","schemaName":"contact","id":"frm_…"}
```

Повторное удаление возвращает `not_found`; mapping в HTTP определяет контракт.

## Конфиг instance

Поддерживаются драйверы `memory`, `sqlite`, `postgres` и `mysql`. `memory` —
значение по умолчанию и не сохраняет записи после перезапуска. SQLite сохраняет
их в указанном файле; PostgreSQL и MySQL подключаются через DSN, полученный по
Gateway-scoped grant. Код содержит SQL adapters для обоих драйверов. Реальные
integration tests подключаются только если заданы `FORMS_DB_POSTGRES_DSN` и/или
`FORMS_DB_MYSQL_DSN`; при отсутствии DSN соответствующий тест явно пропускается.

Пример JSON settings payload, отправляемого Core через `ConfigApply` (это не
локальный application-config файл plugin):

```json
{
  "driver": "sqlite",
  "dsn": "data/forms.db",
  "tablePrefix": "form_"
}
```

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `driver` | `memory`, `sqlite`, `postgres` или `mysql` | `memory` |
| `dsn` | Для SQLite — путь к файлу БД; для PostgreSQL/MySQL — opaque Gateway secret reference. Для `memory` не используется | — |
| `tablePrefix` | префикс таблиц плагина | `form_` |

Для SQLite путь `dsn` разрешается внутри plugin-owned data directory; используйте
постоянный volume, если данные должны переживать пересоздание контейнера. Для
PostgreSQL/MySQL settings содержат только opaque secret reference: Core выдаёт
instance/revision-scoped grant при конфигурировании, а plugin получает реальный
DSN отдельно и держит его в памяти активной revision до её замены или остановки.

Декларация плагина и привязка capability к маршруту — общий синтаксис
[«Обзор и настройка»](/plugins/).

`admin.surface.get` возвращает декларативную страницу из единственного
plugin-owned `contracts/v1/admin-surface.json`; Go adapter читает её из
embedded assets этого плагина.

## Локальная проверка

Из каталога plugin-репозитория:

```bash
go build ./...
go vet ./...
go test ./...
```

Текущий legacy smoke `core/tests/integration/serve-local-plugin-products.test.ts`
собирает настоящий forms-db binary и запускает его как local child process
через Gateway `serve` и embedded Caddy. Это историческое свидетельство
текущего кода, не целевой архитектуры; его заменит smoke отдельного Caddy
plugin process и общего pluginprotocol SDK. Тест вызывает `POST /submit` и
проверяет сохранённую отправку;
он намеренно использует `memory` driver. Это подтверждает local process,
settings/dispatch и unary call, но не SQL-backed Gateway grant flow, удалённый
plugin/mTLS или declarative admin-action orchestration. PostgreSQL/MySQL live
integration покрываются отдельными plugin tests только при заданных DSN.

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

Reference surface fixture: plugin-owned `contracts/v1/admin-surface.json`.
