# Конечные автоматы

## Snapshot, build and deployment

<img src="/diagrams/constructor-delivery-state.svg" alt="State machine Snapshot Build Deployment" />

| Entity | States | Terminal failure behavior |
| --- | --- | --- |
| Snapshot | `draft → validating → ready → superseded` | `failed`; no Build can start |
| Build | `queued → running → succeeded` | `failed` or `cancelled`; no artifact promotion |
| Deployment | `pending → applying → active` | `failed`; previous active deployment unchanged |
| Operation | `pending → running → succeeded` | `failed` or `cancelled`, idempotency record retained |

Snapshot validation creates a content digest from Git commit, structured files,
asset checksums and environment-independent configuration. Build worker leases
one queued build transactionally; lease expiry returns it to `queued`. Deploy
locks site/environment, asks Gateway to validate/apply/publish, and writes
`active` only after Gateway operation succeeds.

## Editing

File edit is `loaded → dirty → validating → saved`; conflict becomes
`conflicted`, never auto-overwritten. Preview is keyed by `(commit SHA,
content digest, viewport)`, expires after source change and cannot be promoted
as a Build.
