# Кодовая архитектура

Gateway использует направленную архитектуру. `cmd` — единственный composition
root. Контрактные string values, defaults, schemas и diagnostics хранятся в
static assets, а не в Go source.

```text
cmd/gateway/                 composition root
internal/domain/models/      models, typed errors и validating constructors
internal/domain/interfaces/  domain ports
internal/application/        один flat package: compile/apply/publish/rollback use cases
internal/infrastructure/     config/ network/ security/ storage/ plugins/ observability/
internal/presentation/       api/ и cli/
assets/                      статические schemas и contract files без Go-кода
```

## Правила слоёв

- `internal/domain` содержит ровно `models/` и `interfaces/`. В нём допустимы
  только модели, typed domain errors, validating constructors и ports. Один
  model, error или interface занимает ровно один файл. Domain не содержит use
  cases, adapter-код, IO или transport logic.
- `internal/application` — один flat Go package без вложенных директорий. Он
  реализует use cases и зависит только от domain ports/models.
- `internal/infrastructure` содержит concrete adapters, сгруппированные в
  `config/`, `network/`, `security/`, `storage/`, `plugins/` и
  `observability/`. Здесь находятся YAML compiler/validation, HTTP/TCP/UDP,
  DNS, filesystem registry, TLS/auth, plugin IPC и telemetry.
- `internal/presentation` содержит только `api/` и `cli/`; HTTP/L4 transport
  adapters относятся к `infrastructure/network`.
- `assets/` находится в корне, содержит только static schemas и contract files
  без Go code. Любые contract string values загружаются оттуда.

![Направление зависимостей](/diagrams/code-layers.svg)

`domain` не импортирует transport, YAML, SQL, filesystem, DNS, TLS/ACME,
protobuf или observability SDK. Presentation не создаёт concrete adapters; оно
вызывает application use cases через API или CLI. Нарушение направлений и
структуры проверяет architecture lint в CI.

## Доменные абстракции

| Область | Модели и порты |
| --- | --- |
| Конфигурация | `ConfigSource`, `IncludeResolver`, `SecretResolver`, `Compiler`, `CompiledGraph`, `Revision` |
| Runtime | `RuntimeSnapshot`, `SnapshotStore`, `Listener`, `Connection`, `DatagramFlow` |
| Маршрутизация | `Matcher`, `Condition`, `Route`, `Action`, `PolicyChain` |
| TLS | `TLSProfile`, `CertificateProvider`, `ACMEIssuer`, `CertificateStorage`, `ClientIdentityVerifier` |
| Upstream | `Upstream`, `EndpointResolver`, `HealthChecker`, `LoadBalancer`, `ConnectionPool` |
| Безопасность | `ClientIdentityVerifier`, `WAFPolicy`, `RateLimiter`; identity/OIDC/JWT — capability plugin |
| Registry | `Site`, `Release`, `PublicationStore`, `RollbackService` |
| Plugins | `PluginInstance`, `Capability`, `PluginSession`, `PluginSupervisor`, `ScopedGrantBroker` |
| Управление | `Actor`, `Authorizer`, `AuditLog`, `ConfigWriter` |
| Наблюдаемость | `Telemetry`, `RequestContext`, `Redactor` |

## Контракты и ошибки

Порты возвращают typed domain errors: `ValidationError`, `ReferenceError`,
`RevisionConflict`, `NoHealthyEndpoint`, `PolicyDenied`, `PluginUnavailable`,
`ResourceExhausted` и `ApplyFailed`. Presentation отображает их в YAML-path,
HTTP status или CLI exit code; infrastructure не определяет публичные коды
ответа.

`CertificateStorage` принадлежит Gateway и работает с opaque certificate
handles. `ScopedGrantBroker` создаёт краткоживущий grant только для названных
storage objects, secret purpose и доменов; plugin не получает path, filesystem
handle или доступ к неразрешённому secret. После завершения control-plane call
grant отзывается независимо от результата ACME операции.

Общая библиотека ограничена transport-neutral plugin IPC primitives. Модели
конфигурации, auth и политик не выносятся в shared package: ядро остаётся
единственным владельцем их контракта.
