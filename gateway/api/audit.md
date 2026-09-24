# Audit и operations

Audit и durable operations хранятся в SQLite, а не в JSONL-файлах. Контракт
полей и API pagination задан в [OpenAPI](/spec/management.openapi.yaml).

Gateway audit фиксирует actor service-key/Controller-binding ID, action,
resource type/ID, result, timestamp,
request ID и применимые digests. Он не сохраняет Caddyfile/artifact contents,
Admin API request/response bodies, Authorization, secrets, private keys,
cookies, plugin payloads или grant handles. Для Admin mutations записываются
method, normalized path, checkpoint reference и результат без тела.

Операции group publish/rollback, Caddy checkpoint restore/reconcile, plugin
lifecycle и TLS renew/revoke сохраняют state, idempotency fingerprint,
timestamps и safe result/problem. После restart операция восстанавливается или
явно помечается failed/recovery-required; она не теряется в памяти процесса.

Для web-операций Gateway видит только authenticated Constructor binding;
Constructor audit связывает тот же operation ID с end-user, role, environment
и target Gateway. Gateway не принимает непроверенные actor headers.

Audit append-only в API semantics, с документированным retention/backup и
explicit platform-admin access. Полный storage/ER контракт:
[Control plane](../architecture/control-plane#sqlite-и-файлы).
