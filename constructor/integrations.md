# Интеграция Constructor с Core

Constructor — отдельный desktop/web продукт и единственный UI настройки
Core. Он не запускает Caddy независимо, не подключается напрямую к plugin
processes, не читает SQLite Core и не открывает Caddy Admin listener.
Один Constructor может управлять несколькими независимыми Cores (например,
dev и production); у каждой привязки собственные environment, endpoint,
credential reference и operation history.

## Core workspace

Workspace отображает Core health/readiness, deployment mode каждого plugin
instance, provider metadata там, где выбран `managed container`, plugin instances
и replicas, settings revisions, interaction policies,
operations, access и audit. В Constructor нет Core-понятий Caddy build variant,
`system/application group`, Caddy Admin drift/checkpoint или самостоятельного
route DSL.

Настройка plugin строится вокруг его Manifest/settings schema, доступных через
Plugin SDK REST: Constructor
показывает общие identity/lifecycle/policy поля и schema-driven editor
продуктовых settings. JSON object отправляется напрямую в Generic Management
API; Core проверяет CAS/schema/authorization, сохраняет исходные bytes в SQLite
и вызывает REST `Reload(generation)`. Plugin сам pull-ит exact generation.
Constructor не читает Core SQLite и не является источником plugin settings.

Caddy traffic configuration редактируется только через settings contract
Server plugin. Constructor не генерирует Caddyfile и не преобразует его в
собственную YAML DSL. Пользователь видит operation/revision и применённый
digest; internal Caddy runtime config остаётся производной величиной внутри
plugin.

## Core API и управление plugins

Constructor использует только versioned Core Management REST API из OpenAPI.
Ни Caddy Admin API, ни plugin control/peer endpoint не доступны браузеру или Constructor
renderer напрямую. Core применяет общий authorization, instance/capability
scope, limits, redaction и audit; plugin-owned Admin Surface позволяет
управлять только объявленными страницами/actions. Core не проксирует public
traffic и не публикует Caddy-specific settings API.

Конкретные HTTP contracts не дублируются здесь: канон —
[Core OpenAPI](/core/api/openapi).

## Доступ к Core

В web-режиме браузер обращается только к Constructor backend. Backend выполняет
role/environment authorization, затем подключается к private Core
Management API по HTTPS с mTLS и отдельным Bearer `platform-admin` service token
на каждую Core binding. Сертификат и token хранятся в server-side secret
storage, не в Constructor DB/browser. Constructor audit сохраняет end-user,
role, environment, target Core, operation и результат; Core audit видит
Controller binding identity.

В desktop `none` режиме Constructor использует Go SSH bridge и short-lived SSH
user certificate через внешний OpenSSH/bastion. SSH разрешён только для
port-forward к loopback Management API, без shell, SFTP или forwarding на
произвольный адрес. Внутри туннеля bridge проверяет TLS server certificate и
передаёт Core Bearer token из OS credential store. Desktop не требует
client mTLS certificate. Без Constructor login доступен только локальный
single-user desktop; удалённый Core всегда требует SSH tunnel и
platform-admin token.

Trust roots Constructor web backend↔Core, desktop SSH CA, Core↔plugin и
Caddy/ACME раздельны. Constructor не получает plugin certificates/grants, не
становится workload CA и не передаёт Core credentials React renderer.
Подробная auth/RBAC модель — в [governance](governance), API security — в
[Core authentication](/core/api/authentication).

## Plugin Admin pages

Plugin Admin UI загружается через фиксированные Core endpoints и
declarative surface contract. Core выполняет authorization, capability
dispatch, validation, redaction и audit. Constructor не discovers plugin URLs,
не соединяется с gRPC/plugin endpoint и не запускает executable code от plugin.

UI lifecycle, digest-bound surface и разрешённые widgets описаны в
[Plugin Admin Pages](/plugins/admin-pages).

## Публикация frontend

Constructor передаёт собранный frontend как plugin-owned Admin Surface action
Server plugin. Core остаётся защищённым control-plane фасадом: проверяет право
на Core binding и plugin scope, передаёт запрос подключённой capability,
сохраняет operation/audit metadata и не принимает local filesystem path.
Server plugin потоково проверяет digest, архивную целостность, размеры, число
файлов и безопасные пути; публикует immutable site release и атомарно
обновляет `current`/`previous` в собственном persistent storage.

Форма upload, лимиты, idempotency contract и rollback action фиксируются
versioned Admin Surface contract владельцем `plugins/server`. Operation polling
выполняется через общий Core Management API.
