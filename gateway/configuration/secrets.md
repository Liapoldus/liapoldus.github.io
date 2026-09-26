# Секреты и внешние ссылки

Plaintext secret values запрещены в gateway.yaml, group Caddyfile revisions,
plugin settings, SQLite, audit и observability. Product API хранит только
поддерживаемые external references; Gateway разрешает их только на границе
авторизованной операции выдачи секрета. Plugin не получает исходный URI, путь к
файлу или значение секрета в `ConfigApply`: он получает opaque reference ID и
typed grant через единый [plugin protocol](../architecture/protocol). Далее
plugin redeem-ит значение у Gateway `GrantBroker` с точной областью действия.
Для v1 Gateway ограничивает размер одного plugin config secret значением 64
KiB; содержимое разрешается только для authorized apply/redemption и не
сохраняется как plaintext.

У grants два непересекающихся scope. `CONFIG_APPLY` привязан к plugin instance,
settings revision, secret reference и purpose: plugin может redeem-ить секрет
при push-применении конфигурации и держать его только в памяти этой активной
revision. При следующем успешном `ConfigApply` старые grants отзываются,
плагин атомарно заменяет конфигурацию/ресурсы и очищает прежнее значение.
`CALL` привязан к одному capability-вызову и не может использоваться для
инициализации долговременного ресурса или повторного вызова. Config secret не
должен передаваться в `Call`/`Stream`, ответ, audit или log.

Пример: forms-db получает DSN через revision-scoped grant для подключения к
своему хранилищу; cursor-signing key выдаётся отдельно только для `forms.list`
через per-call grant. Plugin не читает application env/config files и не
запрашивает settings у Gateway: активная settings revision всегда push-ится
Gateway-ом через `ConfigApply`.

Management API credentials, Management TLS identity, plugin mTLS credentials и
Caddy/CertMagic ACME storage принадлежат разным trust domains. Они передаются
процессу через защищённые file/secret mounts или внешний secret manager и не
копируются в revision archive.

Gateway обязан редактировать secret values и private key material до logging,
error, trace, API response и audit границ. Caddy Admin pass-through не записывает
body или чувствительные headers в audit. См.
[Security](security) и [control plane](../architecture/control-plane).
