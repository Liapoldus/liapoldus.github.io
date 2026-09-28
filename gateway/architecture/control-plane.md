# Control plane: SQLite, конфигурации и поколения

Эта страница описывает долговременное состояние Core и правила его
применения. Core всегда один; SQLite — единственная долговременная база Core и
source of truth для desired configuration. Полная ownership-модель находится в
[целевой архитектуре](target), plugin SDK/сообщения — только в
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol).

## Что хранит Core

SQLite содержит только control-plane state, необходимый для повторного
построения runtime snapshot и объяснения операций:

| Данные | Содержимое | Не хранить |
| --- | --- | --- |
| Plugin instance | Стабильный ID, package/release identity, lifecycle profile, безопасное состояние и timestamps. | Product-specific fields или business data plugin. |
| Replica membership | Replica ID, один стабильный endpoint, ожидаемая workload identity, desired/observed status. | Private key, bearer, TLS secret bytes. |
| Config revision | Полный versioned JSON document, schema version, monotonic revision, digest, candidate/active/failed metadata. | Раскрытые secret values. |
| Active pointers | `current` и `previous` revision IDs и active generation. | Копию plugin-owned runtime memory. |
| Interaction policies | Caller, target instance, capability, invocation mode, revision/CAS metadata. | Payload пользователя или произвольные условия исполнения. |
| Replica acknowledgements | Generation, config/dispatch/release digests, identity и время подтверждения. | Сертификаты и credentials целиком. |
| Operations/idempotency | Kind, safe resource IDs, state, input digest, result code, timestamps и deduplication record. | Полный sensitive request/response. |
| Access/audit | Service-key metadata/verifier, actor, mutation/resource/result, before/after digests. | Повторно выдаваемый token, cookies, Authorization, raw body или secret. |

Логическая ER-модель опубликована как
[gateway-config-store.svg](/diagrams/gateway-config-store.svg); исходник —
`diagrams/gateway-config-store.mmd`. Диаграмма не фиксирует имена и типы
будущих физических SQLite migrations: конкретная схема принадлежит `core/`.
База размещается на local persistent filesystem; Core v1 не использует
PostgreSQL, S3, network filesystem или active-active writer.

## Где находится каждый вид данных

- Core SQLite — desired JSON settings, revisions/pointers, endpoint/policy
  metadata, operation journal, access и audit.
- Core local package store — TUF-verified immutable plugin executable
  releases в `supervised` profile; SQLite содержит release identity/digests.
- Plugin storage — application data, опубликованные site artifacts, ACME state
  и сертификатные private keys. Caddy plugin в v1 использует один свой
  persistent volume; Core хранит только Caddy plugin settings и generic
  operation/health metadata.
- In-memory Core snapshot — последнее подтверждённое desired/applied generation
  и быстрые lookup tables для управления. Он атомарно заменяется и никогда не
  используется вместо durable journal.

Секреты находятся во внешних secret providers. SQLite и audit сохраняют только
opaque references, grant metadata, verifier hashes и digest-ы. Core не пишет
plugin settings в отдельные editable YAML files; plugin не получает application
settings через environment, argv или application config files.

## Изменение одной settings revision

Management endpoint принимает полное JSON документное значение и ожидаемый
revision через `If-Match`. Фактические paths, request shapes и response codes
задаются [Management OpenAPI](/spec/management.openapi.yaml).

1. Core аутентифицирует и авторизует actor, проверяет idempotency key и CAS.
   Повтор ключа с тем же digest возвращает ту же operation; конфликтующий
   digest или устаревший revision не меняет состояние.
2. Core получает актуальный `ConfigSchema`, валидирует весь JSON без
   интерпретации product-specific полей, вычисляет digest и сохраняет durable
   candidate revision + operation journal в SQLite. Перед внешним эффектом
   также фиксируется audit intent/result по контракту API.
3. Core выдаёт только разрешённые opaque secret references и соответствующие
   grants. Секретное значение не встраивается в JSON revision или diagnostic.
4. Core push-ит полную candidate revision через `pluginprotocol.ConfigApply`
   каждому требуемому endpoint. Plugin валидирует settings целиком, применяет
   revision атомарно только в собственной памяти и ACK-ает exact revision и
   digest.
5. Core проверяет полноту обязательных replica ACK-ов и commit-ит current/
   previous pointers, operation result и active generation в SQLite. Затем
   атомарно публикует новый immutable in-memory snapshot.
6. После успешной активации отзываются grants предыдущей revision, если их
   жизненный цикл ограничен этой revision. Отказанный candidate остаётся
   наблюдаемой failed operation, но не становится active.

Между SQLite и отдельными processes нет distributed ACID transaction. Гарантия
v1 состоит из durable journal в Core, atomic apply внутри каждой replica,
обязательного ACK barrier и компенсации: при ошибке участнику, уже применившему
candidate, повторно отправляется прежняя active revision. Если compensation или
ACK recovery не подтверждены, операция остаётся несогласованной, затронутые
bindings не считаются ready, а failure явно виден оператору. Нельзя заявлять,
что пользовательские эффекты разных независимых plugins атомарны как одна
общая транзакция.

## Interaction policy и `DispatchApply`

Interaction policy — отдельный generic resource, не поле plugin config и не
подразумеваемое разрешение. Начальное состояние — deny-all. Operator mutation
имеет CAS, idempotency и audit; Core строит полные candidate поколения для
каждой затронутой replica.

`DispatchApply` включает разрешённый inbound `capability → modes` scope и
outbound peer directory с endpoint/identity. Каждая replica устанавливает
полный snapshot атомарно и подтверждает generation, digest, settings/release
digests и собственную проверенную identity. Изменение становится active только
после требуемых индивидуальных ACK. Нельзя использовать acknowledgement
случайной реплики за весь Service. Caddy traffic activation выполняется только
после подтверждения всех targets, на которые ссылается его desired dispatch
generation.

Plugin-to-plugin payload идёт напрямую между plugins по mTLS. Core только
распространяет полномочия и membership, не проксирует запросы. Подробности
reconnect, drain, remote identity и protocol поля принадлежат
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol) и
[plugin deployment](plugin-deployment).

## `current` / `previous` и plugin releases

Core `current/previous` — указатели на версии desired JSON documents и Core-owned
plugin package metadata; они не означают, что Core хранит сайт или сертификат.
Изменение settings плагина не откатывает другие instances. Plugin-specific
Admin Surface action, например публикация Caddy site, создаёт immutable release
в storage самого plugin и управляет его `current/previous`; Core хранит только
безопасные operation metadata и результаты. Перекрёстный rollback всех
несвязанных plugins в v1 не предполагается.

Перед удалением старой revision/package сначала подтверждается, что ни один
current/previous pointer, in-flight operation или active replica на неё не
ссылается. GC — отдельная аудируемая операция, не часть request path.

## Старт, snapshot и crash recovery

Core не активирует plugin dispatch и не объявляет восстановленные operations
ready до проверки собственной БД и применения committed generations. Startup:

1. Открывает local SQLite, выполняет версии миграций и integrity/foreign-key
   checks; при непонятной версии или повреждении не меняет данные молча.
2. Разбирает durable operations/journal, проверяет, какие side effects могли
   успеть произойти, и сравнивает их с active/previous pointers и digest-ами
   локальных Core packages.
3. Строит immutable in-memory snapshot только из committed desired state.
   Candidate revision сама по себе никогда не становится активной при recovery.
4. Подключается к нужным plugin replicas, повторяет handshake, применяет
   committed `ConfigApply` и `DispatchApply`, ждёт exact ACK и health.
5. Завершает/компенсирует незавершённые operations; при неоднозначном состоянии
   оставляет соответствующие bindings fenced и сообщает degraded readiness.

Пользовательский traffic обслуживает Caddy plugin, поэтому Core Management API
не является восстановительным proxy. Caddy plugin, остающийся запущенным при
потере Core, может продолжать последнее локально подтверждённое runtime state;
после собственного рестарта он не должен самостоятельно изобретать desired
config и ждёт повторного push от Core до Ready.

| Crash point | Действие восстановления |
| --- | --- |
| До candidate/journal commit | Старое состояние остаётся authoritative; незаписанных settings нет. |
| После candidate commit, до любого RPC | Candidate остаётся pending/failed; Core отправляет его только после повторной валидации и авторизации operation. |
| После частичных ConfigApply ACK | Сравнить per-replica digest; продолжить ту же идемпотентную revision либо компенсировать её прошлой active revision. |
| После всех ACK, до pointer commit | Повторно запросить/проверить exact applied digest; только затем commit-ить pointers, иначе compensation. |
| После pointer commit, до snapshot publish | Восстановить snapshot из уже committed pointer; SQLite остаётся authoritative. |
| Во время activation/reconnect | Новые вызовы затронутых bindings остаются fenced до согласования generation; неизвестный Call не replay-ить. |

Конкретные durability claims должны иметь TypeScript black-box fault-injection
tests на реальном Core process и SQLite reopen. Один repository unit test или
сборка бинарника не доказывают crash recovery.

## Backup и restore

Backup Core согласует SQLite backup с нужными Core-owned immutable package/config
artifacts и journal generation. Restore сначала проверяет digest-ы и миграции,
затем восстанавливает snapshot и заново применяет desired revisions к plugins;
до exact ACK затронутые bindings не готовы. Caddy plugin data, site releases,
ACME account state и private keys резервируются независимо его volume backup
механизмом. Один Core DB backup не обещает восстановить plugin-owned data.

Применимые public errors и operation statuses определены в
[error catalog](/spec/errors.json), а полные этапы и gates — в
[roadmap v1](v1-migration-roadmap).
