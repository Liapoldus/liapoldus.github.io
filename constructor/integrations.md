# Интеграция Constructor с Gateway

Constructor — отдельный desktop/web продукт и единственный UI настройки
Gateway. Он не запускает Caddy независимо, не подключается напрямую к plugin
processes, не читает SQLite Gateway и не открывает Caddy Admin listener.
Один Constructor может управлять несколькими независимыми Gateways (например,
dev и production); у каждой привязки собственные environment, endpoint,
credential reference и operation history.

## Gateway workspace

Workspace отображает Core health/readiness, глобальный execution profile,
plugin instances и replicas, settings revisions, interaction policies,
operations, access и audit. В Constructor нет Core-понятий Caddy build variant,
`system/application group`, Caddy Admin drift/checkpoint или самостоятельного
route DSL.

Настройка plugin строится вокруг его Manifest/ConfigSchema: Constructor
показывает общие identity/lifecycle/policy поля и schema-driven editor
продуктовых settings. Значения отправляются в Generic Management API; Core
проверяет CAS/schema/authorization, сохраняет desired JSON в SQLite и push-ит
его через `ConfigApply`. Constructor не читает Core SQLite и не является
источником plugin settings.

Caddy traffic configuration редактируется только через settings contract
Caddy plugin. Constructor не генерирует Caddyfile и не преобразует его в
собственную YAML DSL. Пользователь видит operation/revision и применённый
digest; internal Caddy runtime config остаётся производной величиной внутри
plugin.

## Gateway API и управление plugins

Constructor использует только versioned Gateway Management REST API из OpenAPI.
Ни Caddy Admin API, ни plugin gRPC endpoint не доступны браузеру или Constructor
renderer напрямую. Gateway применяет общий authorization, instance/capability
scope, limits, redaction и audit; plugin-owned Admin Surface позволяет
управлять только объявленными страницами/actions. Core не проксирует public
traffic и не публикует Caddy-specific settings API.

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

Constructor передаёт собранный frontend как plugin-owned Admin Surface action
Caddy plugin. Core остаётся защищённым control-plane фасадом: проверяет право
на Gateway binding и plugin scope, передаёт запрос подключённой capability,
сохраняет operation/audit metadata и не принимает local filesystem path.
Caddy plugin потоково проверяет digest, архивную целостность, размеры, число
файлов и безопасные пути; публикует immutable site release и атомарно
обновляет `current`/`previous` в собственном persistent storage.

Форма upload, лимиты, idempotency contract и rollback action фиксируются
versioned Admin Surface contract владельцем `plugins/caddy`. До его появления
Constructor не должен считать старый `/api/groups/{id}/releases`, `/api/sites`,
`site.yaml`, native Caddyfile fragment или доступ к Gateway filesystem
поддерживаемым контрактом. Operation polling выполняется через общий Gateway
Management API.
