# Аутентификация и доступ Management API

Management API — отдельная control-plane поверхность Core. Все операции
авторизуются на сервере; браузер не получает Gateway service credential. До
готовности Gateway v1 Core имеет одну системную роль `platform-admin` и не
дублирует user/RBAC model Constructor.

## Web Controller

Backend Controller устанавливает private HTTPS connection к Management API с
mTLS и отдельным Bearer service credential для каждой Gateway binding. В
каждом запросе Gateway проверяет Bearer authorization и клиентскую TLS
identity. Controller передаёт user identity/permissions только как
аудируемый actor context; Gateway остаётся ответственным за свою системную
авторизацию. Token никогда не выдаётся JavaScript/browser и хранится backend-ом
в защищённом secret store.

## Desktop

Desktop использует ограниченный SSH port-forward через внешний OpenSSH/bastion
к loopback Management listener. SSH policy разрешает только port forwarding и
запрещает shell, SFTP и agent forwarding. Go bridge проверяет TLS identity
удалённого Gateway и передаёт краткоживущий Bearer credential из OS credential
store. Отсутствие пользовательского login разрешено только для single-user
desktop; удалённый Gateway всё равно требует полноценную service
authorization.

## Bootstrap, rotation и audit

Первый `platform-admin` credential создаётся локальным bootstrap command и
показывается ровно один раз. SQLite хранит только verifier и metadata.
Management API поддерживает issuance, rotation и revocation; отозванный key не
может продолжать работать через кэш. Каждая успешная и неуспешная mutation
записывает actor, binding, action, resource, result и request ID в audit; raw
credentials и TLS material туда не попадают.

Management TLS roots отделены от plugin workload roots и Caddy ACME state.
Для web подключения используется private network/VPN плюс mTLS и Bearer; для
desktop tunnel удалённого Gateway — аналогичный trust boundary без требования
настраивать mTLS непосредственно в desktop app.

Полная структура bootstrap и plugin credential границ находится в
[Security configuration](../configuration/security) и
[целевой архитектуре](../architecture/target).
