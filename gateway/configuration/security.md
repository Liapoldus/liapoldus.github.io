# Границы безопасности Gateway

## Management API

Management listener не размещается на public Caddy listeners. TLS server identity
обязателен всегда. Web Controller соединяется по private HTTPS с mTLS и отдельным
Bearer service credential на binding; credential остаётся на backend и не
передаётся browser. Для desktop доступа используется ограниченный SSH
port-forward к loopback Management API; SSH policy запрещает shell, SFTP и agent
forwarding, а bearer хранится в OS credential store. Core авторизует каждую
операцию, пишет audit и не раскрывает token повторно.

## Plugin workload

`pluginprotocol` реализует mTLS для всех обычных plugin control/data
connections. Management trust и workload trust раздельны. В supervised profile
первичная local identity/pin exchange идёт только по приватному inherited
bootstrap pipe; после этого plaintext plugin RPC запрещён. В external profile
SDK поддерживает read-only PEM identity и SPIFFE Workload API. Core не является
CA и не получает plugin private keys.

Remote trust использует externally issued identities и signed CRL bundles.
Неверная цепочка, issuer, подпись, срок, номер или отозванный serial закрывает
новый handshake. Обновление CRL закрывает существующие каналы и требует нового
handshake; insecure downgrade запрещён. Подробности wire contract — только в
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol).

## Plugin interactions и secrets

Межплагинный вызов разрешён только явным Core policy edge
`caller → target/capability/mode`; default — deny. SDK строит outbound clients
из подтверждённого `DispatchApply` peer directory. Core не проксирует payload.

`ConfigApply` содержит versioned JSON и opaque secret references, но не secret
bytes. Grant имеет scope instance/revision/call; plugin держит разрешённое
значение только в памяти и очищает его после срока действия. Raw secrets,
private keys, bearer, cookies, grants, request bodies и приватные filesystem
paths запрещены в логах, errors, traces и audit.

## Process and artifact boundaries

Supervised package допускается только после TUF signature, digest, platform и
protocol compatibility checks; произвольные URLs не принимаются. Plugin
process не получает Core SQLite credentials или доступ к базе. Caddy plugin
имеет собственный persistent directory для сертификатов и site releases, но
его settings source of truth остаётся Core SQLite. В external profile lifecycle
процессов контролирует operator, а Management API не выдаёт lifecycle/install
операции.
