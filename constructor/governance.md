# Sites, authentication и deployment mode

## Sites

Installation имеет deployment capability `single` или `multiple`. В `single`
существует ровно один Site: API запрещает второй, а UI скрывает selector/Add
Site. Это server-side invariant, не косметическое ограничение UI.

## Authentication и permissions

Constructor использует внешний authentication provider через выделенный
adapter; его конкретный protocol и session lifecycle принадлежат plugin
capability, а не Constructor или Gateway core. В
local single-user режиме defaults — `auth = none`, `user = admin`,
`permissions = *`; Roles UI можно не показывать. Web mode поддерживает
multiple users, custom roles и permissions (`code.*`, `content.*`, `assets.*`,
`gateway.*`, `plugins.*`, `snapshots.*`, `build.execute`, `deploy.execute`).

Every mutation endpoint resolves a permission before invoking its use case;
frontend visibility is not an authorization boundary.

## Local и web

Desktop/local запускает то же web application с local Git и SQLite. Web mode
использует PostgreSQL, remote Git и remote Gateway; отдельного frontend для
desktop не создаётся.

Local mode implements the same authorization boundary with a local admin
principal and all permissions. Web mode can replace this adapter with an
external authentication provider without changing application use cases.
