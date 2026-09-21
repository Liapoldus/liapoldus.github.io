# Кодовая архитектура

Gateway использует направленную архитектуру. Domain содержит только модели,
интерфейсы портов и typed domain errors; допустимы конструкторы, которые
проверяют инварианты и возвращают ошибку. Domain не содержит use cases,
adapter-кода, IO или transport logic. Application реализует use cases одним
плоским Go package; infrastructure подключает внешний мир; presentation
содержит только CLI и Management API. `cmd` — единственный composition root.

```text
cmd/gateway/                 composition root
internal/domain/             models, policies, ports, domain errors
internal/application/        один flat package: compile/apply/publish/rollback use cases
internal/infrastructure/     config/ network/ security/ storage/ plugins/ observability/
internal/presentation/       api/ и cli/
assets/                      статические schemas и contract files без Go-кода
```

![Направление зависимостей](/diagrams/code-layers.svg)

`domain` не импортирует transport, YAML, SQL, filesystem, DNS, TLS/ACME,
protobuf или observability SDK. `application` зависит только от domain ports.
`infrastructure` группирует config compiler/YAML validation, HTTP/TCP/UDP
listeners, DNS, filesystem registry, TLS/auth, plugin IPC и telemetry. Public
HTTP/L4 adapters не живут в presentation. `presentation` не создаёт concrete
adapters; оно вызывает application use cases через API или CLI. Нарушение
направлений проверяет architecture lint в CI.

## Доменные абстракции

| Область | Модели и порты |
| --- | --- |
| Конфигурация | `ConfigSource`, `IncludeResolver`, `SecretResolver`, `Compiler`, `CompiledGraph`, `Revision` |
| Runtime | `RuntimeSnapshot`, `SnapshotStore`, `Listener`, `Connection`, `DatagramFlow` |
| Маршрутизация | `Matcher`, `Condition`, `Route`, `Action`, `PolicyChain` |
| TLS | `TLSProfile`, `CertificateProvider`, `ACMEIssuer`, `CertificateStorage`, `ClientIdentityVerifier` |
| Upstream | `Upstream`, `EndpointResolver`, `HealthChecker`, `LoadBalancer`, `ConnectionPool` |
| Безопасность | `Authenticator`, `TokenVerifier`, `OIDCClient`, `WAFPolicy`, `RateLimiter` |
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
