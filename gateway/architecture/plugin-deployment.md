# Запуск plugins, подключения и восстановление

Один Gateway Core работает в одном глобальном execution profile: `supervised`
или `external`. Это решение принимается при bootstrap и не переключается
отдельно для каждого instance в v1. При этом все плагины используют один
`pluginprotocol` и один config/dispatch lifecycle. Core никогда не вызывает
Docker/Kubernetes API. Канонические invariants сведены в
[архитектуру Gateway](target), состояние SQLite — в
[control-plane design](control-plane).

## Модель размещения

| | `supervised` | `external` |
| --- | --- | --- |
| Кто устанавливает бинарник | Gateway из доверенного TUF-каталога. | Оператор, Docker, Kubernetes или другая инфраструктура. |
| Кто создаёт/перезапускает процесс | Gateway Supervisor. | Внешний оператор/оркестратор. Core не имеет такого API. |
| Кто задаёт replica membership | Core управляет локальным process instance и его endpoint. | Оператор задаёт Core список endpoint + identity каждой replica. |
| Общий handshake и settings | `Bootstrap` → `Manifest` → `ConfigSchema` → `ConfigApply` → `DispatchApply` → `grpc.health.v1`. | Тот же порядок для каждой replica до её Ready. |
| Источник desired config | Core SQLite. | Core SQLite; контейнерные manifests не являются альтернативным источником settings. |
| TLS | SDK создаёт краткоживущую local workload identity через private bootstrap. | Внешний CA, PEM files или SPIFFE Workload API; обязательный mTLS. |

Профили не определяют тип плагина и не меняют его бизнес-логику. Один plugin
binary можно установить обоими способами в разных установках Gateway, но один
экземпляр Core не смешивает профили. Один logical instance может иметь несколько
external replicas; v1 Caddy plugin является исключением с ровно одной active
replica в любом профиле.

## Профиль `supervised`

### Установка

Core принимает catalog identity (`publisher`, plugin name, version), а не URL
произвольного исполняемого файла. TUF metadata определяет доверенный target и
проверяемые атрибуты package. До установки проверяются:

- подписи и цепочка доверия TUF, срок/версия metadata и защита от rollback;
- поддерживаемая OS/CPU platform и protocol compatibility;
- заявленный digest/size и целостность загруженного package;
- безопасный состав архива: traversal, абсолютные пути, links, дубликаты,
  case-collision/NFC ambiguity, количество файлов, глубина и размеры;
- plugin Manifest после старта: identity, release и capability→modes.

Исполняемый файл распаковывается во временный staging, валидируется и затем
помещается в immutable release directory. Активная версия не перезаписывается.
Rollback выбирает ранее проверенную immutable версию, а не скачивает неизвестный
artifact.

### Запуск и readiness

1. Supervisor создаёт endpoint, недоступный извне разрешённой local boundary,
   и передаёт его процессу inherited listener descriptor по protocol SDK API.
2. Минимизирует процессные privileges и передаёт только operational launch
   context, необходимый для подключения. Application settings не передаются в
   environment, arguments или config files.
3. Локальный bootstrap pipe используется только для launch-scoped identity/pin
   exchange и аутентификации transport. После него все control/data RPC идут
   через workload mTLS.
4. Core вызывает typed `Bootstrap`, получает `Manifest` и `ConfigSchema`,
   проверяет сохранённую revision и отправляет её push-вызовом `ConfigApply`.
5. Core применяет полное `DispatchApply` generation, проверяет exact ACK и
   `grpc.health.v1`. Только затем отмечает process готовым и включая его в
   dispatch для разрешённых capabilities/modes.

Точные FD числа, локальная JSON схема bootstrap и поля gRPC сообщений принадлежат
`pluginprotocol` и не копируются сюда. Application data передаётся только
`ConfigApply`; секреты доступны через grants в их утверждённом scope.

### Сбой и перезапуск

Supervisor наблюдает exit/crash, ограничивает частоту перезапусков bounded
backoff и для каждого нового процесса повторяет полный lifecycle. Неизвестный
результат уже начатого unary `Call` не повторяется. Активный `Stream` отменяется
и закрывается; поток не переносится в новый процесс. До успешного повторного
handshake plugin считается недоступным, а ошибки получают общий bounded
unavailable mapping для только зависимых routes/capabilities.

При намеренном restart/upgrade Core сначала перестаёт включать instance в новые
dispatch bindings, применяет предусмотренный protocol shutdown, ждёт ограниченный
graceful deadline и завершает процесс. Затем запускает выбранный release,
повторно применяет committed settings и policies и возвращает его в readiness.
Concurrent plugin calls не мигрируют на новую версию автоматически.

## Профиль `external` — Docker, Kubernetes, standalone

Внешний оператор собирает/устанавливает plugin image/binary, создаёт
workload-specific credentials, запускает replicas и обеспечивает их процессный
lifecycle. Core не получает доступ к Docker socket, Kubernetes API credentials
или shell на workload machines.

Для каждой replica operator регистрирует стабильную пару endpoint + ожидаемая
identity. Endpoint должен адресовать конкретную replica, а не только общий
load-balanced Service: Gateway должен сопоставить каждый ACK с ожидаемым
сертификатным identity этой replica. Для Kubernetes это обычно означает
отдельный DNS/Service endpoint на Pod identity или иной стабильный per-replica
адрес. Для Compose и standalone используются стабильные DNS/IP:port. Точный
формат и ограничения адреса принадлежат OpenAPI/bootstrap schemas.

Operator/CA выдаёт workload certificate каждому replica; URIs/identities
уникальны, но связаны с одним logical instance. Gateway проверяет сертификатную
identity против pre-registered endpoint membership. PEM credentials доступны
SDK как read-only provider; в Kubernetes допустим SPIFFE Workload API. Signed
CRL доставляет внешний security plane. Core не генерирует/подписывает workload
сертификаты и не раздаёт приватные ключи.

### Rolling update

1. Operator создаёт новую replica с новой identity и запускает её без удаления
   старой. Release digest и settings digest должны совпадать с desired
   rollout target.
2. Core открывает отдельное mTLS connection, проверяет identity, protocol
   version, Manifest и ConfigSchema.
3. Core отправляет последнюю committed settings revision и полный dispatch
   generation. ACK включает replica identity, generation и согласованные
   digests; Health сам по себе не заменяет этот ACK.
4. Новая replica входит в Ready set только после успешного lifecycle. Gateway
   активирует связанный dispatch только после ACK всех обязательных Ready
   replicas; ответ через service balancer не засчитывается за остальные.
5. Operator помечает старую replica на drain; Core перестаёт направлять новые
   взаимодействия, ждёт ограниченные in-flight deadlines, подтверждает
   изменение membership и после этого operator завершает старый workload.

Если новая replica не проходит handshake/apply, Core не подтверждает rollout;
operator сохраняет старый Ready set или откатывает deployment. Если старая
replica неожиданно теряется, зависимые bindings деградируют, но Core не
перезапускает её и независимые plugin instances продолжают работу.

## Reconnect, потеря Core и revocation

При network partition Core использует bounded reconnect с jitter/backoff;
повтор connection всегда выполняет новый mTLS handshake, Manifest/config
schema check, `ConfigApply`, `DispatchApply` и readiness. Неизвестный outcome
Call не replay-ится; Stream, чей транспорт оборван, завершается.

Живой plugin может продолжать последний локально активированный config и
generation, пока его собственная health policy считает runtime пригодным.
Новый или перезапущенный plugin не обслуживает разрешённые вызовы до push от
Core. Core после своего restart восстанавливает только committed generation из
SQLite и переустанавливает его до того, как сообщает Ready для соответствующей
операции. Invalid/stale/revoked certificate или signed CRL закрывает соединение
fail-closed; downgrade на plaintext не допускается.

## Caddy plugin

Caddy plugin использует общий plugin lifecycle, но имеет продуктовые особые
ограничения: одна active replica, собственный persistent filesystem, встроенные
в его отдельный binary Caddy и Caddy-L4. Core отправляет ему generic JSON
settings через `ConfigApply`; сам plugin компилирует candidate runtime state и
открывает public listener. Внешнее размещение использует persistent volume;
Core ничего не монтирует и не управляет Pod.

ACME/CertMagic и site artifacts не входят в Core SQLite. Site release
иммутабельны и принадлежат Caddy plugin; там же сохраняются `current` и
`previous`. Подробная product boundary описана в
[Caddy plugin](../../plugins/caddy).

## Deployment и проверка

Management listener Core изолирован от plugin workload/data-plane ports.
Firewall/network policy должна разрешать ровно нужные направления: management
operators → Core; Core control identity → plugins; plugin identities → явно
разрешённые plugin peers и scoped GrantBroker. Plugin RPC не публикуется в
Internet и не заменяет Management API.

Docker/Kubernetes production example должен доказывать устойчивость Core
SQLite и Caddy volume отдельно, per-replica identity, rolling deployment,
readiness barrier, Core restart и revocation. Exact protocol behavior находится
в [`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol); порядок
этапов и v1 acceptance — в [roadmap](v1-migration-roadmap) и
[acceptance matrix](../configuration/acceptance).
