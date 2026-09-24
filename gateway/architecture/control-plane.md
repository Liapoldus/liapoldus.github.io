# Control plane Gateway

Эта страница фиксирует состав одного Gateway runtime: bootstrap settings,
границы с Caddy, группу изменений и хранение. API payloads и поля не описываются
повторно: их канон — [OpenAPI](../api/openapi) и
[`gateway.schema.json`](/spec/gateway.schema.json).

## Владение конфигурацией

| Задача | Источник истины | Кто изменяет |
| --- | --- | --- |
| Пути состояния/artifacts, Management bind/trust и Caddy build variant | Минимальный `gateway.yaml` | Оператор или конфигурационное управление процесса; изменение требует restart либо документированного безопасного reload bootstrap. |
| Traffic listeners, TLS sites, proxy, static, WebSocket, TCP/UDP | Native Caddyfile fragments в групповых revisions | Constructor или Management API. |
| Глобальные Caddy options | Caddyfile `system` group | Только platform-admin; влияет на полный snapshot. |
| Plugin instances, endpoints, settings, limits и grants | Plugin management API/resources | Platform-admin; независимый lifecycle от group releases. |
| Caddy Admin native JSON mutations | Полный Caddy Admin pass-through через Gateway; на Caddy доступен только private local Admin API/IPC | Platform-admin; каждый mutation checkpointed и audit-ится. |

Gateway не преобразует произвольный Caddy JSON в Caddyfile и не представляет
маршруты своей DSL-схемой. Узкие Caddy modules связывают Caddy request/runtime
напрямую с plugin gRPC clients или immutable static roots. На пользовательском
request path handler не вызывает Management API, application use cases или
SQLite; control plane заранее публикует ему immutable dispatch snapshot.

## Запуск и композиция Caddy

Gateway работает с одним из двух обязательных build variants:

- `embedded`: Caddy и обязательные modules скомпилированы в Gateway executable;
- `external`: Gateway запускает заданный compatible custom Caddy executable.

В embedded варианте lifecycle Caddy совпадает с lifecycle Gateway: один
процесс, один deployment unit и прямой in-process обмен immutable snapshot.
Сбой Gateway останавливает и data plane; процессный supervisor внешней среды
перезапускает Gateway.

В external варианте Gateway запускает и supervises совместимый Caddy как
дочерний процесс в том же host/container/Pod. Это не самостоятельно
развёрнутый Caddy service или sidecar, не управляемый Gateway. Закрытый Admin
API Caddy привязывается к permissioned Unix socket в private state directory;
доступ к socket ограничен владельцем и группой процесса. Такой способ
поддерживается официальной конфигурацией Caddy Admin API. Его handler
обращается к plugin напрямую по gRPC; control plane не пересылает клиентские
request/response bodies. Admin API нельзя публиковать наружу.

Gateway контролирует startup, graceful shutdown, exit status и restart
external Caddy с ограниченным backoff. Потеря Caddy переводит data plane в
unready, но Management API остаётся доступным для диагностики и восстановления.
Встроенный и внешний variants имеют один lifecycle контракт конфигурации и
обязаны проходить общую parity suite.

Внешний Caddy обязан содержать одинаковую версию Liapoldus app/module и
Caddy-L4. Это не произвольный установленный Caddy или удалённый Caddy service.
Формат custom build и включение modules
опираются на [официальный механизм сборки Caddy](https://caddyserver.com/docs/build)
и [регистрацию Caddy modules](https://caddyserver.com/docs/extending-caddy).
CI хранит build manifest с версиями и сравнивает оба варианта conformance
suite. External binary должен совпадать по Liapoldus module manifest и версиям;
простой upstream Caddy не может загрузить Gateway Go runtime динамически.

Подготовка конфигурации проходит в таком порядке:

1. Прочитать текущие active group revision IDs и plugin instance references.
2. Собрать полный candidate Caddyfile: глобальный блок `system`, затем
   фрагменты application groups в стабильном порядке по group ID.
3. Разрешить только Gateway-owned artifact references и secret references;
   не подставлять plaintext values в сохраняемый Caddyfile.
4. Запустить Caddyfile adapt/validation целевого Caddy build и проверить
   module availability, listener conflicts и frontend root bindings.
5. Записать immutable candidate config и plugin dispatch snapshot, проверить
   digest и зафиксировать operation/activation journal в SQLite.
6. Сформировать candidate in-memory RuntimeSnapshot с общим generation ID;
   выполнить Caddy adaptation и проверить все Caddyfile bindings по Manifest,
   включая capability→mode.
7. Активировать целый generation в embedded Caddy либо передать его external
   Caddy через private Admin Unix socket и получить acknowledgement.
8. Атомарно опубликовать in-memory pointer и обновить current/previous в SQLite
   CAS transaction; завершить durable operation.
9. При ошибке оставить старый runtime и pointers active, а candidate сохранить
   как failed/staged. Crash recovery сверяет journal, pointers, immutable files
   и Caddy generation до открытия публичных listener-ов. Если состояние нельзя
   восстановить однозначно, data plane остаётся fenced до reconciliation.

Если подготовка или activation завершилась ошибкой, операция не получает
успешный статус, прежние `current`/`previous` и in-memory snapshot сохраняются,
а candidate остаётся доступен для диагностики. Runtime activation и SQLite
pointers — две отдельные durable границы, поэтому journal и
compensation/recovery обязательны; нельзя обещать распределённую
SQLite+Caddy транзакцию. ACME issuance может завершиться позже: успешная
активация конфигурации не означает готовность сертификата.

## Группы

`system` — ровно одна группа глобальных options. Каждая application group
одновременно активна и управляет своим namespace Caddyfile и frontend roots.
Публикация одной группы пересобирает и активирует полный snapshot всех групп,
чтобы Caddy runtime никогда не видел неполный набор глобальных options и sites.

Группа может ссылаться на plugin instance ID и объявленные им capability.
Ссылка проверяется на существование и соответствие manifest, включая
поддерживаемый capability mode, при подготовке snapshot. Настройки plugin не
являются частью revision группы: изменение
plugin settings имеет отдельную API-транзакцию, audit и runtime apply. Откат
группы не возвращает plugin settings назад.

### Liapoldus Caddyfile handlers

Чтобы связать native Caddy handlers с Gateway-owned resources, custom build
регистрирует frontend и plugin handlers в соответствующих Caddy namespaces:
HTTP app и Caddy-L4. Они расширяют native Caddyfile, но не вводят параллельный
route/policy язык:

| Directive | Синтаксис | Семантика |
| --- | --- | --- |
| `liapoldus_frontend &lt;id&gt;` | Один frontend ID из artifact текущей group revision. | Передаёт управление immutable-root handler; ID должен существовать в том же revision. Handler не принимает filesystem path. |
| `liapoldus_plugin &lt;instance-id&gt; &lt;capability&gt; &lt;mode&gt;` | В HTTP handler namespace mode равен `call`, `http-stream`, `websocket` или `sse`; в Caddy-L4 handler namespace — `tcp` или `udp`. | Передаёт ограниченный context в соответствующий gRPC `Call`/`Stream` напрямую plugin; handler не открывает plugin socket клиенту и не вызывает Gateway Management API. |

HTTP directives разрешены внутри обычных Caddy `route`/`handle` blocks; L4
handler подключается внутри native Caddy-L4 route. Каждый использует native
matchers/order своего Caddy app. Grammar strict: лишние args, неизвестные IDs,
unbound capabilities, недопустимый mode и недопустимые block contexts дают
ошибку adaptation. Допустимые invocation modes берутся из аддитивного
capability descriptor plugin `Manifest` в `pluginprotocol`.
`liapoldus_frontend` выдаёт только regular files из immutable root, отключает
directory listing и не разрешает symlink traversal. SPA fallback, locales и
redirects задаются native Caddyfile directives, а не hidden Gateway metadata.

Пример application group fragment:

    app.example.test {
        handle /api/forms/* {
    liapoldus_plugin forms forms.submit call
        }
        handle {
            liapoldus_frontend portal
        }
    }

В этой форме matcher и control flow принадлежат Caddy; Liapoldus directives
только обращаются к immutable frontend roots и подключённым capabilities.
`call` выбирает unary JSON request/response, `http-stream`, `websocket` и `sse`
выбирают соответствующий вариант bidi gRPC `Stream`. TCP/UDP capabilities
настраиваются как native Caddy-L4 handler modes и также вызывают plugin
напрямую.

Одна group release состоит из immutable metadata, Caddyfile fragment и
необязательного одного `.tar.gz`. Archive допускает несколько каталогов
`frontends/&lt;frontend-id&gt;/...`; каждый frontend root публикуется как часть
того же revision. Caddyfile, frontend bindings и соответствующий dispatch
generation переключаются атомарно. Точные
multipart поля, idempotency, limits, errors и rollback заданы в
[Group Releases API](../api/groups).

## Native Admin API и drift

Management API авторизует запрос, ограничивает метод/path/body, передаёт его
локальному Caddy Admin API и возвращает native status/body без Liapoldus
перевода schema. В external варианте Admin API слушает permissioned Unix
socket; embedded adapter вызывает runtime внутри процесса. Caddy предоставляет
REST Admin API и `/load` endpoint для загрузки конфигурации; см.
[официальный контракт Caddy Admin API](https://caddyserver.com/docs/api).
Ни firewall rule, ни внешний reverse proxy не должны открывать его.

Каждая mutating операция создаёт checkpoint до изменения Caddy. Runtime digest
сверяется с последним известным digest group composition. Если Admin API
создал несоставное состояние, Gateway выставляет `drift=true` и блокирует
публикацию/rollback групп. Оператор должен выбрать одно действие:

- восстановить checkpoint, созданный перед конкретной mutating operation;
- явно reconcile к полной composition из выбранных group revisions.

Reconcile не обещает разобрать arbitrary JSON и создать исходный Caddyfile.
Перед применением API показывает preview/digest и требует `If-Match` ожидаемого
runtime digest. Все действия имеют durable operation, actor и audit event.

## Хранение и транзакционные инварианты

SQLite является долговременным control-plane store для metadata и
transaction/recovery state. Все изменения group pointers, plugin resources,
keys, operations, idempotency, audit и checkpoints проходят versioned
migrations и явные транзакционные границы. База размещается на локальном диске;
сетевые FS для SQLite не поддерживаются. Включены foreign keys, WAL и
согласованный busy timeout.

Для Gateway выбрана библиотека [`modernc.org/sqlite`](https://pkg.go.dev/modernc.org/sqlite):
pure-Go реализация без CGO, чтобы один Gateway build оставался воспроизводимым
на macOS и Linux и не требовал системного SQLite toolchain. Версия закрепляется
в `core/go.mod`; connection pool ограничен одним соединением, PRAGMA и schema
migrations применяются при открытии базы. Это не меняет SQL/SQLite как внешний
формат persistence и не позволяет приложениям-плагинам открывать Gateway DB.

Caddyfile revisions, plugin settings revisions, frontend artifacts и
необходимые checkpoint snapshots хранятся как content-addressed immutable
files. SQLite сохраняет IDs, digests, revision metadata, active pointers и
operation state; секреты представлены только внешними references. Сначала
файл полностью записан во временный объект, fsync-нут и проверен, затем
публикуется неизменяемым именем, после чего metadata transaction фиксирует
ссылку. Файл-сирота после сбоя допустим и удаляется retention/GC; metadata,
указывающая на отсутствующий или неверный digest, недопустима.

После восстановления active generation Gateway загружает необходимые Caddyfile
и plugin settings, собирает один immutable in-memory RuntimeSnapshot и
передаёт его Caddy. Пользовательский request path читает только активный
snapshot и runtime caches; SQLite и config/artifact files не открываются на
каждый запрос. При обновлении candidate хранится отдельно до успешной
activation; failed candidate не заменяет active generation.

Обязательные invariants:

- `current` указывает на готовую immutable revision либо отсутствует для новой
  группы;
- `previous` указывает на revision, достаточную для полного rollback;
- pointer нельзя обновить до готового runtime candidate;
- release нельзя удалить, пока на неё ссылается current/previous, checkpoint
  или незавершённая operation;
- повтор idempotency key не запускает повторную activation;
- restart после crash завершает или откатывает pending activation до открытия
  traffic listeners;
- plaintext secrets не сохраняются в SQLite, revisions, Caddyfile, audit или
  checkpoint.

## ER-модель

Нормативная визуальная модель: [Gateway control-plane ERD](/diagrams/gateway-control-plane.svg).
Исходник Mermaid хранится в `diagrams/gateway-control-plane.mmd`; поля
физической схемы SQLite уточняются миграциями, но не могут нарушать связи и
инварианты модели.

## Граница безопасности

Gateway Management API имеет отдельный listener и отдельный trust
configuration. У Gateway только одна роль `platform-admin`; она не моделирует
пользователей Constructor. Web Constructor backend подключается по private
HTTPS с mTLS и отдельным Bearer token для каждой Gateway binding. Desktop
использует SSH tunnel через внешний OpenSSH/bastion к loopback Management API,
затем TLS server verification и Gateway Bearer token. Подробный lifecycle
credentials, Constructor RBAC и audit определены в
[аутентификации Management API](../api/authentication) и
[интеграции Constructor](/constructor/integrations).

Management, plugin workload и Caddy/ACME используют отдельные trust domains.
Remote replica identity уникальна для workload и связана с logical plugin
instance. Ни Gateway, ни Caddy не выпускают workload certificates
самостоятельно. Служебный API никогда не публикуется через site listener.
