# Развёртывание Gateway

Gateway Core — один процесс с локальной SQLite. Выбирается один глобальный
profile: `supervised` или `external`; смешанный режим не поддерживается.
Параметры bootstrap задаются в [`gateway.yaml`](../configuration/yaml-reference),
а целевые границы описаны в [архитектуре v1](../architecture/target).

## Supervised

Core размещается на доверенном host. Он скачивает TUF-проверенные plugin
packages в локальный immutable release store, запускает локальные процессы и
управляет их lifecycle. SQLite и package/artifact directory должны находиться
на persistent local filesystem; Core не поддерживает active-active и не
использует network filesystem для собственной SQLite.

## External/orchestrated

Core разворачивается одной replica; внешние plugin workloads — отдельно в
Docker/Kubernetes или как standalone processes. Operator задаёт каждому
instance его endpoint и TLS identity. Core не подключается к Docker/Kubernetes
API, не публикует plugin install/start/stop/restart endpoints и не становится
leader для реплик.

Caddy plugin в v1 всегда одна replica. Внешний workload должен иметь persistent
volume для ACME/CertMagic данных и опубликованных site releases; deployment
не должен пересоздавать пустое хранилище при рестарте. Core передаёт Caddy
settings из SQLite через `ConfigApply`; сам plugin строит Caddy runtime
configuration и слушает public ports.

## Сеть и порты

Management listener отделён от пользовательских listener-ов Caddy. В
supervised profile процесс Caddy получает требуемый OS grant для выбранных
public ports; Core не запускается от root и не передаёт Caddy socket activation.
В Docker/Kubernetes ports публикуются через инфраструктуру. Plugin protocol
listeners не должны быть доступны извне разрешённого workload network.

Секреты, ключи и сертификаты нельзя помещать в YAML или environment с
application settings. Management TLS references задаются через file refs;
remote workload identity поступает через protocol SDK PEM provider или SPIFFE
Workload API. Подробная boundary — в
[security configuration](../configuration/security).
