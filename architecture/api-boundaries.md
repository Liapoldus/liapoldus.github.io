# API boundaries экосистемы

| Surface | Владелец | Клиенты | Назначение |
| --- | --- | --- | --- |
| Gateway Management API | Core | Constructor backend, CLI, CI/operator | Общие plugin instances, generic JSON settings, endpoints, install lifecycle согласно execution profile, interaction policies, operations, access и audit. |
| Plugin protocol | `pluginprotocol` | Core и plugins | Versioned lifecycle/control, `ConfigApply`, `DispatchApply`, capability `Call`/`Stream`, grants и workload mTLS. |
| Plugin Admin Surface | Core как защищённый фасад, plugin как владелец capability | Constructor backend | Schema-ограниченные административные страницы и actions; browser не соединяется с plugin напрямую. |
| Public traffic | Caddy plugin | Browser, TCP/UDP clients, upstream services | HTTP/TLS/L4 обработка и direct plugin dispatch по разрешённым protocol edges. |
| Caddy runtime management | Caddy plugin | Только сам Caddy plugin | Производная внутренняя runtime-конфигурация; не является публичным Core API или независимым source of truth. |

## Конфигурация и desired state

Core — один экземпляр и единственный источник желаемой конфигурации всех
сервисов. Он сохраняет versioned JSON revisions и active pointers в SQLite,
строит immutable in-memory snapshot и передаёт конфигурацию plugins push-вызовом
`ConfigApply`. Plugin не обращается к Core за конфигом, а применяет полученную
revision в своём процессе и подтверждает её digest.

Caddy traffic configuration — JSON settings Caddy plugin, а не Caddyfile,
group-release API или отдельная route DSL Core. Плагин может внутри себя
производить Caddy runtime JSON/Caddyfile-подобные данные, но они производны от
Core revision и не управляются независимо.

## Runtime profiles

Один profile действует на весь Core:

- `supervised`: Core устанавливает только доверенные TUF package releases и
  supervises локальные процессы;
- `external`: operator/container orchestrator управляет процессами, Core
  подключается к заданным endpoints и управляет только desired settings,
  protocol generations и health.

В v1 Caddy plugin имеет одну replica и отдельное persistent filesystem для
ACME/site runtime data. Core хранит свою конфигурацию в SQLite; Caddy plugin
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
