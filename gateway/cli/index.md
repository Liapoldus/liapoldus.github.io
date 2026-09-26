# Gateway CLI

CLI — локальный операторский frontend к Gateway Management API и bootstrap
diagnostics. Он не управляет traffic через собственную YAML route DSL.

Сейчас реализованы только `gateway serve` и `gateway access bootstrap`.
Перечисленные ниже status/config/group/caddy/accounts команды — целевая
поверхность CLI, они пока не доступны. Не используйте эту страницу как список
действующих команд.

## Область команд

- serve/status/health: процесс, DB migration, Caddy build identity и drift;
- config: путь и schema validation минимального gateway.yaml;
- group: список групп, revisions, current/previous, release inspection и
  rollback;
- caddy: безопасная checkpoint/drift inspection и explicit restore/reconcile;
- accounts: создание, rotate и revoke platform-admin service keys.

Публикация group release выполняется Constructor или Management API одним
multipart запросом. Для каждой мутации применяются idempotency, optimistic
revision/digest и audit. Точный набор команд, flags и exit codes фиксируется
отдельным CLI contract до implementation.

- [Bootstrap gateway.yaml](/gateway/configuration/bootstrap)
- [Group Releases API](/gateway/api/groups)
- [Service keys](accounts)
- [Планируемая диагностика](inspect)
- [Планируемые group revisions и rollback](versions)
