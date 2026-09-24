# Интеграция Constructor с Gateway

Constructor — отдельный desktop/web продукт и единственный UI настройки
Gateway. Он не запускает Caddy независимо, не подключается напрямую к plugin
processes, не читает SQLite Gateway и не открывает Caddy Admin listener.
Один Constructor может управлять несколькими независимыми Gateways (например,
dev и production); у каждой привязки собственные environment, endpoint,
credential reference и operation history.

## Gateway workspace

Workspace отображает server status, application/system groups, revisions,
plugin instances, operations, audit, Caddy build variant и drift state. Traffic
configuration редактируется как native Caddyfile. Constructor не переводит
Caddyfile в собственную YAML route DSL и не владеет альтернативной моделью
listeners/upstreams/policies.

Редактор групп предоставляет редактирование Caddyfile fragment, обозреватель
immutable frontend roots, привязку plugin instance IDs/capabilities без
копирования settings в revision, preview полного snapshot, публикацию одним
multipart запросом, operation polling, current/previous history и rollback.
При drift UI блокирует публикацию и предлагает checkpoint restore/reconcile.

System group доступна только пользователям Constructor с соответствующим
`gateway.configure` permission на выбранную Gateway binding. Она предупреждает,
что global Caddy options затрагивают все application groups.

## Gateway API и Caddy Admin

Constructor использует Management REST API из OpenAPI. Полный native Caddy
Admin API может открываться в отдельной raw-json/diagnostic view, но только
через Gateway endpoint и с checkpoint semantics. UI не открывает Caddy Admin
listener напрямую и не скрывает за собой второй route schema.

Конкретные HTTP contracts не дублируются здесь: канон —
[Gateway OpenAPI](/gateway/api/openapi).

## Доступ к Gateway

В web-режиме браузер обращается только к Constructor backend. Backend выполняет
role/environment authorization, затем подключается к private Gateway
Management API по HTTPS с mTLS и отдельным Bearer `platform-admin` service token
на каждую Gateway binding. Сертификат и token хранятся в server-side secret
storage, не в Constructor DB/browser. Constructor audit сохраняет end-user,
role, environment, target Gateway, operation и результат; Gateway audit видит
Controller binding identity.

В desktop `none` режиме Constructor использует Go SSH bridge и short-lived SSH
user certificate через внешний OpenSSH/bastion. SSH разрешён только для
port-forward к loopback Management API, без shell, SFTP или forwarding на
произвольный адрес. Внутри туннеля bridge проверяет TLS server certificate и
передаёт Gateway Bearer token из OS credential store. Desktop не требует
client mTLS certificate. Без Constructor login доступен только локальный
single-user desktop; удалённый Gateway всегда требует SSH tunnel и
platform-admin token.

Trust roots Constructor web backend↔Gateway, desktop SSH CA, Gateway↔plugin и
Caddy/ACME раздельны. Constructor не получает plugin certificates/grants, не
становится workload CA и не передаёт Gateway credentials React renderer.
Подробная auth/RBAC модель — в [governance](governance), API security — в
[Gateway authentication](/gateway/api/authentication).

## Plugin Admin pages

Plugin Admin UI загружается через фиксированные Gateway endpoints и
declarative surface contract. Gateway выполняет authorization, capability
dispatch, validation, redaction и audit. Constructor не discovers plugin URLs,
не соединяется с gRPC/plugin endpoint и не запускает executable code от plugin.

UI lifecycle, digest-bound surface и разрешённые widgets описаны в
[Plugin Admin Pages](/plugins/admin-pages).

## Публикация frontend

Constructor собирает immutable frontend output и передаёт его как часть
application group release: POST /api/groups/{id}/releases. Multipart metadata
содержит idempotencyKey и expectedCurrentRevision, часть caddyfile — native
Caddyfile fragment, необязательный artifact — один .tar.gz с roots
frontends/&lt;id&gt;/....

Gateway проверяет archive и Caddyfile, извлекает только разрешённые regular
files/directories во staging, строит полный snapshot и активирует revision
вместе с frontend roots. Constructor считает операцию успешной только после
terminal succeeded status и сохраняет revision ID. Retry после disconnect
использует прежний idempotency key и тот же digest. Rollback требует expected
current revision и отдельный idempotency key.

Публикация не использует старый /api/sites, site.yaml, source directory path
или Gateway-visible local filesystem path. Wire contract:
[Group Releases API](/gateway/api/groups).
