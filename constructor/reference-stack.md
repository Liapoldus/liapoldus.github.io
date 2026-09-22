# Эталонный стек

Эта страница фиксирует reference implementation. Замена технологии допустима
только при сохранении каждого публичного contract и observable behavior.

| Слой | Обязательная технология | Граница |
| --- | --- | --- |
| Web UI | React + TypeScript | браузерный клиент Constructor API |
| UI system | Tailwind CSS + shadcn/ui (Radix primitives) | доступные компоненты, tokens, keyboard/focus behavior |
| Client state | Zustand | ephemeral UI/cache state; не source of truth проекта |
| Constructor API | Go | HTTP API, authorization, orchestration и audit |
| Build worker | Node.js + Vite | isolated process для generate/build/preview |
| Desktop shell | Wails v2 | тот же React build и Go core, local filesystem/Git bridge |
| Web persistence | PostgreSQL | operational metadata и job coordination |
| Local persistence | SQLite | те же таблицы и migrations для single-user mode |
| Project source | Git repository | React source, schemas, content, routes и generated artifacts |

## Топология процессов

<img src="/diagrams/constructor-processes.svg" alt="Процессы Constructor: React UI, Go API, Node build worker, Git и Gateway" />

Web deployment запускает UI, Go API и Node worker как отдельные процессы.
Worker получает immutable worktree по commit SHA, не рабочую директорию
пользователя. Desktop запускает Wails shell, но использует тот же React bundle,
Go API contracts и Node worker protocol: отдельного desktop frontend нет.

## Состав UI

shadcn/ui используется как source-owned UI kit: primitives копируются в
`apps/constructor-ui/src/components/ui`, versioned вместе с проектом и
стилизованы только design tokens. Нельзя делать API or domain model зависимыми
от Radix/Tailwind. Большие surfaces используют: `AppShell`, `Explorer`,
`Workspace`, `Inspector`, `BottomPanel`, `CommandPalette` и `Canvas`.

Zustand stores делятся на `workspace`, `selection`, `preview`, `problems` и
`requests`. Они хранят selection, panes, optimistic request state и cache; все
долгоживущие сущности перечитываются через Constructor API и имеют revision.
