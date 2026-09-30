# API boundaries экосистемы

| Surface | Владелец | Клиенты | Назначение |
| --- | --- | --- | --- |
| Core Management API | Core | Constructor backend, CLI, CI/operator | Plugin instances с per-instance deployment mode, provider records, generic JSON settings, policies, operations, access и audit. |
| Plugin SDK REST | Локальная Go-библиотека `plugin-sdk/` | Core и каждый plugin | Общий технический lifecycle, identity, Manifest/schema, `Reload`, exact config pull, health/readiness, metrics/logging и безопасные errors. |
| Plugin protocol | `pluginprotocol` | Plugins | Только plugin-to-plugin communication: registration собственных методов/streams и настраиваемый физический transport/security; Core и plugin products не являются зависимостями. |
| Plugin Admin Surface | Core как защищённый фасад, plugin как владелец capability | Constructor backend | Schema-ограниченные административные страницы и actions; browser не соединяется с plugin напрямую. |
| Public traffic | Server plugin | Browser, TCP/UDP clients, upstream services | HTTP/TLS/L4 обработка и direct plugin dispatch по разрешённым protocol edges. |
| Caddy runtime management | Server plugin | Только сам Server plugin | Производная внутренняя runtime-конфигурация; не является публичным Core API или независимым source of truth. |

## Конфигурация и desired state

Core — один экземпляр и единственный источник желаемой конфигурации всех
сервисов. Он сохраняет versioned raw JSON generations и active pointers в
SQLite, строит immutable in-memory snapshot, затем вызывает REST `Reload`.
Plugin сам запрашивает у Core конкретную immutable generation, применяет её в
памяти и подтверждает digest.

Caddy traffic configuration — JSON settings Server plugin, а не Caddyfile,
group-release API или отдельная route DSL Core. Плагин может внутри себя
производить Caddy runtime JSON/Caddyfile-подобные данные, но они производны от
Core revision и не управляются независимо.

## Per-instance deployment modes

Режим запуска задаётся для каждого plugin instance отдельно; один Core может
сочетать `supervised process`, `managed container` и `external`.

- `supervised process`: Core устанавливает доверенный TUF binary release и
  владеет локальным процессом;
- `managed container`: Core через ограниченный provider adapter создаёт и
  сверяет только принадлежащие ему Compose, Swarm или Kubernetes workloads;
- `external`: workloads создаёт оператор, Core подключается к заданным
  per-replica endpoints и управляет только desired settings, policies, grants
  и health.

В v1 Server plugin имеет одну replica и отдельное persistent filesystem для
ACME/site runtime data. Core хранит свою конфигурацию в SQLite; Server plugin
хранит свои сертификаты и immutable site releases отдельно. PostgreSQL и S3 не
требуются для control-plane конфигурации.

## Безопасность и ошибки

Management API отделён от public traffic. Controller backend использует
private HTTPS с mTLS и binding-specific Bearer credential; desktop использует
ограниченный SSH port-forward к loopback API. Plugin-to-plugin calls идут
напрямую, только при явной caller→target/capability/mode policy и mTLS; Core не
пересылает payload.

Все management errors используют единый versioned Problem Details contract;
внутренние Go errors не копируются в публичные сообщения. Auth data, секреты,
cookie values, grants и capability payloads не включаются в errors, logs или
audit.
