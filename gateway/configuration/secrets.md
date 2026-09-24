# Секреты и внешние ссылки

Plaintext secret values запрещены в gateway.yaml, group Caddyfile revisions,
plugin settings revisions, SQLite, audit и observability. Bootstrap и product APIs
принимают только поддерживаемые external references; конкретный resolver
контракт фиксируется versioned schemas до начала реализации.

Management API credentials, Management TLS identity, plugin mTLS credentials и
Caddy/CertMagic ACME storage принадлежат разным trust domains. Они передаются
процессу через защищённые file/secret mounts или внешний secret manager и не
копируются в revision archive.

Gateway обязан редактировать secret values и private key material до logging,
error, trace, API response и audit границ. Caddy Admin pass-through не записывает
body или чувствительные headers в audit. См.
[Security](security) и [control plane](../architecture/control-plane).
