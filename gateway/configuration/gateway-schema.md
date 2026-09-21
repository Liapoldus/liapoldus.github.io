# Полная схема `gateway.yaml`

Это каноническая схема процесса. Примеры в остальных разделах не расширяют её.
Все неизвестные ключи запрещены; ошибка имеет `code: config_invalid` и YAML path.
Имена именованных ресурсов соответствуют `[a-z][a-z0-9-]{0,62}`. `duration`
принимает Go duration, размер — целый bytes либо `KiB|MiB|GiB`.

## Корень и общие ресурсы

| Путь | Тип | Required / default | Ограничение / ошибка |
| --- | --- | --- | --- |
| `includes` | string[] | `[]` | relative path/glob; cycle → `include_cycle` |
| `variables` | map string | `{}` | scalar substitutions only |
| `secrets` | map `env:…|file:…` | `{}` | unresolved → `secret_unavailable` |
| `registry.path` | absolute/relative path | required | writable directory |
| `sites.<name>.path` | path | required | contains canonical `site.yaml` |
| `management.address` | host:port | `127.0.0.1:9090` | public address → `management_public_bind` |
| `management.serviceAccounts[]` | object[] | `[]` | `id`, `role: platform-admin`, bcrypt `keyHash` required |
| `logging` | object | `{format:json,access:[stdout]}` | only JSON format |
| `metrics.prometheus` | boolean | `true` | exposes authenticated `/metrics` |
| `metrics.otlp.endpoint` | URL | absent | exporter failure is non-fatal |
| `tracing.sampling` | `parent-based|always-on|always-off` | `parent-based` | invalid → `invalid_enum` |

## Listeners, matching и HTTP transforms

| Путь | Тип | Required / default | Ограничение / ошибка |
| --- | --- | --- | --- |
| `listeners.<name>.type` | `http|tcp|udp` | required | selects `routes` or `rules` |
| `.address` | host:port | required | duplicate bind → `address_conflict` |
| `.tls` | profile name / `{mode}` | absent | TCP mode `terminate|passthrough` |
| `.limits.connections` | int | `10000` | positive |
| `.limits.bytesPerSecond` | size/s | `0` | `0` means unlimited |
| `.limits.datagramsPerSecond` | int | `0` | UDP only |
| `.limits.idleTimeout` | duration | `60s` | positive |
| `.routes[]` / `.rules[]` | ordered object[] | `[]` | first matching rule wins |
| `.when` | matcher object | `{}` | RE2 regex; invalid → `invalid_regex` |
| `.then` | action object | required | exactly one terminal target |
| `.then.site|proxy|plugin|redirect|deny` | terminal | one required | multiple → `multiple_terminal_targets` |
| `.then.rewrite` | `{regex,replacement}` | absent | one RE2 rewrite; resulting absolute path |
| `.then.headers` | header actions | absent | `set`, `setIfAbsent`, `delete`; hop-by-hop rejected |
| `.then.cors` | CORS object | absent | see below |
| `.then.cache` | cache policy | absent | client headers only, no body cache |
| `.then.compression` | `br|gzip`[] | `[]` | order is preference |

`when` supports `host`, `method`, `path`, `headers`, `query`, `sourceIp`,
`destinationPort`, `sni`, `alpn`, `tls`, `requestSize`, `connectionAge`,
`all`, `any`, `not`. `path` is `exact|prefix|regex`; numeric conditions are
`gt|gte|lt|lte`.

`cors` has `origins` (required string[]), `methods` (default `GET,HEAD,POST`),
`headers` (default `[]`), `exposeHeaders` (default `[]`), `credentials` (default
`false`) and `maxAge` (default `0s`). Wildcard origin with credentials is invalid.
`cache` is `{visibility: public|private|no-store, maxAge: duration}`. Compression
uses default level and only responses ≥1 KiB; Range and upgrade responses skip it.

## Upstreams и policies

| Путь | Тип | Required / default | Ограничение / ошибка |
| --- | --- | --- | --- |
| `upstreams.<name>.targets[]` | `{address,weight?}` | `[]` | positive weight, URL for HTTP |
| `.discovery` | `{dns,interval}` | absent | interval default `30s` |
| `.healthCheck` | `{path,interval,timeout,healthyAfter,unhealthyAfter}` | absent | defaults `10s,2s,2,3`; TCP allows `{port}` |
| `.balance` | `round-robin|least-connections|hash` | `round-robin` | hash needs `.hash` |
| `.hash` | `{source,name?}` | absent | source `source-ip|header|cookie|query` |
| `.retry` | `{attempts,on}` | `{attempts:0,on:[]}` | on: `connect-failure|timeout|status-502|status-503|status-504` |
| `rateLimits.<name>` | object | required fields | token bucket: `key`, `requests`, `per`, `burst` |
| `.key` | `source-ip|header|cookie|jwt-subject` | required | header/cookie additionally require `name` |
| `wafPolicies.<name>.rules[]` | `{when,then,onError?}` | `[]` | `onError: allow|deny`, default `deny` |
| `.then` | `allow|deny|challenge|limit` | required | `challenge.provider` must exist |

Rate-limit bucket capacity equals `burst`; refill rate equals `requests/per`.
Exhaustion returns `429 rate_limited` and `Retry-After`. WAF `limit` references a
named rate limit. `challenge` returns `403 challenge_required` with provider and
opaque challenge token.

## TLS, identity, data providers и plugins

| Путь | Тип | Required / default | Ограничение / ошибка |
| --- | --- | --- | --- |
| `tlsProfiles.<name>.certificates[]` | `{domains,issuer}` or `{cert,key}` | required | unique normalized domains |
| `.protocols` | `http/1.1|h2|h3`[] | `[http/1.1,h2]` | `h3` requires TLS and UDP bind |
| `.clientAuth.mode` | `require|optional` | absent | `ca` required when present |
| `.securityHeaders` | map | `{}` | only HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Frame-Options |
| `tlsIssuers.<name>` | object | required | `plugin`, `storage`, `directory`, `account.email`, `challenges`, `renewal` |
| `.renewal` | `{before,retry}` | `{before:30d,retry:{initial:5m,max:12h}}` | bounded exponential retry |
| `authPolicies.<name>.oidc` | object | absent | issuer/clientId/clientSecret/redirectUri required |
| `.jwt` | object | absent | jwksUrl, issuers, audiences required |
| `.mtls` | object | absent | identity matcher |
| `dataProviders.<name>` | `{type,path,onError}` | absent | only `type:mmdb`; `onError:allow|deny` |
| `captchaProviders.<name>` | object | required | plugin, verifyUrl, secret required |
| `plugins.<name>` | object | required | binary/config/capabilities required |
| `.limits` | `{calls,timeout,memory}` | `{100,5s,256MiB}` | all positive |
| `.grants.storage` | string[] | `[]` | opaque storage handles only |
| `.grants.secrets[]` | `{name,purpose,domains?}` | `[]` | scoped, revocable grant |

OIDC/JWT/mTLS details are normative in [Безопасности](security); plugin context
and lifecycle — in [Плагины](/plugins/). `dataProviders` atomically reloads an
MMDB file; a lookup failure uses the provider `onError`.
