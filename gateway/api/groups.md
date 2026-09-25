# Group Releases API

Group API хранит и активирует revisions нативного Caddyfile вместе с
необязательными frontend artifacts. Точный wire contract — в
[`management.openapi.yaml`](/spec/management.openapi.yaml); здесь зафиксированы
операционные guarantees.

## Ресурсы

- `system` — специальная группа глобальных Caddy options, создаваемая при
  bootstrap и не удаляемая.
- application group — отдельный Caddyfile fragment и набор frontend roots;
  несколько групп активны одновременно.
- revision — неизменяемая комбинация group metadata, Caddyfile fragment и
  digest artifacts.
- `current`/`previous` — SQLite revision references, а не публичные filesystem
  paths или обязательные symlinks.

Group revision может ссылаться на plugin instance IDs, но не содержит
plugin settings/secrets. Несуществующая instance или capability приводит к
ошибке validation; plugin settings обновляются собственными endpoints.

## Создание и архивирование группы

`POST /api/groups` создаёт application group по уникальному ID. Новая группа
не входит в runtime до первой успешной публикации. Группа `system` создаётся
Gateway при инициализации БД и не создаётся/удаляется этим endpoint-ом.
Отсутствующее или некорректное JSON-тело, а также поля, не соответствующие
схеме `GroupCreate` (включая формат ID и обязательные поля), дают `400
invalid_request`; точные ограничения определены в OpenAPI.
Повтор создания существующего ID возвращает `409 group_already_exists`.

`DELETE /api/groups/{id}` архивирует application group: Gateway собирает и
активирует полный snapshot без неё, после чего устанавливает `active=false`.
Её revisions, current/previous IDs и artifacts сохраняются для аудита и
восстановления. Операция требует `If-Match` runtime composition digest и
idempotency key. Архивировать `system` нельзя. `POST
/api/groups/{id}/activate` возвращает группу с последним current revision в
runtime через ту же full-snapshot prepare/activate схему; группа без current
revision сначала должна получить release.

`GET /api/groups/{id}/releases` перечисляет immutable revision metadata с
cursor pagination. `GET /api/groups/{id}/releases/{revisionId}` возвращает
canonical Caddyfile, digests и frontend manifest без server filesystem paths.
Архив целиком не возвращается. Все revisions хранятся до явного безопасного
GC; automatic retention не удаляет их молча. GC не может удалить current,
previous, revision в checkpoint или revision, на которую ссылается durable
operation.

## Публикация

`POST /api/groups/{id}/releases` принимает ровно три multipart parts:

| Имя | Тип | Семантика |
| --- | --- | --- |
| `metadata` | JSON | `idempotencyKey`, `expectedCurrentRevision`; для новой группы expected revision равен `null`. |
| `caddyfile` | UTF-8 text | Один native Caddyfile fragment группы. Named snippets допустимы только внутри fragment этой группы; file/glob imports запрещены, чтобы release не зависел от mutable внешних файлов. |
| `artifact` | gzip tar | Не более одного `.tar.gz`; отсутствие допустимо без frontend roots. |

Архивные корни — `frontends/<id>/...`. Максимальный сжатый размер — 100 MiB,
распакованный объём — 512 MiB, число tar entries — 10 000, compression ratio
— 100:1, один path — 1024 UTF-8 bytes, глубина — 32 сегмента. Полный request
body, включая multipart overhead и Caddyfile, ограничен 101 MiB. Ratio считается
как распакованные file bytes / фактически прочитанные compressed artifact bytes;
нулевой compressed size для непустого output отклоняется. Лимиты нельзя
увеличить из Caddyfile или request metadata.

Архивные корни — `frontends/<id>/...`. Путь не должен выходить из своего
frontend root. Принимаются только regular files и directories; symlinks,
hardlinks, devices, special entries, абсолютные/ traversal-пути, дубли и
case-collision отклоняются. Имена нормализуются в Unicode NFC; пути с NUL,
backslash, empty segment, dot segment или control characters запрещены.
Executable bits, ownership, timestamps, ACLs и extended attributes не
сохраняются. Digest вычисляется Gateway по переданным байтам; он не доверяет
client filename или заявленному digest.

Порядок работы:

1. Проверить actor/role, content type, idempotency и ожидаемый current revision.
2. Потоково принять parts в private staging с hard byte limits.
3. Проверить tar/gzip integrity, безопасно извлечь frontend roots и вычислить
   canonical digests.
4. Адаптировать candidate Caddyfile compatible Caddy build-ом; проверить
   modules, references и всей группы dependencies.
5. Сохранить immutable release и durable operation state.
6. Собрать полный snapshot всех активных групп и подготовить его без смены
   listener/runtime.
7. Атомарно активировать snapshot и транзакционно сдвинуть `previous ← current`,
   `current ← newRevision`.
8. Записать audit и вернуть operation/revision reference.

Ошибка любого этапа до activation сохраняет active snapshot и pointers. Ошибка
при activation приводит к явному rollback candidate и durable recovery marker;
Gateway не отвечает успехом, пока runtime и metadata согласованы.

## Idempotency, concurrency и rollback

Публикация требует `expectedCurrentRevision` как compare-and-swap. Конфликт
возвращает `409` и не изменяет revision pointers. Публикации одной группы
сериализуются; разные group releases могут готовиться параллельно, однако
activation полного Caddy snapshot сериализуется глобально.

Повтор одинакового ключа, actor и content digest возвращает первоначальную
operation. Повтор того же ключа с другим metadata/Caddyfile/archive возвращает
`idempotency_conflict`. Обработка ключа и request fingerprint хранится в
SQLite 24 часа. При retry после disconnect клиент запрашивает
operation по стабильному operation ID либо повторяет неизменённый request.

`POST /api/groups/{id}/rollback` требует expected current revision и выбирает
текущий `previous`. Rollback готовит full snapshot так же, как publish; только
после успешной активации pointers меняются местами. Plugin resources/settings
rollback не затрагивает. Если `previous` отсутствует, API возвращает
нормализованную not-found ошибку без изменения состояния.

## Drift и Admin API

Публикация group release запрещена, пока есть `drift` от native Caddy Admin
API. Ответ содержит status и checkpoint reference, но не raw sensitive
payload. Администратор должен явно восстановить checkpoint либо вызвать
reconcile к определённым group revision IDs. Reconcile требует expected
runtime digest, preview и отдельной audit записи; произвольный JSON назад в
Caddyfile не преобразуется.

Канонический endpoint полного Caddy Admin pass-through и его ограничения
описаны в [OpenAPI](openapi); публичная поверхность Caddy Admin API запрещена.

## Внешние эффекты и безопасность

Архивы не извлекаются в web root до успешной activation. Frontend roots
становятся доступными только через immutable root adapter. Filename — только
метаданные; Gateway не использует его как path. Отклонённые uploads удаляются
из staging после сохранения безопасных audit metadata.

Audit фиксирует actor, group/revision IDs, idempotency fingerprint, operation,
digest, результат и request ID. Не пишутся archive contents, Caddyfile
plaintext с возможными references, Authorization, secret values или private
keys. Secret references должны проходить отдельную allow-listed resolution
policy.
