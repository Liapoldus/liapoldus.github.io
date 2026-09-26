# Целевая архитектура Gateway v1

## Модель продукта

Liapoldus Gateway — control plane. Caddy — единственный владелец исполнения
пользовательского HTTP/TLS/L4 traffic. Constructor остаётся отдельным
desktop-продуктом и единственным UI настройки; плагины — отдельные процессы
или сервисы.

У Gateway есть собственный, изолированный Management listener. Он не принимает
и не проксирует пользовательские HTTP-запросы. В embedded-варианте Caddy и
Liapoldus handler-модули загружены в Gateway process; в external-варианте
Gateway запускает совместимый Caddy process и синхронизирует его runtime по
закрытому аутентифицированному Admin API/IPC. В обоих случаях запрос проходит
от Caddy handler непосредственно к plugin по gRPC, а не через Management API.

| Решение | Нормативное следствие |
| --- | --- |
| Traffic config — native Caddyfile | Не создавать Gateway route DSL; gateway.yaml остаётся только bootstrap. |
| Control plane вне пользовательского request path | Management API, SQLite и group/release use cases не проксируют запросы клиентов к plugins. |
| Два Caddy build variants | Embedded и compatible external custom Caddy обязательны для v1 parity gate; Gateway запускает и supervises external binary. Stock Caddy не поддерживается. |
| Прямой plugin data dispatch | Caddy Liapoldus handler использует immutable dispatch snapshot и обращается к plugin напрямую по gRPC. Scoped GrantBroker остаётся отдельной redemption callback-поверхностью. |
| Полный Caddy Admin pass-through | Caddy Admin слушает только loopback/private IPC; операторский доступ идёт через аутентифицированный Gateway API с checkpoint/drift protection. |
| Группы revisions | Caddyfile fragment и frontend roots объединены immutable revision; current/previous хранятся как SQLite revision IDs. |
| SQLite control plane | Долговременное хранилище control-plane данных, включая plugin settings и их revisions; Caddyfile revisions и крупные artifacts хранятся immutable файлами, активная конфигурация загружается в in-memory snapshot. |
| Generic plugins | Ядро знает только общий protocol/dispatch boundary. Конкретные plugin contracts появляются только при подключении. |
| Caddy-L4 | Обязателен в v1 для TCP/UDP; conformance failure блокирует релиз, fallback на Go net/gnet запрещён. |
| Caddy/CertMagic | Единственный владелец ACME; domain readiness не блокирует активацию валидного snapshot. |
| Security | Web Constructor backend: private HTTPS + mTLS + отдельный Bearer token на Gateway; desktop: short-lived SSH certificate и ограниченный tunnel к loopback API; Gateway имеет только роль `platform-admin`, Constructor хранит user RBAC. |

## Инварианты

- Сначала durable immutable artifacts, затем candidate полного snapshot,
  затем activation и единая SQLite pointer transaction.
- Любая ошибка подготовки или активации сохраняет старый runtime, current и
  previous; crash recovery не допускает смешанного состояния.
- Group rollback меняет только Caddyfile/frontend composition; plugin settings
  имеют независимую API-жизнь.
- Любая Caddy Admin mutation создаёт checkpoint. При drift group publish
  блокируется до явного restore или reconcile.
- Не выполняется преобразование arbitrary Caddy Admin JSON обратно в Caddyfile.
- Ни secret values, keys, cookies, Authorization, private keys, grant handles,
  ни sensitive request bodies не попадают в logs, responses или audit.
- Management и plugin workload trust roots разделены; Gateway не является CA.
- Никаких прямых plugin-to-plugin соединений. Пользовательский payload идёт
  `Caddy handler → plugin`; Management API не является промежуточным proxy.
- Внешний Caddy принимает только целый authenticated immutable dispatch snapshot;
  ошибка синхронизации не публикует candidate traffic configuration.
- Вызов GrantBroker — только отдельная scoped redemption операция от plugin,
  не общий механизм передачи пользовательских запросов через control plane.

Подробная модель — в [Control plane](control-plane); полный порядок и gates —
в [плане v1](v1-migration-roadmap).
