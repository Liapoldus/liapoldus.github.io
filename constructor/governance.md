# Sites, authentication и deployment mode

## Sites

Installation имеет deployment capability `single` или `multiple`. В `single`
существует ровно один Site: API запрещает второй, а UI скрывает selector/Add
Site. Это server-side invariant, не косметическое ограничение UI.

## Authentication и permissions

Constructor использует внешний Identity Provider через выделенный identity
adapter; его конкретный protocol и session lifecycle принадлежат
[Identity plugin](/plugins/identity), а не Constructor или Gateway core. В
local single-user режиме defaults — `auth = none`, `user = admin`,
`permissions = *`; Roles UI можно не показывать. Web mode поддерживает
multiple users, custom roles и permissions (`code.*`, `content.*`, `assets.*`,
`gateway.*`, `plugins.*`, `snapshots.*`, `build.execute`, `deploy.execute`).

## Local и web

Desktop/local запускает то же web application с local Git и SQLite. Web mode
использует PostgreSQL, remote Git и remote Gateway; отдельного frontend для
desktop не создаётся.
