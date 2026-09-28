# Caddy plugin

Caddy — отдельный first-party plugin для public data plane Gateway. Его binary
содержит Caddy и Caddy-L4; Core остаётся control plane и никогда не встраивает
Caddy, не открывает public listener и не проксирует traffic.

> **Статус:** в workspace уже есть начальный `plugins/caddy` Go module/binary:
> он принимает versioned native Caddy JSON через `ConfigApply`, проверяет и
> активирует candidate в in-process Caddy и имеет собственные settings
> contracts и TS conformance. Полный traffic-handler перенос, remote profile,
> persistent recovery, generic Core composition и Caddy-specific Admin Surface
> ещё не реализованы; это не подтверждение готовности v1.

## Владение

| Область | Владелец |
| --- | --- |
| Desired Caddy configuration | Core: versioned plugin JSON в SQLite, CAS/audit/operations |
| Config delivery | `pluginprotocol.ConfigApply`; plugin подтверждает revision и digest |
| Runtime compilation | Caddy plugin: JSON → private Caddy runtime configuration |
| Public HTTP/TLS/L4 | Caddy plugin и Caddy-L4 |
| ACME/renewal/certificate files | Caddy plugin через Caddy/CertMagic |
| Published site artifacts и `current`/`previous` | Caddy plugin в собственном persistent filesystem |
| Generic identity, lifecycle, grants, audit boundary | Core + `pluginprotocol` |

Core валидирует settings по Manifest/ConfigSchema, не разбирая Caddy-specific
fields. Caddy plugin получает полную versioned JSON revision push-вызовом
`ConfigApply`; он не читает app config из environment, argv или локальных
файлов и не запрашивает settings у Core. Внутренние Caddy JSON/Caddyfile data
являются производным runtime artifact, а не самостоятельным source of truth.

## Singleton и запуск

В v1 одновременно работает ровно один active Caddy instance. Целевой
`supervised` profile устанавливает только TUF-проверенный release, передаёт
runtime bootstrap и supervises процесс; `external` profile подключает
operator-managed endpoint и persistent volume, не устанавливая и не перезапуская
процесс. Текущий scaffold реализует только local inherited-listener/mTLS launch;
оба полных Core lifecycle пути ещё должны быть подключены.

Оба способа используют один и тот же binary, settings schema, protocol,
runtime behavior и conformance suite. Встроенного Caddy в Core, отдельного
external-Caddy variant, stock-Caddy compatibility mode и Caddy Admin API как
публичного интерфейса нет. При потере Caddy instance его traffic становится
недоступным, однако Core management plane и независимые plugins продолжают
работать.

## Traffic и plugin calls

Caddy принимает HTTP/1.1, HTTP/2/3, TLS, WebSocket, SSE и L4 TCP/UDP. Caddy-L4
обязателен для v1; настоящий P2P/NAT traversal вне scope, TCP/UDP означает
relay до разрешённого target. Route-specific JSON settings выбирают plugin
instance, capability и объявленный invocation mode. Caddy plugin проверяет
активный `DispatchApply` generation, применяет generic cookie/limit policy и
напрямую вызывает target plugin по mTLS. Core не передаёт capability payload.

Ordinary HTTP request/response использует `Call`; streaming HTTP, WebSocket,
SSE и L4 — `Stream`. Cookie actions проверяются полностью до отправки headers
или `101`; after response-start ошибку нельзя подменить новым HTTP response.
Protobuf, JSON shapes, limits и typed errors определяются только в
[`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol).

## ACME и локальное persistent state

Caddy/CertMagic — единственный владелец автоматического выпуска, renewal и
готовности сертификатов. Core не реализует второй ACME issuer и не хранит
certificate private keys в SQLite. DNS-01 provider modules, если нужны,
включаются при сборке Caddy plugin; поддерживаемый список зафиксируется после
инвентаризации deployment requirements.

Выпуск сертификата асинхронен и не задерживает активацию уже валидной desired
traffic revision. По каждому domain plugin отдельно публикует certificate
readiness и safe failure state через собственный Admin Surface. Renew/revoke,
если включены в конкретный release contract, остаются plugin actions; Core не
возвращает прежние `/api/tls` endpoints.

Site releases загружаются через plugin-owned Admin Surface, не через
Caddy-specific Core endpoints. Plugin потоково проверяет digest, archive
integrity, path traversal, duplicate/case-colliding names, limits и manifest,
готовит immutable staged release, затем атомарно переключает `current` и
сохраняет `previous`. ACME data и site artifacts хранятся на persistent local
filesystem, отдельно от Core SQLite; Kubernetes deployment должен монтировать
тот же устойчивый volume при restart/rollout. PostgreSQL, S3, shared RWX,
multi-replica Caddy и distributed certificate locking в v1 не входят.

## Изменение и восстановление

1. Core валидирует desired JSON, создаёт candidate revision и durable operation.
2. Через `ConfigApply` Caddy plugin строит новый runtime snapshot без замены
   активного состояния.
3. Plugin атомарно активирует candidate и подтверждает точные generation/digest.
4. Core коммитит active pointer и заменяет immutable in-memory generation.
5. При отказе candidate plugin сохраняет старый runtime; Core не сообщает об
   успехе и сохраняет безопасный failure result. После restart Core повторно
   передаёт durable active revision до готовности.

Общий roadmap — [Gateway v1](../gateway/architecture/v1-migration-roadmap);
единственная нормативная схема settings появится в отдельном Caddy plugin
release после её реализации.
