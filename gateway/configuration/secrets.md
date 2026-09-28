# Секреты и grants

Core SQLite хранит только secret references; plaintext secret values и private
keys не попадают в DB, `gateway.yaml`, plugin settings JSON, audit, error или
logs. `ConfigApply` доставляет версионированный config и opaque references.
Значение выдаёт scoped protocol grant, ограниченный instance и settings
revision либо одним call.

Плагин хранит активные application settings и разрешённые значения только в
памяти. При новой revision он атомарно заменяет settings/resources и отзывает
старые config grants; per-call grant очищается после использования. Plugin не
читает app env/config file и не делает pull settings из Gateway.

Workload TLS private keys доставляются отдельным infrastructure credential
provider (локальный bootstrap pipe, remote PEM mount или SPIFFE API), а не
передаются через `ConfigApply`. Management TLS identity, plugin workload
identity и Caddy ACME storage — разные trust domains. Секреты и credentials
редактируются до любого error/log/trace/audit boundary.

Детали protocol-owned grant schema не копируются в Gateway docs; канон —
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol). См.
[security boundaries](security).
