# Git, versions, snapshots и delivery

<img src="/diagrams/constructor-flow.svg" alt="Git, Snapshot, Build и Deployment" />

Constructor поддерживает local repository, generic Git SSH и HTTPS: clone,
pull, commit, push, branches, diff, history и conflicts. Provider-specific UX
может расширять этот минимум.

## Четыре разных понятия

Entity version (например, `Hero v17`) относится к Component/Theme/Page и
связана с Git. Git commit — revision repository. **Snapshot** — полное
согласованное deployable состояние `site_id`, `git_commit`, metadata, author,
time и status. **Build** — immutable artifact именно этого Snapshot.

Build выполняется только как `Git → Snapshot → validation → generate (routes,
content, i18n, theme, assets, config) → React/Vite build → static artifact`.
Deployment связывает Environment, Snapshot и Build. Rollback выбирает прошлый
Snapshot, показывает diff/preview и после подтверждения обновляет metadata
активного Snapshot. Secrets не входят в Snapshot.

Environments включают Development, Staging, Production и custom; отличаются
Gateway binding, domains, infrastructure references, secret references и
deployment settings.
