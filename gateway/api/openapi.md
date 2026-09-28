# OpenAPI Management API

Машиночитаемый Gateway contract находится в
[public/spec/management.openapi.yaml](/spec/management.openapi.yaml).
Единственные Core endpoints управляют plugin desired state, settings apply,
TUF installation только в supervised profile, interaction/cookie policies,
Admin Surface, operations, access и audit.

В новой v1 schema нет `/api/groups`, `/api/caddy/*`, `/api/caddy-state/*`,
`/api/tls/*` и `/api/sites`. Caddy plugin traffic settings передаются как
versioned plugin JSON через generic `ConfigApply`; site releases и сертификаты
управляются plugin Admin Surface. Caddy Admin API не проксируется Management
API.

API требует TLS и Bearer authorization; web Controller дополнительно
подключается по mTLS. Public error semantics находятся в
[errors.json](/spec/errors.json).
