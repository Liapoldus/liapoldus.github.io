# Audit и operations API

`GET /api/audit` возвращает paginated audit records: actor, action, resource,
result, `digestBefore`, `digestAfter` и `requestId`. Записи хранятся в JSONL по
UTC-дате в `${registry.path}/audit/YYYY-MM-DD.jsonl`, удаляются после 90 дней и
сохраняются при перезапуске Gateway. Если `registry.path` не указан, используется
каталог `registry` рядом с активным конфигурационным файлом. Секреты и private
material исключены до записи. Для общего static token указывается actor
`static-token`, для service account — его ID.

Событие успешной публикации release имеет action `site_published`; source path
не включается в audit record.

Вызов отката release записывается с action `site_rolled_back`: `succeeded` после
переключения указателей релизов или `failed`, если проверка версии либо операция
отката завершилась ошибкой. Запись содержит slug сайта, actor и request ID, но
не содержит путь к registry или release.

Операции restart plugin, TLS renew/revoke и другие длительные действия отвечают
`202` с `operationId`. `GET /api/operations/{id}` возвращает `pending`,
`running`, `succeeded` или `failed`; terminal ответ содержит `result` либо RFC
9457 `problem`. Operation хранится 24 часа.

Локальные JSONL audit, retention, logs, Prometheus и OTLP — в
[deployment observability](/gateway/deploy/observability).
