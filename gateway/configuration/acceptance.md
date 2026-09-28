# Матрица проверки Gateway v1

Это нормативные replacement gates для перехода на
[целевую архитектуру](../architecture/target). Прохождение старых embedded/
external-Caddy тестов не считается приёмкой новой модели.

| Область | Обязательное доказательство |
| --- | --- |
| Bootstrap | `gateway.yaml` принимает только Core state/package paths, один global execution profile, Management bind/TLS и доверенный TUF source. Старые Caddy variants, routes, `site.yaml`, includes и plugin application settings отвергаются. |
| SQLite/config | Полная candidate JSON revision имеет CAS/idempotency/audit; operation journal переживает restart/crash; current/previous pointers и immutable files не расходятся; runtime view строится в памяти. |
| `ConfigApply` | Core push-ит schema-valid versioned JSON каждому требуемому endpoint; plugin atomic-apply делает exact revision/digest ACK; compensation не выдаёт ложный success; secret bytes отсутствуют. |
| Supervised plugins | Только TUF-trusted catalog identity; подпись/digest/rollback/platform/compatibility/safe extraction проверены; inherited listener/bootstrap, process restart/backoff/shutdown и release rollback подтверждены real child-process E2E. |
| External plugins | Core не имеет install/start/stop/restart и Docker/Kubernetes client; explicit per-replica endpoints/identities проходят mTLS, handshake/config/dispatch/health; failed replica изолируется, reconnect не replay-ит Call. |
| Plugin protocol | Typed unary/stream handlers; local identity bootstrap; remote PEM/SPIFFE mTLS; signed CRL rotation/revocation; exact ConfigApply/DispatchApply; deadlines, cancellation, backpressure, message boundaries и close-races имеют executable conformance. |
| Plugin interactions | Deny-by-default caller→target/capability/mode; полный `DispatchApply` generation получает identity-bound ACK от каждой ожидаемой replica; direct calls работают, запрещённые/stale identities отклоняются, Core не proxy-ит payload. |
| Cookies и HTTP actions | Входящие cookies проходят per-instance/capability allow-list; ordinary и HttpOnly actions валидируются атомарно; response-start до headers/101 не частичен; утечки cookie/action values отсутствуют во всех diagnostics. |
| Caddy plugin | Ровно одна replica и один plugin binary с Caddy-L4; ConfigApply JSON→runtime apply атомарен; HTTP/1.1–3, TLS/ACME, static/proxy, WebSocket negotiation/messages, SSE, TCP/UDP проходят real child-process tests. |
| Caddy storage/Admin Surface | ACME/CertMagic и immutable site artifacts переживают process/container restart на persistent storage; `current`/`previous` и rollback согласованы; site upload проверяется по digest/архиву/manifest. Все Caddy actions идут через generic authorized plugin Admin Surface. |
| Management security | API закрыт от public traffic; authorization выполняется для каждого запроса, аудит redacted; web service credential остаётся backend-only; desktop SSH ограничен loopback port-forward; management/workload roots раздельны. |
| Recovery/backup | Kill/reopen tests закрывают каждый Core journal crash point; восстановление plugin-specific site/certificate data независимо от Core SQLite backup; незавершённые поколения остаются fenced. |
| Platform | `make check`, `go vet ./...`, `make staticcheck-u1000`, Linux/macOS builds и Docker smoke отдельно для `supervised` и `external` deployments проходят. |

Производственный readiness не объявляется, пока любой обязательный gate
остаётся непроверенным. Полный план этапов см. в [roadmap](../architecture/v1-migration-roadmap).
