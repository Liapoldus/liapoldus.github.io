# Sites API

`GET /api/sites` перечисляет named site resources с source type и состоянием.
Списки используют opaque `cursor` и `limit` 1–100.

| Source | Доступные операции | Guarantee |
| --- | --- | --- |
| `release` | publish, versions, rollback | immutable releases, atomic pointers |
| `directory` | read state | read-only root; без publish и rollback |

`POST /api/sites/{slug}/publish` и `/rollback` требуют idempotency key.
Повтор с тем же actor и body возвращает сохранённый результат в течение 24 h;
другой body с тем же actor и key даёт `409 idempotency_conflict`. Для directory
source обе операции дают `409 site_source_immutable`. Успешный publish фиксирует
`site_published` в authenticated audit и обновляет release pointers атомарно.

Обе операции требуют поле `expectedCurrentRevision` в JSON body: SHA-256
revision, прочитанную из `GET /api/sites`, либо `null`, если release ещё нет.
Сравнение и переключение указателей выполняются под одной registry lock.
Отсутствующее поле или неверный revision дают `400`; несовпадение возвращает
`409 release_revision_conflict` с `expectedRevision` и `currentRevision` и не
меняет `current`/`previous`. Rollback проверяет revision текущего release тем же
образом. Повтор idempotency key с тем же body возвращает сохранённый результат,
включая после смены current; другой body с тем же key возвращает conflict.

Publish и rollback сериализуются межпроцессной exclusive lock в
`registry/sites/<slug>/.publish.lock` (mode `0600`). Пока lock принадлежит
работающему процессу, запрос завершается `409 publish_in_progress` (CLI — exit
code `4`); указатели release не меняются. Метаданные lock содержат PID,
`startedAt` в UTC, случайный `nonce` и lease `15m`. Если процесс-владелец
завершился или lease истёк и lock ОС больше не удерживается, следующая операция
восстанавливает lock и пишет audit action `publish_lock_recovered`; затем
операция продолжается. Ошибка или конфликт revision не меняют `current` и
`previous`.
