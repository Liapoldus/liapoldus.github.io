# Режимы подключения и восстановления plugin

Gateway подключает только явно созданные plugin instances. До добавления
instance ядро не знает конкретный plugin, его название, settings, admin
endpoints или deployment format. Общие transport, Manifest и launch contracts
принадлежат единому repository
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol).

Эта страница фиксирует целевую нормативную механику deployment, readiness,
rollout и восстановления; не все описанные шаги уже реализованы в production
core. В частности, текущий `serve` ещё не подключает plugin lifecycle и
dispatch snapshots к Caddy data plane. Исполняемые части и открытые пробелы
перечислены в [матрице реализации core](implementation#текущее-состояние-core)
и [`core/TODO.md`](https://github.com/Liapoldus/core/blob/main/TODO.md).

## Два режима на уровне instance

Режим задаётся для каждого plugin instance, поэтому один Gateway может
сосуществующе управлять локальными процессами и подключаться к внешним
workloads. Оба используют `liapoldus.plugin.v1`, generic JSON `Call`,
bidirectional `Stream` и standard gRPC health. Автоматического downgrade,
plugin-to-plugin трафика и публичных plugin endpoints нет.

| Режим | Запуск и рестарт процесса | Адрес и trust | Владение Gateway |
| --- | --- | --- | --- |
| `local` | Gateway Supervisor запускает, останавливает и перезапускает child process | Назначенный `127.0.0.1:<port>`, локальная process boundary | Handshake, apply, health, shutdown, bounded restart и dispatch readiness |
| `remote` | Docker/Kubernetes/operator запускает, масштабирует и перезапускает workload | Явный набор стабильных адресов отдельных replicas, production — TLS/mTLS | Control connection, handshake и plugin health; принимает Caddy data-readiness, но не управляет process lifecycle |

Внешняя среда управляет replicas одного logical remote instance. Все replicas,
которые входят в active generation, должны иметь один protocol version, plugin
release, Manifest/capability modes и settings digest. Gateway не обращается к
Docker/Kubernetes API и не обнаруживает membership через оркестратор. Источник
membership — явно сохранённый в Gateway Management API desired set
индивидуальных stable endpoints для instance. Endpoint должен разрешаться ровно
в одну replica, иметь отдельную TLS identity и не быть балансируемым адресом,
скрывающим список backend-ов.

Gateway проверяет каждый endpoint candidate set индивидуально: TLS/mTLS
identity, protocol handshake, Manifest, settings/release digest и health.
Недоступная обязательная replica не получает readiness и блокирует activation
этого candidate generation. Один ответ от общего load-balanced Service не
подтверждает готовность остальных endpoints.

Перед активацией Gateway отправляет каждой Ready replica typed
`DispatchApply` из единого [pluginprotocol v1](protocol). Replica сверяет
generation, logical instance ID, capability/mode scope, свой активный settings
digest и digest выполняемого release, затем возвращает ack с собственной URI
identity и digest Manifest/settings/release/dispatch. Повтор той же generation
допустим только с идентичным scope; меньшая generation и изменение scope при
той же generation отклоняются. Пока все требуемые acknowledgements не собраны,
новый Caddy snapshot не активируется.

## Явный membership и rollout barrier

Для каждого remote instance Management API хранит desired set стабильных
адресов replicas и их ожидаемые logical instance/release identity. Набор
обновляется оператором через Gateway API; подключение Gateway к API
оркестратора не требуется. Обычный балансируемый ClusterIP/Service, Docker
service name с round-robin DNS или другой endpoint, за которым нельзя отдельно
адресовать всех участников, запрещён как единственный endpoint remote instance.
Балансировщик не входит в per-replica `DispatchApply` barrier и не становится
адресом в active dispatch snapshot.

Добавление replica и переключение поколения выполняются так:

1. Оператор разворачивает replica вне active dispatch membership, задаёт ей тот
   же logical instance и целевой release/settings digest, выдаёт уникальный
   сертификат и ждёт собственных workload probes.
2. Оператор сохраняет через Gateway Management API candidate desired set с
   индивидуальным стабильным endpoint этой replica. Текущее поколение и старые
   active endpoints продолжают обслуживать traffic до activation.
3. Gateway control client и Caddy data client отдельно подключаются к каждому
   endpoint candidate set. Они проверяют TLS identity, handshake, health,
   Manifest/modes и digest. Gateway отправляет `DispatchApply` каждому
   участнику; каждый ack должен подтверждать конкретную replica identity и
   generation. Вызов через балансировщик не заменяет индивидуальные ack.
4. Только после всех обязательных per-replica acknowledgements Gateway
   атомарно активирует dispatch/Caddy generation. Caddy направляет новые вызовы
   исключительно endpoints из active set; endpoint вне него не получает новые
   вызовы.
5. При замене/удалении новая generation переводит старый endpoint в
   `draining`: Caddy больше не выбирает его для новых вызовов, но endpoint ещё
   сохраняется в учёте membership для наблюдения и завершения текущих streams.
   После подтверждённого drain либо согласованного drain period отдельный
   последующий Management API update/generation удаляет endpoint из desired
   membership. Затем внешняя CA/operator отзывает его сертификат.

Candidate set для одного поколения должен иметь одинаковый release digest.
Для blue/green rollout новая однородная группа endpoints проходит handshake,
health и `DispatchApply` до переключения; старые endpoints после переключения
остаются draining, но не входят в active Caddy set. При обновлении тех же
стабильных адресов с остановкой процесса без blue/green старое generation может
оставаться active, но traffic к уже заменённому endpoint будет unavailable;
оператор должен считать такой rollout maintenance с возможным простоем. Чтобы
сохранить доступность, использовать blue/green с отдельными стабильными
адресами. Mixed-release набор нельзя активировать как одно поколение. Если
membership, health или digest меняются во время подготовки, candidate
отклоняется, active generation не меняется.

Для удаления без замены сначала активируется generation без удаляемого endpoint,
затем завершается drain/закрываются streams, и только последующей generation
endpoint удаляется из desired membership. Gateway не повторяет `Call` с
неизвестным результатом; Caddy закрывает stream при потере выбранной replica.

Практические стабильные адреса:

- **Docker Compose / Docker:** объявлять replicas отдельными явно именованными
  services/containers (например, `forms-0`, `forms-1`) с DNS alias или
  `host:port`, каждый из которых разрешается ровно в одну replica. Общее Compose
  имя балансируемого service использовать нельзя. Для нескольких hosts —
  стабильные DNS records или статические адреса, достижимые Gateway и Caddy.
- **Kubernetes:** использовать StatefulSet ordinal DNS через headless Service,
  например `plugin-0.plugin-headless.namespace.svc` и
  `plugin-1.plugin-headless.namespace.svc`. Сертификат SAN покрывает фактическое
  имя. Обычный ClusterIP Service не задаётся как весь membership; Gateway не
  вызывает Kubernetes API.
- **Standalone:** задать стабильный DNS name или `host:port` каждого binary
  workload; при смене адреса сначала добавить и проверить новый, затем отдельными
  поколениями выполнить drain/remove старого.

Это сознательный v1 выбор в пользу проверяемого barrier и одинакового поведения
в Docker, Kubernetes и standalone. Масштабирование, изменение числа replicas и
замена endpoint требуют явного Management API update. Автообнаружение endpoints
и автоматическая реакция Gateway на Kubernetes membership не входят в v1.

## Control connection и data connection

Для каждого instance существуют две логически разные gRPC роли клиента:

1. **Gateway control client** принадлежит generic plugin manager. Он выполняет
   `Manifest`, `ConfigSchema`, `ConfigApply`, standard health и control/grant
   операции; `Shutdown` используется для local process. Для remote instance
   Gateway отдельно отправляет `DispatchApply` каждому endpoint candidate set.
   Его
   readiness подтверждает, что
   instance принят control plane.
2. **Caddy data client** принадлежит Liapoldus handler module в Caddy. Он сам
   открывает gRPC connection pool к объявленному instance endpoint и вызывает
   только разрешённые `Call`/`Stream` capabilities. Он не проходит через
   Gateway Management API и не получает control-plane полномочия.

Для `local` endpoint оба клиента подключаются к loopback server того же
process. Для `remote` оба подключаются индивидуально к endpoints active desired
set и каждый канал
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

1. Supervisor создаёт ограниченный loopback listener и scoped GrantBroker
   callback, затем запускает executable без application environment,
   application config files и передачи application settings через argv.
   Listener передаётся дочернему процессу как inherited file descriptor.
2. Gateway устанавливает gRPC connection и через typed bootstrap RPC передаёт
   только служебные параметры соединения/GrantBroker. Затем Gateway получает
   Manifest и config schema, проверяет version/capabilities/modes, отправляет
   актуальные settings plugin-у через plugin protocol RPC `ConfigApply` и
   проверяет `grpc.health.v1`. Plugin не запрашивает конфигурацию у Gateway:
   конфигурация всегда доставляется push-вызовом Gateway → plugin.
3. Только готовый instance попадает в новый immutable dispatch generation;
   ошибка запуска или handshake сохраняет предыдущий active generation.
4. При завершении/ошибке процесса Gateway закрывает его connection и помечает
   только его bindings unavailable. Новые вызовы к ним получают bounded
   unavailable; прочий трафик продолжает работу.
5. Supervisor завершает процесс штатной командой и timeout-ом, затем при
   необходимости принудительно останавливает child process tree. Повторный
   запуск использует bounded exponential backoff и заново выполняет typed
   bootstrap, handshake, `ConfigApply` с текущей версией settings и health до
   восстановления dispatch readiness.

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

Каждый endpoint — явно заданный DNS/IP и port одной стабильной replica, не общий
балансируемый Service и не адрес случайной ephemeral Pod. Способы задания
стабильных Docker, Kubernetes и standalone имён приведены выше. Gateway никогда
не запускает, не останавливает и не перезапускает удалённый
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
Plugin workload слушает единый protocol-defined `0.0.0.0:50051` внутри
контейнера/хоста; внешний DNS/IP и Service port могут отличаться через port
mapping, но Gateway endpoint остаётся фиксированным для каждой replica.
Реализация server listener использует SDK `ListenRemoteTLS`; TLS certificate,
private key и workload-only trust bundle передаются SDK как operational
credentials от platform identity provider, а не как application settings,
env или plugin Bootstrap fields. Канонический port/TLS contract —
[remote-listener.json](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/remote-listener.json).

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
endpoint membership update, per-replica readiness/DispatchApply ack,
rollout/drain/remove и rejection load-balanced-only endpoint; uniform release mismatch; уникальные
replica certificates, invalid/revoked identity и rotation; handshake повторно
на новом connection; cancellation и закрытие in-flight Stream без replay;
отказ одного instance при работающих несвязанных routes; no downgrade и
отсутствие plugin-to-plugin трафика. Нормативная wire-схема и JSON contracts
остаются только в [pluginprotocol](protocol).
