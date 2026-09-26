# План перепроектирования Gateway v1

Эта страница задаёт последовательность перехода и критерии готовности. Она не
заменяет технические контракты: детали Caddyfile, bootstrap-конфигурации,
Management API, хранения и развёртывания описаны в канонических документах,
связанных в разделе [Нормативные документы](#нормативные-документы).

## Цель и границы продукта

Gateway v1 — Liapoldus control plane с отдельным Management listener и один из
двух Caddy data-plane вариантов. В embedded-варианте Caddy входит в Gateway
process; external-вариант запускается Gateway как отдельный supervised child
на том же host/container/Pod. Плагины остаются отдельными процессами/сервисами.
Constructor — отдельный desktop/web-продукт и единственный UI настройки;
один Constructor может управлять несколькими независимыми Gateways.

Настройка трафика выполняется нативным Caddyfile. Gateway не создаёт второй
язык маршрутов, не оборачивает Caddy-конфигурацию в собственную DSL и не
поддерживает `site.yaml` либо YAML `includes`. Собственный API Gateway
управляет bootstrap/runtime metadata, группами, plugin instances, доступом,
операциями и аудитом. Management API никогда не проксирует пользовательский
HTTP/L4 request. Полный native Caddy Admin API доступен оператору через
защищённый Gateway pass-through, но underlying Admin endpoint никогда не
публикуется напрямую.

Liapoldus сохраняет продуктовые гарантии: авторизацию и аудит, декларативные
plugin capabilities, безопасные границы, immutable releases, атомарное
применение и пару `current`/`previous`. Caddy — HTTP/TLS/L4 runtime, а не
публичная поверхность управления Liapoldus.

Порядок обязателен: сначала документация и нормативные контракты, затем их
сборка и проверка; только после этого — отдельные красные TypeScript-тесты и
реализация. До завершения документационного gate production-код не меняется.

## Карта изменений

| Область | Решение | Целевое состояние |
| --- | --- | --- |
| Constructor | Оставить отдельным продуктом | Web backend проверяет Constructor users/roles и связывается с Gateway по private mTLS+Bearer; desktop использует SSH bridge к loopback API; credentials остаются server-side/OS credential store. |
| Gateway | Перепроектировать | Один серверный процесс с SQLite control-plane и Caddy runtime; один из двух Caddy build variants. |
| Traffic config | Заменить | Нативный Caddyfile; без route DSL Gateway, `site.yaml` и YAML includes. |
| Bootstrap config | Сузить | `gateway.yaml` задаёт только state/artifact paths, Management API bind/trust и вариант/путь Caddy. |
| Group releases | Ввести | Неизменяемые revisions из Caddyfile fragment и одного frontend `.tar.gz`; `current`/`previous` — SQLite pointers. |
| Caddy Admin API | Защитить и проксировать | Полный native pass-through через authenticated Gateway boundary; embedded — in-process adapter, external — permissioned Unix socket, оба недоступны снаружи. |
| Data-plane dispatch | Заменить request path | Liapoldus handler в Caddy вызывает plugin напрямую; Gateway хранит desired state и синхронизирует immutable dispatch generations. |
| Plugin protocol | Расширить v1 | Оставить JSON `Call`, расширить gRPC `Stream` на HTTP bidi, WebSocket, SSE и L4; wire/schema source только в `pluginprotocol`. |
| Plugins | Оставить generic runtime | Local-supervised и remote режимы задаются per instance и смешиваются; remote membership — явный набор отдельных endpoint-ов с unique identities и единым release/config digest. Подробности — [plugin deployment](plugin-deployment). |
| TLS | Оставить Caddy-owned | Caddy/CertMagic — единственный ACME owner; domain readiness отдельно от активации конфигурации. |
| L4 | Обязательный Caddy-L4 | Caddy-L4 входит в оба варианта и v1 conformance gate; Go `net` fallback не допускается. |
| Persistence | Зафиксировать durable/runtime границу | SQLite хранит control-plane metadata, plugin settings/revisions, journal и pointers; immutable Caddyfile revisions и большие artifacts — файлы; active runtime — in-memory snapshot. |
| `tls-issuer` | Удалить из активной системы | Не входит в бинарник, конфиги, active docs, tests, сборки и текущие TODO; прежний URL ведёт только на описание Caddy-owned TLS. Удалённый репозиторий/history не трогать. |

## Caddy build variants

Оба варианта обязательны и используют один Gateway runtime, один API, один
формат bootstrap-конфигурации и одну семантику. Публикация v1 блокируется,
пока оба не пройдут общий parity suite.

| Вариант | Запуск | Требования |
| --- | --- | --- |
| `embedded` | Liapoldus Gateway бинарник содержит Caddy и требуемые модули. | Один исполняемый Gateway process; Caddy не является sidecar. |
| `external` | Gateway запускает заданный оператором custom Caddy binary. | Binary должен содержать совместимые Liapoldus Caddy app/module и Caddy-L4; обычный upstream Caddy не поддерживается. |

Custom binary собирается штатным `xcaddy` механизмом из зафиксированных версий
и digest. External variant — отдельный Caddy process в том же deployment unit,
запускаемый и supervises Gateway. Gateway использует Admin API на permissioned
Unix socket для передачи полной Caddy config и immutable dispatch snapshots.
Caddy handler вызывает plugins напрямую, без Gateway data-plane proxy. При
сбое Caddy child Gateway перезапустит только его и пометит data-plane readiness
unhealthy. `gateway.yaml`
выбирает variant и, только для `external`, путь к binary. Версии, module
inventory и parity matrix публикуются в build manifest.

## Bootstrap и traffic configuration

`gateway.yaml` — малый bootstrap-файл. Его исчерпывающая схема и defaults
задаются в [`gateway.schema.json`](/spec/gateway.schema.json). В нём нет
маршрутов, listeners публичного трафика, upstreams, сайтов, политик,
plugin-specific settings, `site.yaml` или include-механизма.

Bootstrap владеет следующими классами настроек:

1. `state.path` — путь к SQLite-файлу и локальному служебному состоянию.
2. `artifacts.path` — каталог неизменяемых Caddyfile revisions и frontend
   release-файлов.
3. `management` — bind API, TLS server identity, management trust roots,
   authentication policy и безопасные пределы запросов.
4. `caddy` — `embedded`/`external`, а для external — путь к совместимому
   custom binary и его ожидаемый module manifest/digest.

Caddyfile остаётся нативным форматом Caddy. Gateway управляет тем, какие
неизменяемые group fragments входят в собранный snapshot, и разрешает только
описанные Liapoldus runtime modules для direct plugin dispatch и immutable
frontend roots. `liapoldus_plugin` в Caddyfile связывает route с instance,
capability и mode; это не отдельная Gateway route DSL. Валидацию и адаптацию
выполняет совместимый Caddy runtime.

## Группы и публикация revisions

Все группы активны одновременно. `system` — специальная группа глобальных
Caddy options. Каждая application group содержит один Caddyfile fragment и
не более одного frontend archive с одним или несколькими корнями вида
`frontends/<id>/...`. Группа ссылается на plugin instances только по ID и
capability; значения plugin settings принадлежат отдельному plugin API и в
revision группы не копируются.

Единственная операция создания revision:
`POST /api/groups/{id}/releases` (`multipart/form-data`). Части запроса:

| Часть | Формат | Обязательное содержимое |
| --- | --- | --- |
| `metadata` | `application/json` | `idempotencyKey`, `expectedCurrentRevision`; для `system` дополнительно применяются глобальные права. |
| `caddyfile` | `text/plain; charset=utf-8` | Один group fragment; пустой fragment допустим только для явно разрешённой пустой app group. |
| `artifact` | `application/gzip` | Ровно один `.tar.gz`; может содержать ноль или несколько разрешённых frontend roots. |

Revision immutable и адресуется SHA-256 digest canonical metadata, fragment и
artifact. Загрузка ограничена до распаковки и при извлечении: compressed size,
uncompressed size, entry count, compression ratio, path length и nesting depth
ограничены контрактом. Запрещены absolute/traversal paths, links, special
files, duplicate/case-colliding paths и неподдерживаемые типы. Распаковка идёт
в private staging; неполный upload, validation error или конфликт не меняют
активное состояние.

`current` и `previous` — revision IDs в SQLite, не обязательные filesystem
symlinks. Публикация сначала проверяет multipart, архив и Caddyfile через
совместимый Caddy adapter, сохраняет immutable candidate и durable operation
journal, компилирует полный in-memory snapshot и только затем активирует один
новый Caddy generation. Ошибка activation оставляет active snapshot и оба
pointer прежними, но сохраняет failed/staged candidate для диагностики.
Успех перемещает старый `current` в `previous`, а новый revision в `current`.
Rollback повторно активирует `previous` группы с тем же prepare/activate
протоколом; он не изменяет plugin settings.

Публикации сериализуются per group. `expectedCurrentRevision` проверяется в той
же транзакционной границе, что и pointer update. Один idempotency key с тем же
actor и digest возвращает исходный operation; тот же key с другим содержимым
даёт conflict. Прерванная активация восстанавливается при старте из durable
operation/checkpoint state и не допускает смешанного runtime/filesystem state.

## Caddy Admin API и согласованность состояния

Gateway предоставляет полный pass-through native Caddy Admin API без
перевода request/response JSON в собственную route model. Прокси доступен
только после Management API authentication и authorization и пишет audit
metadata без тел, содержащих secrets. Caddy Admin API привязан к loopback или
локальному IPC, никогда не публикуется наружу, не получает отдельный внешний
credential endpoint и не обходится прямым сетевым маршрутом.

Каждая Admin API mutation сериализуется и перед применением сохраняет
global checkpoint, включающий runtime snapshot и состав group revisions.
Checkpoint содержит необходимые для восстановления данные и не содержит
plaintext secrets. Read-only Admin вызовы не создают checkpoint.

Ручные native mutations могут создать runtime, который невозможно представить
как набор текущих group revisions. Это состояние называется `drift`. При
drift Gateway:

- продолжает обслуживать уже активный runtime;
- блокирует group publish/rollback, чтобы новая group операция случайно не
  затёрла невидимые изменения;
- показывает drift status, checkpoint ID и audit actor через Management API;
- требует явного `reconcile` к выбранному полному group composition либо
  `restore` checkpoint;
- не обещает обратную генерацию Caddyfile из произвольного native JSON.

Reconcile — атомарная замена полного Caddy snapshot, поэтому его preview,
expected runtime digest, audit и optimistic concurrency обязательны.

## Plugin instances и доверие

Plugin instances управляются через Gateway API; SQLite хранит IDs, settings
payloads, revisions, state и active references. Активные settings копируются в
in-memory runtime snapshot и push-ятся plugin через `ConfigApply`. Group
Caddyfile ссылается на instance по стабильному ID.
Dispatch остаётся generic: core знает общий protocol и границы, но не знает
конкретных плагинов, provider names или прикладной семантики до подключения
declarative plugin contract.

| Режим | Процесс | Транспорт и lifecycle |
| --- | --- | --- |
| `local` | Запускает/supervises Gateway | Назначенный loopback endpoint; handshake/config apply/health до dispatch readiness; bounded restart/backoff. |
| `remote` | Docker, Kubernetes или операторский process manager | Явный desired set индивидуальных стабильных endpoints и mTLS; per-replica identity привязана к logical instance; внешняя среда владеет restart/rollout. Правила membership/barrier/drain — в [канонической странице deployment](plugin-deployment). |

Плагин не соединяется напрямую с другим плагином. Пользовательский capability
traffic идёт `Caddy handler → plugin`; Gateway заранее выбирает разрешённый
instance/capability, подготавливает dispatch snapshot и владеет scoped grants.
Все endpoints active desired set имеют совместимые release/Manifest/settings
digests; каждый новый gRPC channel проходит TLS/protocol handshake. Gateway не
использует load-balanced Service как доказательство per-replica readiness и не
зависит от API Docker/Kubernetes. Подробная последовательность membership,
rollout и drain дана на [канонической странице deployment](plugin-deployment).
Gateway reconnect-ится без replay Call с неизвестным исходом; потерянный Stream
закрывается. Только связанные с нездоровым instance bindings деградируют,
остальной traffic продолжает работать. Management и plugin workload trust roots
раздельны; внешняя CA/operator выпускает per-replica identities и выполняет
rotation/rolling restart. Один launch contract применим к standalone binary,
Docker и Kubernetes.

Constructor вызывает только Gateway Management API и не открывает соединение к
plugin. Для UI service credentials хранятся в системном credential store и
доступны React-коду только через узкий Go backend bridge.

## Management API и безопасность

Management API никогда не размещается на публичном traffic listener. Web
Constructor backend достигает Gateway по private HTTPS с mTLS и отдельным
Bearer token для каждой binding. Desktop bridge использует short-lived SSH
certificate через внешний OpenSSH/bastion, ограниченный port-forward к
loopback API; затем TLS server verification и Bearer token. Gateway хранит
только verifier/hash и имеет единственную роль `platform-admin`; человеческие
роли и environment-scoped permissions живут в Constructor DB. Constructor web
имеет OIDC + обязательный local WebAuthn challenge либо local-password +
короткоживущий JWT + WebAuthn; desktop single-user mode `none` не отключает
Gateway token authorization. Browser никогда не получает Gateway credentials.
Raw token показывается только один раз при bootstrap/create/rotate.

Management TLS identity, desktop SSH CA и trust roots не переиспользуются для
plugin mTLS.
Plaintext секреты запрещены в Caddyfile, API bodies, SQLite, logs, traces и
audit. Конфигурации принимают только внешние secret references, разрешаемые
Gateway при применении; ответы, errors и audit полностью redacted. В частности,
Admin API proxy audit фиксирует actor, method, normalized path, request ID,
result/checkpoint, но не payload/headers/secret values.

## SQLite и файлы

SQLite — долговременное хранилище metadata и activation/recovery state и
использует foreign keys, WAL, `busy_timeout`, транзакции и versioned migrations.
База находится на локальной файловой системе Gateway; сетевые filesystem
database mounts не поддерживаются. Runtime config полностью гидратируется в
immutable in-memory snapshot; request path не читает DB или files. Backup
делается через SQLite online backup API вместе с согласованным snapshot
immutable files/artifacts.

| Данные | Владелец и хранение |
| --- | --- |
| Groups и current/previous | SQLite metadata; pointers обновляются транзакционно после успешной активации. |
| Group revisions | SQLite IDs/digests/pointers + immutable Caddyfile и frontend archives в `artifacts.path`. |
| Plugin instances/settings | SQLite metadata, settings payloads, revisions/digests/state; active settings — in-memory; secret values — только external references. |
| Service keys | SQLite verifier/hash, role, lifecycle и metadata; исходный token не хранится. |
| Operations/idempotency | SQLite, включая durable activation/recovery state и сроки retention. |
| Audit | SQLite append-only events с retention; никаких тел запросов и секретов. |
| Caddy checkpoints | SQLite metadata + immutable snapshot artifact, необходимый для restore. |
| TLS/ACME internal state | Владение Caddy/CertMagic в защищённом state area; не дублировать ACME аккаунт в Gateway. |

ER-модель является частью канона и хранится как исходник
[`diagrams/gateway-control-plane.mmd`](/diagrams/gateway-control-plane.svg).
Schema migrations обязаны сохранять ссылки current/previous и immutable
revision rows; удаление revision, на который ссылается pointer или checkpoint,
запрещено.

## TLS и L4

Caddy/CertMagic — единственный владелец ACME issuance, challenges, renewal и
сертификатного состояния. DNS-01 provider modules статически включаются при
сборке. Список DNS-провайдеров не фиксируется до инвентаризации требований.
Валидный Caddy snapshot активируется без ожидания ACME; готовность и ошибки
сертификата отслеживаются отдельно по домену. Caddy Admin API наружу не
открывается. Domain renew/revoke доступны только через Liapoldus API,
описываемый в [OpenAPI](../api/openapi).

Caddy-L4 ([исходный проект](https://github.com/mholt/caddy-l4)) обязателен в embedded и external variant и проходит один полный
conformance gate для TCP/UDP relay, limits, cancellation, reload и обеих
платформ. Успех нельзя заменить проверкой только сборки. Caddy-L4 помечен
экспериментальным; если gate не пройден, v1 остаётся заблокированным до
исправления/совместимого релиза. Fallback на Go `net` или `gnet` не вводится.
P2P в v1 означает relay к заданному peer без discovery, rendezvous или NAT
traversal.

## План этапов и gates

| Этап | Результат | Обязательный gate |
| --- | --- | --- |
| 0. Инвентаризация | Зафиксированы dirty/untracked изменения и проверки каждого репозитория; пользовательская работа сохранена. | Read-only status/diff до правок. |
| 1. Документация | Русскоязычный канон: Caddyfile, группы, API, in-memory runtime/SQLite durability, security modes, plugin orchestration/replicas, оба Caddy variants, Constructor и deployment. | VitePress build; устранены противоречия и устаревшие страницы. |
| 2. Contracts | Bootstrap/OpenAPI/security contracts и v1 Stream schemas/vectors обновлены в их source repositories. | Schema/OpenAPI validation; digest manifest согласован; plugin wire source только в `pluginprotocol`. |
| 3. Test baseline | Отдельная TS unit/integration/E2E спецификация Caddy direct dispatch и всех Stream modes. | Сначала red tests; нет Go `*_test.go` в production packages. |
| 4. Bootstrap/control plane | Минимальный `gateway.yaml`, SQLite metadata, config files, in-memory snapshots, Management auth, keys, audit и operations. | Startup hydration/crash recovery, redaction, web mTLS+Bearer и SSH-forwarded access tests; audit pagination в stable append-sequence order, opaque cursor, limit 50/100 и 90-дневный retention. |
| 5. Caddy integration | Embedded и supervised external process; native directive, private snapshot sync, direct plugin handler; full Admin pass-through. | Одинаковые module manifest/semantics; Admin endpoint private; sync/load failure сохраняет прежние generations. |
| 6. Group releases | Multipart upload, safe extraction, immutable revisions, `current`/`previous`, atomic full snapshot. | Конкурентная публикация, rollback, crash recovery, failure preserves active state. |
| 7. Admin mutation safety | Checkpoint, drift detection, reconcile/restore и deploy block. | Нельзя затереть native mutations незаметно; восстановление после crash. |
| 8. Plugins/security | Mixed local-supervised + remote replicas from explicit stable endpoint sets, per-replica mTLS identity, separate control/data client identities, scoped grants, direct Caddy-to-plugin data path и plugin-owned cookie lifecycle за Gateway-owned boundary. | Per-replica endpoint/readiness/`DispatchApply` barrier, safe rollout/drain, no orchestrator API dependency, reconnect/no replay; certificate scope/rotation/revocation; no downgrade/peer traffic; cookie allow-list в отдельной SQLite policy на пару instance/capability, `GET`/`PUT` с strong ETag/`If-Match` CAS и audit, активация candidate dispatch generation до durable commit с rollback; typed ordinary/HttpOnly actions, atomic rejection и redaction. External Caddy policy mutation остаётся недоступной до private snapshot-sync gate. См. [deployment](plugin-deployment) и [cookie boundary](cookies). |
| 9. Runtime parity | HTTP/TLS/ACME, HTTP/1.1–3, HTTP bidi, WebSocket, SSE, static, proxy, TCP/UDP Caddy-L4. | Оба build variants, macOS/Linux; Caddy-L4 и direct-dispatch gates обязательны, fallback запрещён. |
| 10. Release readiness | Один Gateway product, контейнерные и операторские инструкции, Constructor integration. | `make check`, `go vet ./...`, `go build ./...`, Docker smoke и полный E2E/security suite. |

Для каждого кодового инкремента сначала создаются отдельные красные TypeScript
тесты под `tests/`, затем минимальная реализация. Изменения не публикуются и не
коммитятся без отдельного запроса. Завершённые этапы отмечаются в TODO
соответствующего репозитория; общий порядок и архитектура остаются только здесь.

## Нормативные документы

- [Архитектура Gateway и control plane](control-plane)
- [Bootstrap `gateway.yaml`](../configuration/bootstrap)
- [Management API и Caddy Admin API](../api/)
- [Group Releases API](../api/groups)
- [Безопасность и доступ](../configuration/security)
- [Режимы подключения plugins](plugin-deployment)
- [Единый plugin protocol v1](protocol)
- [Gateway cookie boundary и статус runtime-интеграции](cookies)
- [Caddy runtime и L4](../configuration/transports)
- [Constructor — Gateway UI](../../constructor/integrations)
- [Gateway OpenAPI](/spec/management.openapi.yaml)
- [Gateway bootstrap schema](/spec/gateway.schema.json)
- [TODO core](https://github.com/Liapoldus/core/blob/main/TODO.md)
- [TODO pluginprotocol](https://github.com/Liapoldus/pluginprotocol/blob/main/TODO.md)
- [TODO Constructor](https://github.com/Liapoldus/Constructor/blob/main/todo.md)
