# Режимы подключения и восстановления plugin

Gateway подключает только явно созданные plugin instances. До добавления
instance ядро не знает конкретный plugin, его название, settings, admin
endpoints или deployment format. Общие transport, Manifest и launch contracts
принадлежат единому repository
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol).

## Два режима на уровне instance

Режим задаётся для каждого plugin instance, поэтому один Gateway может
сосуществующе управлять локальными процессами и подключаться к внешним
workloads. Оба используют `liapoldus.plugin.v1`, generic JSON `Call`,
bidirectional `Stream` и standard gRPC health. Автоматического downgrade,
plugin-to-plugin трафика и публичных plugin endpoints нет.

| Режим | Запуск и рестарт процесса | Адрес и trust | Владение Gateway |
| --- | --- | --- | --- |
| `local` | Gateway Supervisor запускает, останавливает и перезапускает child process | Назначенный `127.0.0.1:<port>`, локальная process boundary | Handshake, apply, health, shutdown, bounded restart и dispatch readiness |
| `remote` | Docker/Kubernetes/operator запускает, масштабирует и перезапускает workload | Явный стабильный Service endpoint, production — TLS/mTLS | Control connection, handshake и plugin health; принимает Caddy data-readiness, но не управляет process lifecycle |

Внешняя среда управляет replicas одного logical remote instance. Все replicas,
которые отмечены Ready, должны иметь один protocol version, plugin release,
Manifest/capability modes и settings digest. Оркестратор включает Pod в Service
только после успешного `ConfigApply` и health readiness. Gateway проверяет
собственные control connections; Caddy module независимо проверяет TLS identity,
Manifest/config revision и доступность capabilities на каждом своём data
connection. Ошибка любого из каналов не активирует несовместимый dispatch
snapshot.

Перед активацией Gateway отправляет каждой Ready replica typed
`DispatchApply` из единого [pluginprotocol v1](protocol). Replica сверяет
generation, logical instance ID, capability/mode scope, свой активный settings
digest и digest выполняемого release, затем возвращает ack с собственной URI
identity и digest Manifest/settings/release/dispatch. Повтор той же generation
допустим только с идентичным scope; меньшая generation и изменение scope при
той же generation отклоняются. Пока все требуемые acknowledgements не собраны,
новый Caddy snapshot не активируется.

Обычный балансируемый ClusterIP/Service скрывает состав backend replicas и не
может сам по себе доказать, что `DispatchApply` получил ack от каждой из них.
Следовательно, одного адреса Service недостаточно для rollout barrier; способ
получить и индивидуально адресовать все Ready replica endpoints — отдельное
решение, зафиксированное в [roadmap](v1-migration-roadmap) как integration
blocker. Нельзя трактовать один ответ от Service как подтверждение всех replicas.

## Control connection и data connection

Для каждого instance существуют две логически разные gRPC роли клиента:

1. **Gateway control client** принадлежит generic plugin manager. Он выполняет
   `Manifest`, `ConfigSchema`, `ConfigApply`, `DispatchApply`, standard health, `Shutdown` для
   local process и control/grant операции. Его readiness подтверждает, что
   instance принят control plane.
2. **Caddy data client** принадлежит Liapoldus handler module в Caddy. Он сам
   открывает gRPC connection pool к объявленному instance endpoint и вызывает
   только разрешённые `Call`/`Stream` capabilities. Он не проходит через
   Gateway Management API и не получает control-plane полномочия.

Для `local` endpoint оба клиента подключаются к loopback server того же
process. Для `remote` оба подключаются к стабильному Service и каждый канал
самостоятельно выполняет TLS/mTLS и protocol handshake. Gateway не передаёт
Caddy уже открытые connection handles: embedded handler владеет своим pool в
общем процессе, external handler — внутри supervised Caddy child. Внешний
Admin socket передаёт только generation-bound endpoint, capability/mode,
limits и credential/trust references; plaintext keys и установленные gRPC
connections через него не передаются.

Для remote mode используются разные workload identities с разными scopes:
Gateway control identity может выполнять control RPC, Caddy data identity —
только `Call`/`Stream` к разрешённым instances/capabilities. Обе отображаются
на тот же logical Gateway, но не взаимозаменяемы. Их trust roots отделены от
Constructor Management CA, SSH CA и Caddy ACME state. Plugin server проверяет
scope клиентского сертификата на каждом новом channel. Certificate-to-principal
mapping и RPC authorization rules заданы в едином [pluginprotocol v1](protocol);
новые wire/API изменения описываются только там.

Instance получает status `ready` для dispatch только когда control client
подтвердил Manifest/settings/health, а Caddy module подтвердил достижимость data
endpoint и допустимость dispatch generation. При потере любого канала readiness
обновляется для затронутого instance; Caddy прекращает новые вызовы к нему.
Начатые Call/Stream не переносятся и не повторяются. Для external Caddy
подтверждение generation приходит через закрытый Admin IPC; отсутствие ack не
меняет active generation.

## Local: supervised child process

Порядок запуска instance:

1. Supervisor создаёт ограниченный loopback endpoint и scoped GrantBroker
   callback, затем запускает executable с минимальным environment.
2. Gateway устанавливает gRPC connection, получает Manifest и config schema,
   проверяет version/capabilities/modes, применяет settings и проверяет
   `grpc.health.v1`.
3. Только готовый instance попадает в новый immutable dispatch generation;
   ошибка запуска или handshake сохраняет предыдущий active generation.
4. При завершении/ошибке процесса Gateway закрывает его connection и помечает
   только его bindings unavailable. Новые вызовы к ним получают bounded
   unavailable; прочий трафик продолжает работу.
5. Supervisor завершает процесс штатной командой и timeout-ом, затем при
   необходимости принудительно останавливает child process tree. Повторный
   запуск использует bounded exponential backoff и заново выполняет handshake,
   config apply и health до восстановления dispatch readiness.

После успешного control handshake Caddy module открывает собственный
data-plane connection к тому же loopback endpoint. При restart plugin оба
клиентских connection закрываются независимо: Gateway повторяет control
handshake, Caddy пересоздаёт data pool, и generation возвращается в `ready`
только после повторной проверки обоих каналов.

Local transport может быть insecure только для loopback instance в той же
host/process security boundary. Loopback bind не должен принимать внешние
соединения. Gateway stop сначала прекращает новые dispatch, затем посылает
plugin shutdown, ограниченно ждёт streams/process exit и закрывает остаточные
соединения.

## Remote: Docker, Kubernetes и standalone workload

Endpoint — явно заданный DNS/IP и port стабильного Service, не адрес случайной
Pod. Docker Compose может использовать service DNS, Kubernetes — Service DNS.
Gateway никогда не запускает, не останавливает и не перезапускает удалённый
процесс; replicas, rolling rollout, readiness/liveness probes и restart policy
принадлежат operator-у.

Межмашинное соединение обязательно использует TLS/mTLS. Каждая Pod получает
отдельную externally-issued server identity; сертификат одновременно
идентифицирует workload replica и связывает её с заранее зарегистрированным
logical plugin instance. Gateway control client и Caddy data client используют
собственные client identities и проверяют server chain, срок, отзыв,
endpoint/SAN, logical instance binding и отсутствие downgrade. Plugin server
проверяет client certificate scope: control RPC разрешён Gateway identity,
Call/Stream — Caddy identity. Management trust roots,
plugin workload trust roots и Caddy/ACME state разделены. Gateway не является
CA. Private key монтируется из Docker/Kubernetes secret или operator-provided
credential store, не попадает в SQLite, Caddyfile, logs, traces или API output.

Во время rollout оркестратор не направляет новые connections на Pod, пока она
не прошла собственную config apply и readiness. При каждом reconnect обе
клиентские роли повторяют TLS и protocol handshake независимо. Неизвестный результат unary
`Call` автоматически не повторяется: повтор мог бы дважды выполнить
неидемпотентную операцию. Уже открытый HTTP/WebSocket/SSE/TCP/UDP Stream при
потере replica закрывается; он не мигрирует на другую Pod. Новые вызовы
возобновляются после того, как control channel и Caddy data pool снова готовы.
Ни Gateway, ни Caddy не обещают exactly-once для side-effecting plugin calls.

## Деградация, readiness и состояние Caddy

Недоступность одного plugin instance не блокирует весь Gateway. Для связанных
с ним Caddyfile bindings handler выдаёт bounded unavailable; несвязанные
sites/listeners продолжают работу. Management API сообщает состояние instance,
последний безопасный handshake/revision и readiness, не раскрывая secrets.
Candidate Caddyfile с capability или mode, отсутствующим в plugin Manifest,
отвергается до activation. Вызовы не выполняются, если проверенная Manifest
revision не совпадает с активным dispatch snapshot.

Gateway восстанавливает SQLite metadata и immutable files, запускает plugin
control manager и Caddy, строит активный in-memory snapshot и открывает traffic
после успешного recovery Caddy generation. Plugin, который временно недоступен,
не блокирует несвязанный traffic; его отдельные routes остаются degraded.
Если journal или artifact digest не позволяют доказать соответствие active
runtime и durable pointers, Caddy listeners остаются fenced до reconciliation.

GrantBroker остаётся узкой callback-поверхностью plugin → Gateway для одного
scoped secret redemption. Он не передаёт пользовательские HTTP/L4 тела.
Пользовательский путь — `Caddy handler → plugin`; Management API не становится
proxy. В external Caddy-варианте data-plane identity и Gateway control
identity получают только необходимые им network grants.

## Проверки

Приёмка должна запускать процессы в standalone, Docker и Kubernetes-подобных
fixtures и покрывать: локальный graceful shutdown и restart/backoff; remote
Pod readiness, Service reconnect и uniform release mismatch; уникальные
replica certificates, invalid/revoked identity и rotation; handshake повторно
на новом connection; cancellation и закрытие in-flight Stream без replay;
отказ одного instance при работающих несвязанных routes; no downgrade и
отсутствие plugin-to-plugin трафика. Нормативная wire-схема и JSON contracts
остаются только в [pluginprotocol](protocol).
