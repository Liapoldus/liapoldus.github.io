# Constructor API и contracts

Constructor API is versioned under `/api/v1`. JSON object responses carry
`requestId` and the `X-Request-ID` response header; raw canonical project-file
and route-document responses preserve their bytes and carry the header only.
Errors use `application/problem+json` per RFC 9457 with a stable `code`,
`requestId` and `instance`; validation/conflict details are extensions. See the [Problem
schema](/spec/constructor-problem.schema.json) and [Constructor error
catalog](/spec/constructor-errors.json). Mutations require
`If-Match: <revision>` and optionally `Idempotency-Key`.
The resolved-content endpoint carries its exact/default revisions in the typed
request body because one editor document may atomically update multiple files.
Local-first API binds only to a literal loopback IP (`127.0.0.1` or `::1`);
`CONSTRUCTOR_API_ADDR` rejects wildcard, LAN and hostname binds. The server
rejects non-loopback `Host` headers (including DNS-rebinding hosts), and every
browser request carrying `Origin` must come from `localhost` or a loopback IP;
opaque and non-loopback origins are denied for reads as well as mutations.
Native clients without `Origin` remain supported. Preview mutations retain the
same loopback-origin check, and the project process receives a minimal
environment without Constructor or Gateway credentials.

Every mutating route requires a named permission checked by the authorization
middleware before the handler runs. Read-only validation POSTs are explicitly
classified as non-mutating. Unknown mutation methods fail closed under
`admin.roles`; adding a new write endpoint therefore requires an explicit
permission mapping before it can be used. The route-to-permission matrix is
covered by presentation tests.

Request bodies are bounded before decoding: operational JSON requests are at
most 4 KiB; project-file, route-document and merge payloads are at most 10 MiB;
asset uploads are raw binary bodies of at most 25 MiB. An oversized body returns
`413` with code `payload_too_large`; the server never silently validates a
truncated body. Typed JSON requests reject unknown fields and trailing values.

| Resource | Operations | Owner |
| --- | --- | --- |
| projects | list, create, get, activate; Git status/diff/history/branch listing/explicit commit | Constructor |
| sites/pages/components | CRUD structured documents, preview, validate | Constructor + Git |
| assets/themes/content | validated image upload/reference, variants, localized values | Constructor |
| snapshots/builds/deployments | create, inspect, cancel, promote, rollback | Constructor |
| deployment target state | read Gateway and local release revisions before publish | Constructor + Gateway |
| environments | CRUD bindings and secret references | Constructor |
| roles/users | CRUD permissions; immutable admin invariant | Constructor |
| gateway bindings | read/validate/apply through Gateway Admin API | Gateway |
| Gateway plugin Admin UI | fixed Surface/query/action operations | Gateway dispatch; Constructor renders declarative contract |

## Core endpoints

```text
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/{projectId}
GET  /api/v1/projects/active
POST /api/v1/projects/{projectId}/activate
GET  /api/v1/projects/{projectId}/files/{path}
PUT  /api/v1/projects/{projectId}/files/{path}
POST /api/v1/projects/{projectId}/validate
POST /api/v1/project/validate?siteId=<site-id>&locale=<locale> # validate selected locale; omit both for project-wide validation
POST /api/v1/project/generate?siteId=<site-id>&locale=<locale> # generated content artifact
GET  /api/v1/preview                          # local project preview status
POST /api/v1/preview                          # start active project's scripts.dev on loopback
DELETE /api/v1/preview                        # stop preview process tree
GET  /api/v1/project/file?path=<project-file> # local-first foundation
PUT  /api/v1/project/file?path=<project-file> # requires If-Match revision
GET  /api/v1/project/content?siteId=<site-id>&locale=<locale> # resolved editor document and exact/default revisions
PUT  /api/v1/project/content?siteId=<site-id>&locale=<locale> # {base, document, revisions}; atomic locale/shared split-write
GET  /api/v1/project/sites                  # validated Site documents in active project
GET  /api/v1/project/themes                 # validated Theme documents in active project
GET  /api/v1/project/assets                 # validated asset registry and binary integrity
POST /api/v1/project/assets                 # raw image bytes; 25 MiB limit; permission assets.write
POST /api/v1/project/sites                  # clone Site page/locale config; initialize empty content
POST /api/v1/project/pages                   # create page across manifest, Site, route and source
GET  /api/v1/project/routes?environment=development
PUT  /api/v1/project/routes?environment=development # validates graph; requires If-Match
POST /api/v1/project/routes/generate?environment=development # generated React Router artifact
POST /api/v1/snapshots?siteId=<site-id>&locale=<locale> # validate and snapshot selected locale
GET  /api/v1/snapshots
POST /api/v1/snapshots/{snapshotId}/builds
POST /api/v1/builds?snapshotId=<snapshot-id>  # local-first build flow
GET  /api/v1/builds
GET  /api/v1/git/status
GET  /api/v1/git/diff
POST /api/v1/git/commit                    # explicit commit only
GET  /api/v1/git/branches
POST /api/v1/git/branches                  # {name}; create and checkout local branch; requires a clean worktree
POST /api/v1/git/checkout                  # {name}; checkout existing local branch; requires a clean worktree
GET  /api/v1/git/history
GET  /api/v1/deployment-target?siteId=<site-id>&environmentId=<environment-id>
POST /api/v1/repositories/clone?url=<git-url>&target=<relative-path>
POST /api/v1/repositories/worktree?repository=<path>&commit=<sha>&target=<relative-path>
POST /api/v1/project/file/merge             # base/current/candidate three-way merge
POST /api/v1/deployments                     # Gateway adapter-backed deployment
GET  /api/v1/deployments
POST /api/v1/deployments/rollback?deploymentId=<deployment-id>
POST /api/v1/sites
GET  /api/v1/sites?id=<site-id>
POST /api/v1/environments
GET  /api/v1/environments?id=<environment-id>
GET  /api/v1/auth/session
GET  /api/v1/users
POST /api/v1/users
GET  /api/v1/roles
POST /api/v1/roles
GET  /api/v1/permissions
POST /api/v1/permissions
POST /api/v1/user-roles
POST /api/v1/role-permissions
POST /api/v1/builds/{buildId}/deployments
POST /api/v1/deployments/{deploymentId}/rollback?confirmedTarget=<site-id>/<environment-id>
```

`GET /api/v1/project/content` returns a resolved `document`, the selected
locale's `contentRevision`, the `defaultContentRevision`, and optional
`fallbackFrom`. The browser editor never receives filesystem paths. `PUT` accepts
`{base, document, revisions:{locale, default}}`: the server validates the
resolved candidate, writes `localized:true` values to the selected locale,
shared values to `default`, and propagates instance structure to existing locale
documents. The write is one atomic project-file batch. Both current target
revisions are checked before mutation; the batch also checks revisions of every
locale file it must rewrite. A stale revision returns `409 revision_conflict`
without partial writes. The editor's field-aware three-way merge combines
disjoint instance/field changes and leaves overlapping changes unsaved.

Gateway binding state/configuration and plugin Admin Surface/query/action are
Gateway-owned APIs, not Constructor `/api/v1` endpoints. The Constructor
Gateway workspace and plugin Admin UI adapters are not implemented yet; their
required contracts and remaining integration work are tracked in
[Integrations](/constructor/integrations) and the [API boundary matrix](/architecture/api-boundaries).

Project-ID-scoped file reads and writes target that registry entry without
activating it. GET/HEAD returns canonical file bytes and `ETag`; PUT applies
the same structured-document validation as the active-project API and requires
`If-Match`. Paths remain project-relative: parent traversal and symlink
components are rejected. On macOS/Linux the filesystem adapter anchors reads,
writes, listings and batch changes to open directory descriptors with
`O_NOFOLLOW`, including rollback operations; requests cannot change the active
workspace. The workspace reserves `.constructor-state/` for private recovery
metadata; repository clone/worktree targets cannot use that path.
Project creation builds the full scaffold and initial Git commit in a hidden
staging directory. On macOS/Linux it publishes the completed project with one
atomic, no-replace directory rename. Request cancellation or a failed
scaffold/commit removes staging data and does not leave a partially openable
project or replace an existing target.

Repository clone accepts HTTPS, SSH and SSH scp-style URLs; HTTPS userinfo
must not be embedded in the URL. Local paths and `file://` URLs are accepted
only when they resolve inside `CONSTRUCTOR_WORKSPACE_ROOT`. Clone rejects
unsupported Git helper protocols, stages under the workspace, and publishes
with one atomic, no-replace directory rename on macOS/Linux; a failed clone
leaves its target untouched. Worktree creation requires a source repository
inside the workspace and a full 40- or 64-character commit object ID; on
macOS/Linux it publishes the detached worktree with a no-replace directory
rename, repairs Git's worktree metadata, and repairs/cleans up if the request
is cancelled during that step. A durable recovery record is cleared only after
repair/cleanup; startup reconciles pending records before serving requests and
fails closed when a record does not match its paths or Git metadata.
Both operations reject traversal and symlink components, pass only an
allowlisted process environment to Git, disable system Git config and hooks,
and kill the Git process group on cancellation. User Git config remains
available for credential helpers; SSH agent access is forwarded when configured.
Local branch creation and checkout require a clean Git worktree (including
untracked files); unsaved editor drafts must also be saved before either action.
These operations affect local branches only; remote fetch/push and conflict
resolution are separate capabilities.

Build response includes `id`, `snapshotId`, `status`, and (on success)
`artifactPath` plus `artifactChecksum`, a SHA-256 hex digest of the static
artifact tree. `error` is a safe summary, not raw worker output. The build worker
shares a 15-minute deadline across dependency installation and Vite build; HTTP
request cancellation cancels the worker process tree.

`POST /api/v1/deployments` accepts the flat deployment fields `id`, `siteId`,
`environmentId`, `snapshotId`, `buildId` and `confirmedTarget`. The client must
confirm the exact target as `<siteId>/<environmentId>`. Constructor rejects a
non-ready or mismatched Snapshot/Build before calling Gateway. The Gateway
adapter publishes the immutable build artifact path as `source`, sends the
deployment ID as both `Idempotency-Key` and `idempotencyKey`, and waits for a
successful Gateway operation before promoting the local deployment. Promotion
uses a SQLite transaction and compare-and-swap against the current active
deployment. SQLite reserves one pending/applying operation per target. Repeating
an already successful deployment ID is idempotent; using that ID for a different
Snapshot/Build conflicts. Rollback calls Gateway and
creates a new local deployment record with `action: "rollback"`; failed Gateway
operations leave the previous local active deployment unchanged.
Rollback requests carry `confirmedTarget=<siteId>/<environmentId>` and are
rejected unless it matches the active deployment's exact target.

`GET /api/v1/deployment-target?siteId=<siteId>&environmentId=<environmentId>`
returns the current Gateway revision and Constructor's local revision. A
non-empty Gateway release without local history requires an explicit
`confirmedGatewayRevision` on the first deployment request. Otherwise Constructor
requires the Gateway revision to match its active local deployment. Publish and
rollback send that value as `expectedCurrentRevision`; after success, the Gateway
operation's `result.revision` is stored with the deployment. A mismatch returns
`gateway_revision_conflict` and requires deliberate reconciliation; Constructor
does not silently adopt an out-of-band change. The expected revision is persisted
before calling Gateway. On process restart the recovery worker replays pending
operations with the same idempotency key and CAS value; unresolved results stay
`applying`, keeping the target reserved until Gateway confirms an outcome. If the
request itself cannot confirm the outcome, Constructor returns `202 Accepted`
with the deployment in `applying` state; this is not a successful promotion.

`POST /api/v1/project/validate` returns diagnostics with a stable code, severity,
project-relative source path and message. Content diagnostics include optional
`pageId`, `instanceId` and `fieldKey`; clients use these coordinates for
navigation and must not infer entity identity from the human-readable message.
Without query parameters it validates every Site and only that Site's enabled
locales. `siteId` and `locale` may be supplied together to validate one exact
Site/locale pair; supplying only one is a `400` error. Validation does not
silently assume a default Site or locale. For an enabled target locale, content
resolution is exact locale, language-only locale, then `default`; this fallback
does not make a disabled target locale valid.
Generation and snapshot endpoints require both `siteId` and `locale`; neither
endpoint substitutes a default Site or locale. A fallback source is materialized
to the generated artifact for the explicitly requested target locale. Writes
always address the exact selected locale file. Snapshot responses include both
identifiers, and snapshots for different locales have distinct identities even
when they share the same Git revision.
The standalone `POST /api/v1/project/generate` writes the selected locale;
snapshot preparation instead generates every enabled locale, the route module
and asset manifest in one revision-checked batch before pinning the resulting
Git revision. Theme documents are strict v1 JSON; generation validates typed
tokens and variant overrides, resolves the selected Site `themeId`, and emits
sorted CSS variables. When `themeId` is omitted, the unique `default` or sole
Theme is selected; ambiguous multiple themes require explicit Site selection.
`GET /api/v1/project/themes` returns validated documents in canonical path order,
each with its file `revision` for optimistic Theme editing.

Snapshot capture stages the working tree through a temporary Git index and
verifies that a second tree read matches the captured tree. If files change
during capture, the API returns HTTP `409` with code `snapshot_source_changed`;
it does not persist the Snapshot or leave a pinned revision behind. Project
mutations made through Constructor are also serialized through revision capture.

```json
{
  "type": "about:blank",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "The project model violates a schema or cross-reference invariant.",
  "instance": "/api/v1/project/validate",
  "code": "project_validation_failed",
  "requestId": "<request-id>",
  "valid": false,
  "diagnostics": [{
    "code": "content.required",
    "severity": "error",
    "path": "liapoldus/content/local-site/ru-RU.json",
    "message": "title is required",
    "pageId": "home",
    "instanceId": "hero-main",
    "fieldKey": "title"
  }]
}
```

Constructor never accepts a Gateway config mutation without forwarding the
Gateway active digest. It returns Gateway `problem` unchanged under
`upstreamProblem`, plus Constructor request ID. Plugin IPC is Gateway-owned
gRPC/HTTP2 over loopback; Constructor exposes only declarative Admin UI calls to
the fixed Gateway REST API described below, never the plugin transport itself.

File write conflict returns HTTP `409` with `expectedRevision`,
`currentRevision`, the current blob and the candidate blob. The server never
overwrites the current file on a stale write. The client retains its saved
baseline and draft as the three-way merge `base` and `candidate`. A clean merge
is returned without writing the file, along with the exact current revision in
`ETag`; the client retries the write with `If-Match` against that revision. If
the file changes again, the retry conflicts normally. Overlapping edits return
`409` with `conflicted: true` and merge markers; no file is written, and the
draft must remain available for manual reconciliation.

`GET /api/v1/project/sites` reads and validates Site documents from the active
project's `liapoldus/sites/` directory. Invalid JSON, IDs that do not match the
filename, or cross-project references fail with typed diagnostics; the endpoint
does not expose arbitrary workspace paths.

`GET /api/v1/project/assets` returns the active project's asset registry in
canonical order. It verifies each source and responsive variant's declared size
and SHA-256, plus variant WebP dimensions, before returning it; an absent registry
returns an empty list and invalid metadata or changed binaries return typed
validation diagnostics. Inspector uses the list
to select registered assets for `image`, `icon` and `file` fields.

`POST /api/v1/project/assets` accepts raw PNG, JPEG, WebP or GIF bytes, or an SVG
document, up to 25 MiB. The server detects the actual format, validates raster
headers/dimensions, and sanitizes SVG through an element/attribute allowlist that
drops active elements, event/style attributes and external references. It
generates the asset ID and path, hashes the stored (sanitized, for SVG) bytes,
deduplicates by SHA-256, then atomically publishes the binary and updated
`liapoldus/assets.json`. Static PNG/JPEG/WebP uploads additionally generate
WebP variants at 320/640/1280/1920 px where the source is wider than the target;
quality is 82, dimensions preserve aspect ratio, and no crop or upscale occurs.
The source is retained as fallback. GIF and sanitized SVG remain unchanged.
Variant metadata and all binaries are included in the same atomic batch. New
uploads return `201`; an identical registered asset returns `200` with
`reused: true`. Unsupported or malformed input returns `422`
`asset_upload_invalid`.

`POST /api/v1/project/pages` creates a page with a stable `id`, display `name`,
explicit React `routePath`, selected `siteId`, and the current manifest/Site/
development-route revisions. The server validates the route and referenced
documents, then stages one batch containing the project manifest, selected Site,
development React routes, and `src/pages/<id>.page.tsx`. The batch verifies each
revision before publishing and rolls back on an apply failure. The response
contains the created `{id, name}` page. Current v1 creation targets the selected
Site and development routes only; other environments remain follow-up work.

`POST /api/v1/project/sites` creates a new Site by copying the selected source
Site's stable page records and enabled locales, but not its content. It creates
an empty `ContentDocument` for every copied locale. The request supplies unique
new `id`, display `name`, `sourceSiteId`, and current project-manifest/source-Site
revisions. The manifest revision is included in the atomic batch preflight; an
existing target Site or content file causes a conflict without partial writes.
The response contains the created Site document. Site creation requires
`content.write`.

```json
{
  "id": "campaign",
  "name": "Campaign",
  "sourceSiteId": "main",
  "revisions": {
    "manifest": "<project-file-etag>",
    "sourceSite": "<site-file-etag>"
  }
}
```

```json
{
  "siteId": "local-site",
  "id": "about",
  "name": "About",
  "routePath": "/about",
  "revisions": {
    "manifest": "<project-file-etag>",
    "site": "<site-file-etag>",
    "routes": "<development-route-etag>"
  }
}
```

Plugin Admin UI calls are not `/api/v1` Constructor endpoints. Constructor uses
Gateway's fixed `GET /api/plugins/{instance}/admin/surface` and page query/action
routes; Gateway authorizes and dispatches them over the current gRPC plugin
protocol. Constructor never opens plugin loopback connections or imports the
plugin transport library. Queries/actions send the active Surface digest via
`If-Match`; dangerous actions use the non-dispatching `428 confirmation_required`
challenge and retry with the one-time confirmation token only after operator
confirmation. See [Plugin Admin Pages](/plugins/admin-pages) for the
Gateway-owned REST contract and token lifecycle.

## Contracts

[Project schema](/spec/constructor-project.schema.json), [Site
schema](/spec/constructor-site.schema.json), [route
schema](/spec/constructor-routes.schema.json), [content
schema](/spec/constructor-content.schema.json), [Component
schema](/spec/constructor-component.schema.json), [asset registry
schema](/spec/constructor-assets.schema.json) and [Theme
schema](/spec/constructor-theme.schema.json) define the current structured
document shapes. Domain and application validation additionally enforces
semantic and cross-file invariants that JSON Schema cannot express, including
revision checks and reference integrity. [Plugin Admin UI contract](/plugins/admin-ui-contract)
defines generated plugin surfaces. OpenAPI is intentionally generated from the
Go API implementation before v1 release; this page is the normative endpoint
inventory until that generator lands.
