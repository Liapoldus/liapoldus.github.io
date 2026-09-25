# Audit и operations

Audit и durable operations хранятся в SQLite, а не в JSONL-файлах. Контракт
полей и API pagination задан в [OpenAPI](/spec/management.openapi.yaml).

> **Статус реализации core:** SQLite storage, retention и cursor pagination
> работают. Для успешного `group.create` создание группы и audit row фиксируются
> одной SQLite-транзакцией; если вставка audit row не удаётся, API возвращает
> `503`, а группа не создаётся. Для неуспешной попытки событие записывается до
> ответа; при ошибке append API возвращает `503 audit_unavailable` вместо
> исходного `400`/`409`. Audit остальных mutations и durable-operation
> transitions, а также durable operations storage/API и атомарность других
> mutations ещё не реализованы. Текущий статус и план — в
> [roadmap Gateway v1](../architecture/v1-migration-roadmap#план-этапов-и-gates).

Gateway audit фиксирует actor service-key/Controller-binding ID, action,
resource type/ID, result, timestamp,
request ID и применимые digests. Он не сохраняет Caddyfile/artifact contents,
Admin API request/response bodies, Authorization, secrets, private keys,
cookies, plugin payloads или grant handles. Для Admin mutations записываются
method, normalized path, checkpoint reference и результат без тела.

Операции group publish/rollback, Caddy checkpoint restore/reconcile, plugin
lifecycle и TLS renew/revoke сохраняют state, idempotency fingerprint,
timestamps и safe result/problem. После restart операция восстанавливается или
явно помечается failed/recovery-required; она не теряется в памяти процесса.

Для web-операций Gateway видит только authenticated Constructor binding;
Constructor audit связывает тот же operation ID с end-user, role, environment
и target Gateway. Gateway не принимает непроверенные actor headers.

## Выборка и пагинация

`GET /api/audit` возвращает записи от новых к старым. Порядок детерминирован
монотонной append sequence, назначаемой при добавлении записи; одинаковые или
близкие timestamps не меняют порядок. `cursor` — непрозрачное значение,
возвращённое Gateway в `nextCursor`: клиент передаёт его без разбора и
изменения, чтобы продолжить ту же выборку. `limit` по умолчанию равен 50,
максимум — 100; допустимы значения от 1 до 100. `nextCursor: null` означает,
что следующей страницы нет.

Срок хранения audit — 90 дней. Retention применяется к видимому набору:
записи старше срока удаляются политикой очистки, и API не обещает их выдачу.
API не предоставляет изменение или удаление отдельных записей: добавление
доступно только как append, а удаление старых записей выполняется retention
policy. Пагинация не фиксирует исторический snapshot через весь срок хранения;
если retention удалил записи между запросами страниц, они больше не входят в
доступную выборку.

Audit record содержит `requestId`, а также `beforeDigest` и `afterDigest`,
когда соответствующее состояние существует; digest поля могут быть `null`,
если они неприменимы. Запросные/ответные payloads, секреты и иные чувствительные
данные не становятся частью audit. Точные поля ответа заданы OpenAPI.

Полный storage/ER контракт:
[Control plane](../architecture/control-plane#sqlite-и-файлы).
