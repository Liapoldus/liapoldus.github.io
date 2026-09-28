# План перепроектирования и реализации Gateway v1

Это канонический межрепозиторный roadmap. Он задаёт порядок миграции от текущей
кодовой базы к [целевой архитектуре Gateway](target). Все утверждения о новом
поведении — цель и acceptance contract, а не доказательство, что оно уже
реализовано. Текущее evidence ведётся отдельно в
[матрице реализации](implementation) и репозиторных TODO:
[Core](https://github.com/Liapoldus/core/blob/main/TODO.md),
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol/blob/main/TODO.md).

## Цель и неизменяемые рамки

- Один Gateway Core — единственный control plane и единственный writer своего
  SQLite desired state. Core не обслуживает public traffic.
- Caddy — отдельный plugin process/binary, содержащий Caddy и Caddy-L4. Он
  один в v1, получает JSON settings push-вызовом `ConfigApply`, сам применяет
  runtime и слушает public ports.
- На одну установку Core выбирается ровно один global profile: `supervised`
  либо `external`. Первый владеет install/process lifecycle; второй подключается
  к operator-managed plugin workloads и не имеет install/restart API.
- Core остаётся plugin-agnostic. Capabilities, invocation modes, schemas,
  grants, gRPC control/data contracts и SDK-owned workload mTLS принадлежат
  [pluginprotocol](https://github.com/Liapoldus/pluginprotocol).
- Configurations Core хранятся в SQLite; runtime использует immutable
  in-memory generations. Plugin-specific runtime/application data остаются в
  storage plugin-а. PostgreSQL, S3, Core HA и multi-replica Caddy не входят в v1.
- Constructor и `react-lib` заморожены до готовности Gateway v1. Не менять их
  source/TODO и не включать их функциональность в текущие этапы.
- Старые конфиги и API обратной совместимости не требуют; старые URL docs,
  если нужны ссылкам, сохраняются как короткие указатели до отдельного решения.

## Архитектурные рабочие потоки

### Settings и SQLite

`Management API → auth/CAS/schema validation → durable candidate + operation
в SQLite → protocol ConfigApply каждой обязательной replica → exact
revision/digest ACK → SQLite active pointer + immutable in-memory snapshot`.

Это не distributed ACID transaction. Apply внутри каждой replica атомарен;
Core фиксирует active generation после необходимых ACK, компенсирует уже
обновившиеся replicas прежней revision и оставляет unresolved operation
неготовой при неуспехе компенсации. После restart Core восстанавливает только
committed desired state и применяет его заново. Полная state machine, crash
points и backup описаны в [control-plane design](control-plane).

### Plugin startup и settings push

Оба профиля используют общий порядок protocol `Bootstrap → Manifest →
ConfigSchema → ConfigApply → DispatchApply → grpc.health.v1 readiness`. Settings
не поступают plugin-у через environment, argv, application file или pull API.
Local process получает inherited protocol listener и private identity
bootstrap; external process получает identity от своего deployment security
plane. Детали принадлежат [plugin deployment](plugin-deployment) и
[`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol).

### Прямые plugin interactions

Core сохраняет explicit deny-by-default `caller → target/capability/mode`
policy, но capability payload передаётся напрямую по mTLS между plugin-ами.
`DispatchApply` доставляет полный generation/peer identity directory каждой
replica; балансируемый endpoint не подменяет per-replica acknowledgement.

## Последовательность этапов

Каждый этап выполняется законченными вертикальными slices: сначала тест,
показывающий отсутствующее требование, затем реализация и точечные проверки.
Публичный contract меняется только в его репозитории-владельце. Новый этап не
маскирует незелёный предыдущий gate.

| Этап | Конкретный результат | Gate перехода |
| --- | --- | --- |
| 0. Инвентаризация | Для каждого target repo зафиксировать HEAD/branch/status/remotes, ownership всех dirty/untracked файлов, baseline и карту `оставить / адаптировать / заменить / удалить`; отдельно перечислить текущий Core Caddy runtime как миграционный долг. | Ни один чужой файл/commit не потерян; удаление подтверждено через runtime/import/build/test/docs search. |
| 1. Архитектура и контракты | Свести VitePress, OpenAPI, bootstrap schema, errors, settings metadata и ER-модель к одному target: singleton Core/SQLite, два global profiles, generic plugin lifecycle, Caddy plugin, access boundaries, storage/recovery. `pluginprotocol` остаётся единственным wire owner. | `npm run build`; ссылки/sidebar/contracts согласованы; нет активных promise про Caddy-in-Core, Caddy Admin pass-through или `/api/groups`/`/api/tls` в Core. |
| 2. `pluginprotocol` SDK | Сформировать рекомендуемый Go API для typed unary/stream handlers, lifecycle server/client, ConfigApply manager, grants, direct peer clients, mTLS providers и CRL/reconnect. Сохранить v1 namespace и additive compatibility policy. | TypeScript conformance + child-process tests: local listener/bootstrap, JSON schema vectors, ConfigApply/DispatchApply, TLS/CRL, cancellation/backpressure/shutdown, macOS/Linux. |
| 3. Core durable model | Удалить переходную plugin-specific persistence; привести SQLite к generic instances/replicas/config revisions/policies/operations/keys/audit, CAS, idempotency, append-only audit, migrations и source-owned `.sql`. Implement immutable snapshot builder. | Black-box TS: schema migration, validation, stale CAS, audit, no secret persistence, restart snapshot, immutable file digest and request-path no DB reads. |
| 4. Config operations и recovery | Подключить Management mutations к candidate/journal/ConfigApply/exact ACK/pointer commit; ввести compensation, `current/previous`, per-replica generation, fault injection и backup/restore. | Process-level TS E2E crash/kill/reopen at each journal boundary; no false success and no active dangling pointer. |
| 5. Supervised lifecycle | Реализовать TUF bootstrap/rotation, catalog identity selection, signature/digest/platform/protocol checks, safe extraction, immutable releases, inherited listener/bootstrap, bounded supervision/restart/backoff/shutdown and release rollback. | Malicious archive/signature/downgrade tests; actual child process restart; application settings absent from argv/env/files; committed config reapplied before Ready. |
| 6. External/orchestrated lifecycle | Реализовать explicit per-replica endpoint/identity set, PEM/SPIFFE connection, control/data identity separation, mTLS/CRL, reconnect, config+dispatch barrier, rollout/drain visibility. Core never talks to Docker/Kubernetes API. | Docker/Compose and Kubernetes-style fixtures prove replica-bound ACK, failed replica degradation, no replay, no downgrade, removal/drain and readiness after Core reconnect. |
| 7. Generic interactions/security | Подключить policy CAS, deny-by-default direct peer client, scoped secret grants/redemption, redaction, cookie allow-list/action boundary, generic Admin Surface/access/audit and per-request authorization. | Allowed/denied direct calls, stale identity, CRL revocation, one-time/config-scoped grants, normal/HttpOnly cookies, atomic response rejection and zero secret leaks. |
| 8. Caddy plugin | Начальный `plugins/caddy` module/binary создан: принимает versioned native Caddy JSON через `ConfigApply`, валидирует и активирует runtime. Далее перенести HTTP/TLS/HTTP2/3, proxy/static/WebSocket/SSE, TCP/UDP и plugin dispatch; добавить remote lifecycle, persistent recovery и собственную Admin Surface. | Один Caddy child process в обоих deployment profiles; полный smoke HTTP/TLS/ACME/L4/concurrency/restart; persistent ACME/site data; `current/previous` activation/rollback; direct plugin dispatch. |
| 9. Удаление Core legacy | После replacement gates убрать из Core Caddy dependencies/build, old network runtime, Caddy adapters/API/state, old group/site/TLS contracts and dead tests/fixtures. SQL и typed internal errors привести к target rules; mirrors обновлять только из owner source. | Search/build graph доказывают отсутствие Caddy runtime в Core; `make check`, `go vet`, staticcheck, Linux/macOS builds и Docker smoke зелёные. |
| 10. V1 readiness | Свести cross-repository scenarios, security review, backup/restore, failure matrix, runbooks и operator examples; проверить каждую acceptance row на поддержанном deployment matrix. | Полностью зелёна [acceptance matrix](../configuration/acceptance); никакая незакрытая строка не заменяется обещанием TODO. |

## Failure semantics, rollout и data retention

- Plugin, не прошедший Manifest/schema/config/generation/health проверки, остаётся
  вне Ready set. Невозможность одной replica ухудшает только её зависимости.
- Ни `Call` с неизвестным результатом, ни оборванный `Stream` не replay-ятся при
  reconnect/restart.
- Supervisor рестартует только local processes в `supervised`. В `external`
  restart/rollout/drain делает оркестратор; Core обновляет desired membership и
  проверяет acknowledgements.
- Core durable pointer меняется только после полного предусмотренного ACK
  barrier. Compensation failure оставляет operation degraded/fenced, не
  подменяется success.
- Config revisions и plugin packages неизменяемы; garbage collection запрещён,
  пока объект достижим из current/previous, active replica или незавершённой
  operation.
- Core database backup и Caddy plugin volume backup независимы и должны иметь
  согласованные generation metadata; один из них не восстанавливает данные
  другого.

## Source of truth по репозиториям

| Область | Source | TODO |
| --- | --- | --- |
| Normative Gateway architecture, public Management OpenAPI/errors/bootstrap schema | [liapoldus.github.io](https://liapoldus.github.io/gateway/architecture/target) | [Migration roadmap](https://liapoldus.github.io/gateway/architecture/v1-migration-roadmap) |
| SQLite, lifecycle composition, CLI/API implementation | [core](https://github.com/Liapoldus/core) | [core/TODO.md](https://github.com/Liapoldus/core/blob/main/TODO.md) |
| `.proto`, gRPC SDK, plugin JSON contracts and vectors | [pluginprotocol](https://github.com/Liapoldus/pluginprotocol) | [pluginprotocol/TODO.md](https://github.com/Liapoldus/pluginprotocol/blob/main/TODO.md) |
| Caddy runtime, его settings schema и site/certificate state | Начальный workspace module `plugins/caddy` | Перенос ownership ещё не завершён; remote lifecycle и канонический Git remote не настроены. Остаток этапа 8 отслеживается в Core TODO и этом roadmap. |
| CAPTCHA/forms/identity behavior | Corresponding active plugin repository; no product-specific branches in Core | Their lifecycle remains deferred unless needed for generic conformance. |
| Constructor and React SDK | Frozen separate products | No source/TODO work before Gateway v1 completion. |

SQL text belongs in Core-owned `.sql` source embedded at build time, never in
configuration assets. Internal failures use typed Go errors; public status,
error codes, payload shapes, defaults, command flags and user-facing diagnostics
remain versioned contracts. Contract assets are static data, not Go source.

## Definition of v1 complete

Gateway v1 is complete only when all rows in
[acceptance](../configuration/acceptance) pass, including: SQLite and Core
restart recovery; supervised TUF install and rollback; external per-replica
mTLS/CRL/DispatchApply barrier; direct plugin interaction; secrets/cookies and
redaction; Caddy HTTP/TLS/ACME/L4, site release persistence/rollback; failure
isolation; Management authorization/audit; macOS/Linux build targets; full Core
and protocol test gates. A green unit/build subset is not sufficient.
