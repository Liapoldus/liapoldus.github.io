# Development Mode и IDE

Development Mode — специализированная React IDE. Верхняя панель выбирает
Project, Site и Branch и запускает Run, Build, Publish. Explorer разделён на
APPLICATION (Pages, Components, Scripts, State, Infrastructure, Routes, Theme,
Localization, Assets), LIAPOLDUS (Gateway, Plugins) и PROJECT (Git, Versions,
Snapshots, Builds, Deployments).

Workspace выбирает представление сущности: **Code**, **Visual**, **Preview**
или **Graph**. Справа — contextual Inspector; снизу — Problems, Git, Build,
Gateway, Logs и Terminal.

IDE включает TypeScript/TSX editor, diagnostics, autocomplete, references,
formatting, Git UI, terminal, preview, keyboard shortcuts и command palette.
Slash palette с поиском вставляет `/component`, `/primitive`, `/content`,
`/image`, `/form`, `/state`, `/reactive`, `/computed`, `/action`, `/script`,
`/event`, `/shortcut`, `/api`, `/route`, `/gateway`, `/stack`, `/grid` и
`/container`. Вставка создаёт структурированную модель, а не неявный текст.

## Выполнение и диагностика

`Run` запускает Node dev worker в disposable worktree с redacted binding map.
`Build` требует ready Snapshot и не переиспользует Run process. Terminal
работает только внутри project worktree, имеет cancellation and redacted output.

Problems объединяет TypeScript, JSON schema, route graph, Gateway validation,
plugin settings, assets и localization. Problem содержит stable code, severity,
source location, entity ID and safe fix action when one exists.
