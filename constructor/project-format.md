# Формат Git-проекта

Project является нормальным monorepo React-приложения. Следующее дерево —
канонический формат v1; это не внутренний формат БД.

```text
<project>/
  package.json                 # scripts.dev запускает локальный project preview
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
    vendor/liapoldus/react/   # SDK source snapshot bundled by Constructor scaffold
      index.ts
      package.json
      LICENSE
  liapoldus/
    project.json               # Project manifest
    sites/<site-id>.json       # site/page/navigation model and enabled locales
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
| `schema.json`, `liapoldus/**` | visual editor and code editor | strict typed and cross-file validation before repository write; published JSON Schemas document the structural contract |
| `src/generated/**` | generator | generated content/routes are regenerated from `liapoldus/**` |
| `src/vendor/liapoldus/react/**` | Constructor scaffold | versioned SDK source snapshot; update only through an explicit SDK sync/migration |
| asset binary | asset storage | Git LFS or external storage reference; never database blob by default |

Every structured file contains `{ "schemaVersion": 1, "id": "..." }`.
Unknown fields fail validation; migration is explicit `vN → vN+1`, committed
with the transformed file. Secret-valued fields contain only `secret://` refs.

Localized content is a `ContentDocument`: its `instances` array contains stable
instance `id`, required `pageId`, component schema `component`, and schema-bound
`fields`. `pageId` refers to the stable page ID in the site document (for
example `home`), not a React route path or display label. Instance IDs are
unique within the document. The editor addresses a field by
`(siteId, instanceId, fieldKey, locale)`; builds generate runtime locale JSON
from these records and never treat the source document as a flat props object.
The Site document owns stable `pages` IDs, their display `name`, and the
`locales` enabled for that site. Every Site page ID must also be declared in
`project.json.pages`, and React route `page` references that same ID. Page
source files use the ID in `src/pages/<page-id>.page.tsx`. Display labels and
React route paths are not IDs. New Site documents use page objects; existing
string-only page IDs remain readable and normalize their display name to the
ID. Fields with `localized: true` resolve through
`language-region → language → default`; fields with `localized: false` are
shared and resolve only from the Site's `default` content document. Locale
documents repeat the same instance IDs, page IDs, and component IDs; only field
values vary. The generated locale artifact is the resolved view, not a copy of
one source file. Localized field writes target the selected locale; shared field
writes target `default`.

Page references are checked across the project before structured writes:
content instances must target a page in their own Site, and every React route
must target a page present in at least one Site. A Site page cannot be removed
while content or a route still references it, and a manifest page cannot be
removed while declared by a Site or route. `/api/v1/project/validate` reports
dangling references across enabled locales and route documents.
Removing a page from the Explorer removes only that Site membership; the shared
project page ID and `src/pages/<page-id>.page.tsx` source are preserved. Removing
those project-wide records is a separate operation and is not implied by a
Site edit.

Within a Site, page names and display order can change without changing stable
page IDs. These edits update the Site document with its current revision; routes
and localized content continue to reference IDs and remain unchanged.

Creating a page in Constructor is a versioned batch mutation: the project page
registry, selected Site, development React route and page source are validated
and staged together. A stale revision rejects the whole operation before any
canonical file changes.

Creating another Site copies the selected Site's page records and enabled
locales, while initializing empty content documents for those locales. Existing
localized content is never copied implicitly; page IDs remain shared with the
project manifest, while content instances are Site-specific.

Asset metadata follows [the versioned asset schema](/spec/constructor-assets.schema.json)
and is stored in the `liapoldus/assets.json` registry;
binary files are local project files under `public/assets/`. Content references
must resolve to a registry entry of the expected type, and source/variant
metadata size/SHA-256 must match the binaries. Static raster assets may include
responsive WebP variants while retaining the original source fallback. The exact
v1 registry shape and current limits are defined
in [Assets, themes и localization](/constructor/content-assets).
Site documents may select a project Theme through `themeId`; Theme token
metadata follows [the v1 Theme schema](/spec/constructor-theme.schema.json), and
the selected theme generates `src/generated/theme.css`.
Every component declared by `project.json.components` must have a valid
`src/components/<id>/schema.json` whose ID matches the directory, and the source
file named by that schema must exist before the manifest can be written. Schema
changes are rejected if they make an existing content instance invalid; removing
a component from the manifest is blocked while any Site content still uses it.

```json
{
  "schemaVersion": 1,
  "id": "marketing",
  "projectId": "example",
  "name": "Marketing site",
  "pages": [{"id":"home","name":"Главная"}],
  "locales": ["ru-RU"]
}
```

```json
{
  "schemaVersion": 1,
  "id": "home-content",
  "instances": [
    {
      "id": "hero-main",
      "pageId": "home",
      "component": "hero",
      "fields": { "title": "Welcome" }
    }
  ]
}
```

## Транзакция записи

1. UI loads a file with its Git blob SHA.
2. API validates request schema and permissions.
3. API writes to a temporary worktree, runs cross-file validation and checks
   expected blob SHA.
4. API atomically replaces the file, creates a Git commit only on explicit
   Commit action, then returns revision and diagnostics.

An optimistic conflict never overwrites user work: API returns current blob,
base blob and a three-way merge candidate.
