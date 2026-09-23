# Режимы подключения plugin

Gateway v1 поддерживает единый plugin protocol и два способа получить его
endpoint. Режим выбирается в конфигурации каждого подключённого instance;
неподключённые plugin binaries или remote services ядру неизвестны. Gateway
сохраняет владение route dispatch, capability grants, request limits,
readiness и ответом публичному клиенту. Предметный код и конфигурация остаются
у plugin.

Нормативный transport и launch contract — репозиторий
[`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol). Эта страница
описывает deployment boundary, не дублируя protobuf или JSON schema.

## Режимы

| Режим | Кто запускает процесс | Адрес | Transport security | Остановка и restart |
| --- | --- | --- | --- | --- |
| `local` — текущий | Gateway Supervisor | Gateway назначает loopback endpoint | gRPC insecure только на локальном loopback | Supervisor управляет shutdown, health, restart/backoff и локальными resource limits |
| `remote` — план v1 | оператор, Docker Compose, Kubernetes или другой process manager | обязателен стабильный фиксированный DNS/IP:port | TLS обязателен; mTLS обязателен для межмашинного production deployment | Gateway управляет только своим client connection/health state; жизненным циклом процесса управляет внешняя среда |

Оба режима используют один protobuf namespace `liapoldus.plugin.v1`, один
handshake (`Manifest`, standard health, `ConfigSchema`, `ConfigApply`), generic
`Call`, bidirectional `Stream`, JSON capability contracts и одинаковые dispatch
слои. Нет fallback между режимами, автоматического обнаружения plugin и
plugin-specific ветвей в core.

## Local-supervised режим

Текущий `local` режим предназначен для единого Gateway deployment:

1. Администратор подключает instance конфигурацией `binary`, `args`, `env`,
   capabilities, settings и resource limits.
2. Supervisor запускает child process и передаёт только назначенный IPv4
   loopback endpoint и scoped-grant callback endpoint через protocol launch
   contract.
3. Gateway выполняет handshake под отдельным `startTimeout`, проверяет
   capabilities и health, применяет settings и только затем включает instance
   в dispatch.
4. На штатном stop Gateway вызывает protocol shutdown; при аварии использует
   bounded restart/backoff. Локальный gRPC transport использует insecure
   credentials только потому, что endpoint привязан к loopback и принадлежит
   тому же host user/process boundary.

Этот режим остаётся default и не требует Docker/Kubernetes. Все plugin child
processes принадлежат одному Supervisor; resource ограничения процесса
применимы напрямую.

## Remote самостоятельно развёрнутый режим

`remote` нужен, когда каждый plugin работает как отдельный container/service на
другой машине или в собственном Pod. Gateway не запускает и не завершает его.
Адрес задаётся явно и не меняется без изменения Gateway config; DNS-имя может
указывать на стабильный Kubernetes Service или Compose service endpoint, но
Gateway не выполняет собственный service discovery и не выбирает адрес по
manifest.

Нормативная runtime-модель должна быть tagged union: ровно один источник
endpoint на instance — существующая local-ветка с `binary` либо remote-ветка с
`endpoint`. Смешанный объект (например, одновременно `binary` и удалённый
`address`) невалиден. Schema содержит только transport/lifecycle-поля общего
plugin runtime; schema и settings конкретного plugin по-прежнему предоставляет
сам plugin. Имена этих будущих полей сначала закрепляются TS schema tests и
versioned contract, а затем реализуются в core.

Предлагаемая YAML-форма сохраняет существующую конфигурацию: отсутствие нового
`mode` при наличии `binary` означает `local`. Явный `mode: remote` запрещает
`binary` и требует `endpoint.address` и TLS-настройки.

```yaml
plugins:
  local-policy:
    # Отсутствующий mode сохраняет поведение существующих v1-конфигов.
    binary: ./bin/policy-plugin
    capabilities: [edge.policy]
    settings: {}

  remote-policy:
    mode: remote
    endpoint:
      address: policy.internal.example:9443
      tls:
        serverName: policy.internal.example
        ca: /run/secrets/plugin-ca.pem
        clientCertificate: /run/secrets/gateway-client.pem
        clientKey: /run/secrets/gateway-client-key.pem
    capabilities: [edge.policy]
    settings: {}
```

Это проектный пример, не действующая gateway schema. Все поля должны быть
добавлены в schema/config-fields contract одним изменением; private key остаётся
внешним secret file и никогда не указывается inline. Legacy-плагин с `binary`
остаётся local; явный remote mode не должен молча откатываться к этому режиму.

Remote lifecycle:

1. Config compiler проверяет endpoint, TLS trust roots, `serverName` и
   сертификат Gateway для mTLS; private-key values разрешаются через
   существующую secret boundary, а не inline YAML.
2. Runtime делает TLS-verified gRPC dial только по фиксированному endpoint.
   Проверяется имя сервера по SAN; при mTLS plugin также проверяет client
   certificate Gateway.
3. Через текущий handshake проверяются protocol version, manifest/capability
   allow-list, settings schema, ConfigApply и standard health.
4. Instance входит в dispatch только после полного успешного handshake.
   Invalid certificate, несовместимый manifest или неготовность не приводят к
   insecure fallback и не активируют частичную конфигурацию.
5. Потеря связи переводит instance в недоступное состояние. Gateway применяет
   bounded deadlines и health recheck, но не обещает restart remote process.
   Новая config activation атомарна: при неудачном dial/handshake остаётся
   предыдущий active graph.

Подключение адресуется непосредственно конфигурацией: DNS round-robin,
Kubernetes Service или ingress/LB может балансировать только совместимые
экземпляры одного plugin; manifest и config apply должны иметь согласованную
версию на всех replicas. Gateway не добавляет собственный registry/discovery.

## Grant broker в remote mode

Scoped secret grant callback — отдельное направление plugin → Gateway. Его
нельзя оставить loopback-only, если remote plugin законно получает grants. Для
remote mode v1 единственное разрешение — отдельный внутренний GrantBroker
endpoint Gateway, доступный только из доверенной plugin network, с TLS/mTLS и
тем же opaque per-call handle/purpose/capability/domain binding. Он не
совмещается с REST Management API, не публикуется в Internet и не принимает
Bearer/service-account credentials вместо plugin client identity.

Gateway проверяет клиентский сертификат, активность исходного Call, срок
действия handle, capability binding и scope при каждом redemption. Ответ
содержит только конкретный разрешённый secret; GrantBroker не предоставляет
перечисление grants/secrets. Secret и handle остаются исключёнными из logs,
traces, audit и protocol errors. Network policy разрешает этот callback только
между Gateway и подключёнными plugin workloads.

До готовности mTLS endpoint и callback conformance remote plugin с secret grants
не активируется: raw secret нельзя «временно» включать в обычный `Call` payload.

## TLS/mTLS и эксплуатация

- TLS обязателен между разными hosts и Pod boundaries. Межмашинное production
  подключение требует взаимной аутентификации сертификатами; insecure remote
  режим отсутствует.
- Trust root, server name и Gateway client certificate/key принадлежат
  Gateway deployment configuration. Plugin server certificate/key принадлежат
  workload secret store. Секреты не встраиваются в image, manifest, environment
  diagnostics или YAML plain value.
- Сертификаты имеют проверяемые SAN, цепочку доверия и период действия; ротация
  допускает контролируемую overlap-фазу старого и нового CA/certificate без
  перехода на insecure channel. Expiry/verification failure маркируются как
  plugin unavailable, без раскрытия сертификатов/ключей.
- Pod/service readiness должна отражать protocol handshake и применённую
  settings revision, а не только открытый TCP port. Liveness/restart отвечает
  внешний orchestrator.
- NetworkPolicy/firewall ограничивает Gateway → plugin gRPC и plugin → Gateway
  grant redemption. Plugin gRPC, reflection и GrantBroker не должны быть
  доступны публичному клиенту.
- Call deadline, payload size, concurrent-call limit, stream flow control,
  cancellation и redaction одинаковы для local и remote mode. Автоматические
  повторные capability-вызовы не выполняются: идемпотентность не предполагается.
- Gateway может метриками сообщать mode, readiness и transport failure class,
  но не endpoint credentials, payload, cookies или secret grant handle.

## Границы v1 и проверка

Remote mode не меняет публичный listener, route/action semantics или REST
control plane Constructor ↔ Gateway. Gateway не содержит перечней конкретных
plugin, их image names, ports, health paths, settings fields или Kubernetes
ресурсов. Docker/Kubernetes manifests принадлежат deployable plugin и operator
repositories; в Gateway документации остаются только нейтральные примеры.

Перед реализацией v1 требуются red-first TS тесты в `core/tests/` и
`pluginprotocol/tests/`: tagged-union schema; несовместимые `local`/`remote`
поля; фиксированный endpoint; TLS CA/SAN validation; обязательный mTLS для
remote production; отсутствие subprocess spawn/Shutdown в remote mode; полный
handshake и standard health; Call и bidi Stream через реальный TLS child/service;
отказ без downgrade; disconnect/recovery; atomic config activation; remote
GrantBroker redemption и отказ подменённому/истёкшему handle; concurrency,
deadlines, cancellation и отсутствие credentials в логах. Приёмка включает
Docker Compose и Kubernetes deployment examples, Linux/macOS build, `go vet
./...`, `go build ./...`, `make check` и VitePress build.

Сейчас поддерживается только local-supervised запуск по
[plugin protocol v1](/gateway/architecture/protocol). Remote endpoint, TLS/mTLS
для plugin transport, удалённый GrantBroker и их schema являются планом Gateway
v1, а не уже готовой возможностью.
