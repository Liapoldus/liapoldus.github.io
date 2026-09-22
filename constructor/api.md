# Constructor API и contracts

Constructor API is versioned under `/api/v1`. JSON responses carry `requestId`;
mutations require `If-Match: <revision>` and optionally `Idempotency-Key`.
Errors use RFC 9457 and [Constructor error catalog](/spec/constructor-errors.json).

| Resource | Operations | Owner |
| --- | --- | --- |
| projects | list, create, get, bind Git, branch, diff, commit | Constructor |
| sites/pages/components | CRUD structured documents, preview, validate | Constructor + Git |
| assets/themes/content | upload/reference, variants, localized values | Constructor |
| snapshots/builds/deployments | create, inspect, cancel, promote, rollback | Constructor |
| environments | CRUD bindings and secret references | Constructor |
| roles/users | CRUD permissions; immutable admin invariant | Constructor |
| gateway bindings | read/validate/apply through Gateway Admin API | Gateway |
| plugin instances | redacted schema/status/action proxy | Plugin via Gateway |

## Core endpoints

```text
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/{projectId}
GET  /api/v1/projects/{projectId}/files/{path}
PUT  /api/v1/projects/{projectId}/files/{path}
POST /api/v1/projects/{projectId}/validate
POST /api/v1/sites/{siteId}/snapshots
POST /api/v1/snapshots/{snapshotId}/builds
POST /api/v1/builds/{buildId}/deployments
POST /api/v1/deployments/{deploymentId}/rollback
GET  /api/v1/gateway-bindings/{bindingId}/state
POST /api/v1/gateway-bindings/{bindingId}/config/validate
PUT  /api/v1/gateway-bindings/{bindingId}/config
GET  /api/v1/plugin-instances/{instanceId}/ui-schema
POST /api/v1/plugin-instances/{instanceId}/actions/{actionId}
```

Constructor never accepts a Gateway config mutation without forwarding the
Gateway active digest. It returns Gateway `problem` unchanged under
`upstreamProblem`, plus Constructor request ID. Plugin schema/action endpoints
are allowed only after Gateway authorization and response redaction.

## Contracts

[Project schema](/spec/constructor-project.schema.json) defines project
manifest, [Component schema](/spec/constructor-component.schema.json) defines
editor metadata, and [Plugin Admin UI contract](/plugins/admin-ui-contract)
defines generated plugin surfaces. OpenAPI is intentionally generated from the
Go API implementation before v1 release; this page is the normative endpoint
inventory until that generator lands.
