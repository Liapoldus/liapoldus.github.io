# Формат Git-проекта

Project является нормальным monorepo React-приложения. Следующее дерево —
канонический формат v1; это не внутренний формат БД.

```text
<project>/
  package.json                 # package manager scripts, dependencies
  vite.config.ts               # Vite only; generated route input is imported
  tsconfig.json
  src/
    app.tsx
    pages/<page-id>.page.tsx
    components/<component-id>/
      component.tsx            # developer-owned source
      schema.json              # generated/edited structured metadata
      preview.tsx              # optional developer preview fixture
    primitives/<primitive-id>.tsx
    scripts/<script-id>.ts
    state/<state-id>.ts
    infrastructure/<binding-id>.ts
    generated/
      routes.tsx               # never hand-edit
      content/<locale>.json    # never hand-edit
      theme.css                # never hand-edit
      assets.ts                # never hand-edit
  liapoldus/
    project.json               # Project manifest
    sites/<site-id>.json       # site/page/navigation model
    routes/<environment>.json  # visual React route model
    content/<site-id>/<locale>.json
    themes/<theme-id>.json
    assets.json                # Asset metadata/references, not binary secrets
    infrastructure/<environment>.json
    gateway/<environment>.yaml # Gateway desired configuration fragment
    plugins/<environment>/<instance>.json
  public/assets/               # filesystem asset storage in local mode
```

## Владение и генерируемые файлы

| Path | Writer | Rule |
| --- | --- | --- |
| `src/components/**/component.tsx` | developer | Constructor may read/rewrite only explicitly generated regions |
| `schema.json`, `liapoldus/**` | visual editor and code editor | JSON Schema validation before Git write |
| `src/generated/**` | generator only | regenerated from `liapoldus/**`; hand edits fail validation |
| asset binary | asset storage | Git LFS or external storage reference; never database blob by default |

Every structured file contains `{ "schemaVersion": 1, "id": "..." }`.
Unknown fields fail validation; migration is explicit `vN → vN+1`, committed
with the transformed file. Secret-valued fields contain only `secret://` refs.

## Транзакция записи

1. UI loads a file with its Git blob SHA.
2. API validates request schema and permissions.
3. API writes to a temporary worktree, runs cross-file validation and checks
   expected blob SHA.
4. API atomically replaces the file, creates a Git commit only on explicit
   Commit action, then returns revision and diagnostics.

An optimistic conflict never overwrites user work: API returns current blob,
base blob and a three-way merge candidate.
