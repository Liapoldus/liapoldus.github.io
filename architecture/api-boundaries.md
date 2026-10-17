# API boundaries экосистемы

| Surface | Владелец | Клиенты | Назначение |
| --- | --- | --- | --- |
| Core Management API | Core | Standalone CLI, CI | Canonical bundles, service instances с фиксированными endpoints, generic JSON settings, operations, access и audit. |
| Service SDK REST | `service-sdk/` | Core и каждый service | Общий технический lifecycle, identity, manifest/schema, `Reload`, exact config pull, readiness, logging, безопасные errors и universal SDK endpoints `GET /healthz` и `GET /metrics`. |
| Wool | `wool/` | Сервисы | Только direct service-to-service calls/streams и настраиваемый transport/security; Core и product services не являются зависимостями. |
| service Admin Surface | Core как защищённый фасад, service как владелец capability | Инструмент управления | Schema-ограниченные административные данные и actions; клиент не соединяется с service напрямую. |
| Public traffic | Server service | Browser, TCP/UDP clients, upstream services | HTTP/TLS обработка и direct service dispatch по разрешённым Wool edges. |
| Caddy runtime management | Server service | Только сам Server service | Производная внутренняя runtime-конфигурация; не является публичным Core API или независимым source of truth. |

## Конфигурация и desired state

Все product services используют один SDK-owned observability surface. `GET
/healthz` и `GET /metrics` фиксируются versioned SDK contract; handlers,
универсальный health response и Prometheus exposition формирует Service SDK из
своего collector. Product code не содержит параллельных реализаций, путей или
response shapes этих endpoints. Публичный listener service-а подключает тот же
SDK observability handler, а не переопределяет его.

Core — один экземпляр и единственный источник желаемой конфигурации всех
сервисов. Он сохраняет versioned raw JSON generations и active pointers в
SQLite, строит immutable in-memory snapshot, затем вызывает REST `Reload`.
service сам запрашивает у Core конкретную immutable generation, применяет её в
памяти и подтверждает digest.

Caddy traffic configuration — JSON settings Server service, а не Caddyfile,
group-release API или отдельная route DSL Core. Сервис может внутри себя
производить Caddy runtime JSON/Caddyfile-подобные данные, но они производны от
Core revision и не управляются независимо.

## Размещение и обновление

Оператор устанавливает и планово обновляет Core и services выбранными средствами.
Целевые способы размещения — standalone, Docker, Swarm service
и Kubernetes; выбор платформы не создаёт deployment mode внутри Core. Core
никогда не управляет процессами или контейнерами. Он хранит desired settings,
принимает регистрацию живых replicas, наблюдает leases и readiness, выполняет
`Reload` и координирует rollout. Инструменты размещения передают только инфраструктурный
bootstrap, а product JSON меняется через Core Management API.

Release digest из регистрации служит Core для проверки совместимости когорт,
но не подтверждает происхождение бинарника. Доставку и проверку artifact
выполняет операторская автоматизация. Отдельный traffic controller применяет
публичные веса и подтверждает их Core; продвижение stage требует отдельного
одобрения platform-admin.

В v2 Server service имеет отдельное persistent filesystem для
ACME/site runtime data. Core хранит свою конфигурацию в SQLite; Server service
хранит свои сертификаты и immutable site releases отдельно. PostgreSQL и S3 не
требуются для control-plane конфигурации.

## Безопасность и ошибки

Management API отделён от public traffic. Controller backend использует
private HTTPS с mTLS и binding-specific Bearer credential; desktop использует
ограниченный SSH port-forward к loopback API. service-to-service calls идут
напрямую, только при явной caller→target/capability/mode policy и mTLS; Core не
пересылает payload.

Все management errors используют единый versioned Problem Details contract;
внутренние Go errors не копируются в публичные сообщения. Auth data, секреты,
cookie values, grants и capability payloads не включаются в errors, logs или
audit.
