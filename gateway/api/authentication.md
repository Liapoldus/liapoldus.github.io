# Аутентификация Management API

Management API отделён от публичного Caddy traffic и не проксирует
пользовательские запросы. Нормативные HTTP schemas и typed responses
опубликованы в [OpenAPI](/spec/management.openapi.yaml). Gateway авторизует
только собственный административный principal `platform-admin`; пользователи
и бизнес-роли Constructor в Gateway не переносятся.

## Два доверенных способа удалённого доступа

| Клиент | Сетевой путь | Аутентификация Gateway |
| --- | --- | --- |
| Web Constructor backend | Private HTTPS/VPN прямо к Gateway Management listener | mTLS клиента плюс отдельный Bearer `platform-admin` service token для каждой Gateway binding |
| Desktop Constructor | Go bridge → внешний OpenSSH/bastion → SSH local port-forward к loopback Management listener | Короткоживущий SSH user certificate на tunnel; внутри tunnel — TLS server verification и Bearer `platform-admin` token |
| Локальные операторские команды | Loopback Management listener | Bearer service token; первичный bootstrap только на host Gateway |

Browser никогда не соединяется напрямую с Gateway и не получает Management
certificate/private key или Bearer token. Web backend хранит отдельный service
token и mTLS client identity для каждой привязки Gateway в защищённом
server-side secret store. В Constructor DB находятся только безопасные
metadata/references, не credential values.

Desktop SSH bridge не запускает SSH server внутри Gateway. OpenSSH/bastion
проверяет short-lived user certificate и ограничивает его port-forward только
к конкретному Gateway Management loopback endpoint. Shell, command execution,
SFTP, agent/X11 forwarding и произвольные destination запрещены. SSH identity
не заменяет Gateway Bearer authorization; server TLS проверяется и внутри
tunnel. Gateway Management API не слушает public site listener.

Web Constructor сначала аутентифицирует оператора и проверяет Constructor
permissions, затем backend отправляет разрешённый запрос к связанному Gateway.
Роль и environment binding сверяются для каждой операции по принципу
deny-by-default. Gateway видит Controller binding как administrative actor;
Constructor audit дополнительно фиксирует конкретного пользователя, его роль,
environment, действие, target Gateway, operation и результат. Передача
пользовательской identity в доверенном actor assertion не вводится.

## Service tokens Gateway

Каждый Gateway сохраняет одну роль `platform-admin`, но Constructor получает
отдельный token для каждой Gateway binding, например отдельный для dev и
production. Raw token генерируется локальным bootstrap или CLI/API create и
показывается один раз; Gateway хранит verifier/hash, ID, состояние и lifecycle
metadata в SQLite. Ни token, ни Authorization header не попадают в logs,
traces, audit payloads, browser storage или crash reports.

Первый token создаётся локально командой
`gateway access bootstrap` при отсутствии в SQLite любого active,
неотозванного service key и доступе к host state directory. Проверка условия
и запись verifier атомарны; revoked records остаются для аудита и не мешают
восстановлению. Удалённый клиент не может выполнить bootstrap. После импорта
credential в серверное secret storage Constructor операции create/rotate/revoke
выполняются только с действующей административной identity. Rotation создаёт
новый token, а старый отзывается по документированной операции; потеря
credential требует локального bootstrap/recovery, а не автоматического
анонимного self-service.

Verifier records и lifecycle metadata сервисных ключей хранятся только в
SQLite, защищённой правами state directory. До первой локальной команды
bootstrap Management API не принимает анонимные запросы: любые защищённые
endpoints fail-closed с `401`; исключение составляет только минимальный
unauthenticated `/healthz` без inventory и конфигурации. `/api/status` остаётся
Bearer-protected.

Management CA, Constructor backend client identity, plugin workload CA и
Caddy/ACME state принадлежат разным trust domains. Gateway не выпускает
сертификаты. mTLS handshake с неверным/отозванным сертификатом закрывается до
HTTP и не подменяется Bearer-only fallback. SSH tunnel mode не требует
desktop client mTLS identity, но не ослабляет TLS server verification или
Bearer authorization.

## Аутентификация пользователей Constructor

Пользовательские web sessions принадлежат Constructor, а не Gateway:

- OIDC login использует внешний provider; локальная запись пользователя
  связывается по стабильной паре `iss` + `sub`. Неизвестный subject не получает
  роль до явного provisioning.
- После OIDC login Constructor выполняет обязательный WebAuthn/passkey
  challenge. OIDC access/refresh tokens и Gateway credentials не выдаются
  React renderer.
- Local web mode проверяет хэш пароля, затем требует WebAuthn/passkey и
  выпускает короткоживущий Constructor JWT. Refresh credential ротируется при
  использовании; recovery требует отдельного подтверждённого flow и
  audit event.
- В обоих web modes browser получает session/JWT только в `Secure`, `HttpOnly`,
  `SameSite` cookie; mutation endpoints требуют CSRF защиты, точных Origin/Host
  проверок и rate limits. JWT и refresh values не помещаются в localStorage,
  sessionStorage или URL.
- Constructor desktop в single-user local режиме не показывает login и не
  заводит пользовательские roles. Этот режим разрешён только для локального
  loopback/Wails приложения; он не превращает remote Gateway в unauthenticated
  service.

Роли и permission assignments хранятся в БД Constructor. Environment-scoped
permissions применяются к конкретной Gateway binding: например,
`deploy.dev` не разрешает публикацию на binding с environment `prod`. Видимость
кнопок в UI не является границей безопасности; backend проверяет permission
перед каждым management use case.

## Health и Caddy Admin

Unauthenticated health endpoint сообщает только process/readiness status и не
раскрывает конфигурацию или inventory. Caddy Admin API доступен только через
авторизованный Gateway pass-through; внешний Admin socket и plugin endpoints
не становятся интерфейсами Constructor. Любая mutating Admin operation
checkpoint-ится до применения, audit фиксирует metadata без тел и секретов.

Схемы token create/rotate, auth failure и typed errors определены в
[Gateway OpenAPI](/spec/management.openapi.yaml); пользовательские sessions и
Constructor RBAC описаны в [модели Constructor](/constructor/governance) и
[модели данных](/constructor/data-model).
