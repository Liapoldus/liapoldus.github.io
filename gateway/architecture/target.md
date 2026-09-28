# Целевая архитектура Gateway v1

Эта страница — каноническая нормативная цель Gateway v1. Она описывает
архитектуру, к которой должна прийти реализация, и сама по себе не подтверждает
готовность кода. Фактическое состояние и незакрытые проверки ведутся отдельно в
[матрице реализации](implementation) и репозиторных TODO: [Core](https://github.com/Liapoldus/core/blob/main/TODO.md),
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol/blob/main/TODO.md).

## Модель продукта

Gateway Core — единственный экземпляр control plane и единственный источник
desired-конфигурации всех подключённых сервисов. Core сохраняет конфигурацию в
SQLite, строит immutable in-memory generation и передаёт плагинам
версионированный JSON через `ConfigApply`. Запросы пользователя к публичным
сайтам не проходят через Management API.

Caddy — отдельный first-party plugin process с Caddy и Caddy-L4 внутри его
бинарника. Он исполняет публичный HTTP/TLS/L4 traffic. Core не встраивает Caddy,
не запускает отдельный Caddy binary и не содержит Caddy-specific data plane.
В v1 Caddy plugin имеет ровно одну active replica в обоих профилях запуска.

| Владелец | Ответственность |
| --- | --- |
| Core | SQLite desired state, Management API/CLI, общие plugin instances, generic settings, endpoints, grants, interaction policies, audit, operations, установка и supervision в `supervised`-профиле. |
| `pluginprotocol` | Только generic wire/control/transport/security contracts, shared HTTP/Stream boundary и Go SDK. Не содержит product-specific Manifest, settings, capability payloads, errors или admin surfaces. |
| Caddy plugin | Caddy runtime, HTTP/TLS/HTTP3 и Caddy-L4, трансляция своего versioned JSON settings в Caddy config, ACME, опубликованные site artifacts и их `current`/`previous`. |
| Остальные plugins | Свои capabilities, schemas и продуктовые данные; Core не содержит branch-ей для конкретных имён/capabilities. |
| Constructor | Отдельный продукт и клиент Management API; до готовности Gateway v1 заморожен и в этом этапе не меняется. |

## Режимы запуска и ownership процессов

Режим выбирается один раз для всего Core при bootstrap; смешивать local и remote
instances в одном Core v1 нельзя. Core всегда один, active-active и shared
SQLite не поддерживаются. При этом один plugin instance в `external` может
представлять несколько отдельно адресуемых replicas; исключение v1 — Caddy,
для которого допускается ровно одна active replica.

| Профиль | Жизненный цикл | Разрешённые операции Core |
| --- | --- | --- |
| `supervised` | Core устанавливает подписанный plugin release, подготавливает локальную protocol connection, запускает и supervises процесс, применяет настройки и проверяет readiness. | Установка доверенного release, settings, start/stop/restart, health и rollback установленной версии доступны через разрешённые CLI/Management operations и аудитируются. |
| `external` | Оператор или оркестратор устанавливает и запускает plugin. Core подключается к каждому явно заданному replica endpoint и проверяет его identity, Manifest, settings и readiness. | Core меняет desired settings/endpoints/policies, выдаёт grants и отслеживает generations/health. Install/start/stop/restart отсутствуют; за lifecycle отвечает внешний оператор. |

`external` означает отсутствие оркестрации из Core, а не особый сетевой
протокол: Docker Compose, Kubernetes и standalone binaries подключаются по
одинаковому `pluginprotocol`. Core не вызывает Docker/Kubernetes API и не
считает общий load-balanced Service подтверждением состава группы. Desired
membership содержит стабильный endpoint и ожидаемую workload identity каждой
replica; при смене Pod operator обновляет membership через Management API.
Каждая новая gRPC connection проходит mTLS, проверку identity и lifecycle
handshake до готовности к вызовам.

### Последовательность локального запуска

1. Core выбирает immutable release, ранее проверенный по подписанному
   TUF-каталогу, платформе, digest и совместимости protocol.
2. Core открывает ограниченный loopback listener и передаёт его дочернему
   процессу как inherited descriptor. Plugin SDK принимает listener без
   публикации его через application arguments или конфигурационный файл.
3. Parent и child завершают локальный bootstrap через приватный inherited pipe;
   по нему передаются только временные identity/pin данные, нужные для
   установления workload mTLS. Application settings и secret bytes этим путём
   не передаются.
4. Core вызывает protocol `Bootstrap`, `Manifest` и `ConfigSchema`, сверяет
   schema/version, push-ит активный документ через `ConfigApply`, устанавливает
   необходимый `DispatchApply` generation и проверяет protocol health.
5. Только после точных revision/generation acknowledgements instance становится
   готовым для разрешённых dispatch bindings. Неуспешный candidate release не
   заменяет предыдущую active версию.

SDK contract определяет точные bootstrap messages и OS-specific descriptor
details; они не дублируются в Core YAML.

Локальные releases выбираются только по `publisher/name/version` из
TUF-подписанного каталога. Package metadata ограничивает publisher, platform,
binary artifact, digest, release version и protocol compatibility; произвольный
URL из install-запроса не принимается. First-party trust root поставляется с
Core. Установка частных каталогов возможна только отдельной явно
аудируемой операцией с проверкой нового trust root. Пакет распаковывается в
неизменяемый release directory с проверкой traversal, links, типов файлов и
лимитов; активный указатель переключается только после успешного handshake.

## ConfigApply и восстановление

1. Management mutation проходит authentication, authorization, schema
   validation по текущему Manifest/ConfigSchema, revision CAS, idempotency и
   audit. Config document — versioned JSON; Core не интерпретирует
   product-specific fields.
2. Core durable-записывает operation и candidate revision в SQLite. Candidate
   получает собственные revision, digest и schema version; активный pointer не
   меняется. Секреты сохраняются только как external references.
3. Core push-ит полный candidate JSON нужным replicas через `ConfigApply`.
   Plugin полностью валидирует и атомарно заменяет собственную in-memory
   revision, затем подтверждает exact revision/digest. Частичное применение
   внутри одной replica запрещено.
4. Operation завершается успешно и SQLite active pointer/in-memory snapshot
   заменяются только после всех обязательных ACK. Это не distributed
   transaction между SQLite и процессами: если участник отказывает после
   применения другими, Core повторно push-ит прежнюю revision уже обновлённым
   участникам. Ошибка компенсации оставляет operation явно незавершённой и
   блокирует готовность затронутых bindings; Core не маскирует partial state как
   успешный.
5. После рестарта Core сначала проверяет migration version, SQLite integrity,
   foreign keys, durable journal и ссылки на immutable package/artifact files.
   Затем строит in-memory generation из committed desired state, повторно
   применяет config/dispatch к нужным instances и сравнивает acknowledgements.
   Readiness открывается только для согласованного состояния; неизвестное
   состояние не активируется автоматически.
6. Недоступность одного instance деградирует только связанные bindings и
   операции. Остальные plugins продолжают работать. Call с неизвестным итогом
   не replay-ится; оборванные Streams закрываются и запускаются заново только
   новым запросом клиента.

Ни один plugin не получает application-конфигурацию через environment,
аргументы командной строки или application config files. Плагин получает
settings только push-вызовом `ConfigApply` из Core. Секретные значения не
включаются в JSON: instance/revision-scoped grant используется для долгоживущей
конфигурационной зависимости, а краткоживущие права выдаются только на
ограниченную операцию. SDK проверяет grant scope и срок; plugin держит значение
только в памяти и удаляет его при замене revision/shutdown. Точные payloads
При этом capability payload contracts принадлежат plugin repositories;
protocol library переносит opaque JSON и содержит только общие transport/control
shapes.

## Plugin-to-plugin взаимодействие

Core хранит явные правила `caller instance → target instance/capability/mode`.
Политика deny-by-default и не содержит специальных правил для Caddy, CAPTCHA,
identity или других продуктов. Runtime-запрос идёт напрямую по mTLS gRPC от
caller plugin к target plugin; Core не стоит на data path и не пересылает
payload.

`DispatchApply` доставляет монотонное поколение с inbound capability/modes,
разрешёнными callers и outbound peer directory (endpoint + ожидаемая identity).
Каждая replica получает полный snapshot, устанавливает его атомарно и
подтверждает generation, digest и собственную identity. Ответ одного Service
или одной случайной replica не заменяет acknowledgement каждой replica из
desired membership. Core не переводит операцию изменения policy/endpoint в
active, пока обязательные replicas не подтвердили поколение. Удаление peer
сначала прекращает выдачу новых разрешений и drain-ит текущие связи согласно
протокольным deadline, затем фиксирует новое membership.

Desired/applied generations, per-replica состояние, rollout/drain и retry
отображаются как durable operations. При потере Core plugin сохраняет последнее
подтверждённое поколение до reconnect; Core повторно применяет committed
generation после восстановления. Неизвестный результат `Call` не повторяется,
оборванный `Stream` закрывается.

## `pluginprotocol` и workload mTLS

Единственный contract source — репозиторий
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol), package остаётся
`liapoldus.plugin.v1`. `Call` использует versioned JSON payload; общий bidi
`Stream` обслуживает HTTP streaming, WebSocket, SSE и L4. SDK сам регистрирует
typed handlers и предоставляет protocol control lifecycle, gRPC health и
flow-control/cancellation; per-capability protobuf RPC не вводятся.

SDK владеет реализацией workload TLS, client/server connections, identity
verification, credential providers, signed CRL validation и реакцией на
отзыв. Local supervised profile использует временные workload identities,
переданные только через приватный bootstrap channel, после чего все обычные
control/data calls идут по mTLS. Core не является CA и не читает private keys.
External workloads получают identity от внешнего CA; SDK поддерживает
read-only PEM и SPIFFE Workload API. Management API и plugin workload используют
разные trust roots. CRL bundle подписывается и доставляется оператором;
проверка fail-closed. Invalid, expired, stale или revoked identity отвергается
без plaintext downgrade; замена/истечение CRL закрывает затронутые активные
channels и требует нового handshake. Конкретные форматы, rotation и ошибки
определены только в [pluginprotocol](https://github.com/Liapoldus/pluginprotocol).

## Caddy plugin и durable state

Core хранит Caddy plugin settings как versioned JSON revisions в своей SQLite.
Caddy plugin преобразует именно этот JSON в свою Caddy runtime-конфигурацию;
сгенерированный Caddyfile или внутренний Caddy JSON — производный runtime
artifact, не редактируемый source of truth. Ни Caddy Admin API, ни файл
Caddyfile нельзя независимо изменить так, чтобы обойти конфигурацию Core.

Caddy plugin в v1 запускается одной replica и хранит на своём persistent local
filesystem ACME/CertMagic state и опубликованные site releases. `current` и
`previous` ссылаются на immutable release IDs; activation/rollback атомарны в
границах plugin storage. В external profile volume монтируется в единственную
Caddy replica и переживает замену/рестарт Pod или контейнера. PostgreSQL, S3,
shared RWX volume и Caddy HA в v1 не требуются. Масштабирование Caddy выше одной
replica — отдельное будущее изменение: оно потребует общего storage с
распределёнными lock semantics и новым conformance gate; CertMagic координирует
сертификаты между экземплярами только при общем storage
([документация Caddy](https://caddyserver.com/docs/automatic-https)).

Traffic, TLS, listener, proxy, static root, WebSocket/SSE и L4 settings меняются
как versioned JSON settings Caddy plugin через generic Core Management API.
Core проверяет JSON Schema, CAS и authorization, но не переводит JSON в Caddy
config и не знает product fields. Caddy plugin выполняет семантическую
валидацию, строит candidate runtime state и применяет его локально атомарно до
ACK. Site artifact операции принадлежат Admin Surface Caddy plugin; Core
применяет общие authorization, grants, audit и protocol boundary, не добавляя
Caddy-specific group/release API.

ACME issuance/renewal асинхронны: успешно проверенная traffic revision
активируется, даже если новый сертификат ещё выпускается. Сертификатная
готовность и ошибка ACME отслеживаются отдельно по domain через Caddy plugin
Admin Surface. Core не обещает собственного `/api/tls` и не реализует issuer;
DNS-01 provider modules выбираются после инвентаризации требований и встраиваются
в Caddy plugin build. Site upload проверяет digest, gzip/tar integrity,
compressed/uncompressed limits, entry count, compression ratio, traversal,
links, duplicate/case-colliding/NFC-conflicting paths и plugin manifest до
активации immutable release. Точные numeric limits и формы actions закрепляются
versioned Caddy plugin contract, а не угадываются в общей архитектуре.

Публичные listener-ы открывает сам Caddy plugin. В supervised profile оператор
предоставляет процессу необходимые OS grants для выбранных портов; Core не
запускается от root ради Caddy и не передаёт публичные listener sockets. В
Docker/Kubernetes публикацию портов задаёт инфраструктура.

## Management API и безопасность

Management listener полностью отделён от public traffic; Caddy plugin не
становится reverse proxy для этого API. Core управляет generic plugin
instances/settings, installation в `supervised`, desired endpoints в
`external`, interactions, operations, service credentials и audit. API не
предоставляет Caddy Admin pass-through, Caddy TLS endpoints или Caddy group
endpoints. Caddy-specific действия доступны только как plugin-declared Admin
Surface через общую авторизованную protocol boundary.

Management TLS всегда включён. Web Controller backend соединяется по private
HTTPS с mTLS и отдельным Bearer service credential на binding; credential не
попадает в browser. Desktop Go bridge устанавливает ограниченный SSH
port-forward к loopback Management API, проверяет TLS identity Gateway и
читает короткоживущий Bearer credential из OS credential store. SSH policy
разрешает только нужный port forward и запрещает shell, SFTP и agent
forwarding. Core проверяет полномочие `platform-admin` на каждом запросе,
пишет audit без token/body/secret и не размещает Management API за Caddy public
listener. Пользовательские роли и environment-scoped permissions принадлежат
Constructor; отдельный Constructor auth redesign отложен и не меняется в этой
итерации.

## SQLite и модель данных

Core — единственный writer и один экземпляр; единственная долгосрочная БД Core
— SQLite на локальном persistent filesystem. В ней находятся bootstrap-derived
metadata, generic plugin instance records, desired JSON config revisions,
endpoint membership/identity references, interaction policies, active/previous
revision pointers, durable operations/idempotency, per-replica generation
acknowledgements, access-key verifiers/metadata и audit. Сырые secret values и
private keys не сохраняются; SQLite содержит только references и non-secret
metadata. Runtime configuration строится в immutable in-memory snapshot;
SQLite не открывается из plugin/Caddy data-plane handler и не читается для
обслуживания пользовательского traffic.

SQLite хранит желаемое/подтверждённое состояние Core, а не runtime state
внешних plugins. Caddy certificate/private-key material и site bytes принадлежат
его persistent directory. Plugin application data остаются в storage самого
plugin; Core хранит только generic endpoint/settings references и состояние
операций. Filesystem не подменяет SQLite для Core config, а Caddy-generated
runtime JSON не подменяет Core desired JSON.

Большие executable packages остаются immutable files в Core package store;
plugin-owned site/certificate data — в storage самого plugin. SQLite хранит
их IDs/digests/metadata. При загрузке Core выполняет version/migration check,
SQLite integrity и foreign-key validation, проверяет journal/pointers и digest
всех обязательных Core-owned files, затем восстанавливает in-memory snapshot и
согласует его с plugin ACK. Backup Core включает согласованный SQLite backup и
Core-owned versioned package/config artifacts; backup Caddy release/ACME data
выполняется отдельно на его persistent volume. Никаких PostgreSQL/S3
dependencies для v1.

ER-модель целевого control store показывает `plugin_instance`,
`config_revision`, `active_config`, `interaction_rule`, `operation`,
`replica_generation`, `service_key` и `audit_event`. Это logical model, не
обещание готовой физической миграции. Её source diagram находится в
`diagrams/gateway-config-store.mmd`; физические миграции не дублируют desired
JSON в отдельных plugin-specific таблицах.

![ER-модель desired-конфигурации и операций Core](/diagrams/gateway-config-store.svg)

## Обязательные invariants

- Только Core SQLite является source of truth desired-конфигурации.
- Plugin-specific settings не разбираются и не hardcode-ятся в Core.
- Core всегда один; Caddy plugin в v1 также один active instance.
- `ConfigApply` и `DispatchApply` передают полные versioned generations и
  принимают только exact acknowledgement.
- Local и external profile взаимоисключающие; external profile не управляет
  процессами или установкой.
- Plugin-to-plugin соединения разрешаются только явным policy и mTLS.
- Все активные listener-ы принадлежат Caddy plugin; Core не является traffic
  proxy и не включает Caddy runtime.
- Public contracts и ошибки не должны обещать отсутствующие lifecycle,
  endpoint или recovery guarantees.
- Никакие ключи, cookie values, Authorization, grants, secret bytes, raw
  private paths или sensitive payloads не раскрываются в log/error/audit.

Подробный порядок миграции и readiness gates находится в
[плане Gateway v1](v1-migration-roadmap). Protocol source и JSON schemas —
только в [pluginprotocol](https://github.com/Liapoldus/pluginprotocol).
