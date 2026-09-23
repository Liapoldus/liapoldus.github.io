# Плагины

Плагин — независимый процесс с явно объявленными capabilities. Он не создаёт
public listener и не регистрирует route: Gateway принимает трафик, выбирает
YAML-rule и передаёт capability только разрешённый запрос, stream или datagram
flow.

Через TCP/UDP capability plugin может реализовать любой прикладной протокол;
Gateway при этом остаётся владельцем public socket, TLS, policy и limits.

## Декларация instance

```yaml
plugins:
  forms:
    binary: ./bin/forms-db
    settings: {}
    args: []
    env: [DATABASE_URL=env:FORMS_DATABASE_URL]
    capabilities: [forms.submit, forms.list, forms.delete]
    limits: { calls: 100, startTimeout: 10s, timeout: 5s, memory: 256MiB }
    restart: { enabled: true, backoff: 1s, maxBackoff: 30s }
    grants: { storage: [], secrets: [] }
```

| Поле | Назначение |
| --- | --- |
| `binary`, `settings`, `args`, `env` | запуск отдельного процесса и его конфиг в `gateway.yaml` |
| `capabilities` | единственный список допустимых вызовов |
| `limits` | startup handshake, concurrency, call deadline, payload/flow и ресурсные пределы |
| `restart` | политика восстановления после failure; default `enabled: true`, `backoff: 1s`, `maxBackoff: 30s` |
| `grants` | scoped storage и secrets; отсутствующий grant означает отсутствие доступа |

Supervisor выбирает свободный `127.0.0.1` TCP port, передаёт полный endpoint
через `LIAPOLDUS_PLUGIN_ENDPOINT` согласно [launch contract protocol v1](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/launch.json)
и не публикует этот порт. Scoped-secret grants используют отдельный loopback
endpoint, переданный через `LIAPOLDUS_GRANT_BROKER_ENDPOINT`; Gateway
обслуживает на нём typed `GrantBroker.RedeemGrant`. Startup выполняет gRPC handshake: `Manifest`,
standard `grpc.health.v1`, `ConfigSchema`, затем `ConfigApply`. Периодический
health probe идёт раз в 5 s; после трёх последовательных failures instance
становится unhealthy и перезапускается с bounded exponential backoff.
`limits.startTimeout` (default `10s`) ограничивает единым deadline создание
gRPC-соединения и полный startup handshake (`Manifest`, health, `ConfigSchema`,
`ConfigApply`). Пока handshake не завершён, instance недоступен для dispatch;
при истечении deadline Gateway прекращает запуск и завершает child process.
`limits.calls` ограничивает параллельные calls, `limits.memory` — максимальный
resident set size процесса (default `256MiB`), `limits.timeout` (default 5 s) —
отдельный call deadline; он не заменяет `startTimeout`. При timeout Gateway отменяет RPC и возвращает HTTP Problem
`504 plugin_timeout`. Gateway проверяет RSS раз в секунду и после capability Call;
если вызов превысил лимит, текущий HTTP-запрос получает `503 resource_exhausted`.
При превышении Gateway завершает
процесс, а при `restart.enabled: true` запускает его заново с настроенным
bounded backoff. При отключённом restart превышение всё равно останавливает
процесс, но автоматического запуска не будет. stdout/stderr проходит
redaction и хранится в кольцевом буфере 200 строк.
Если достигнут предел `limits.calls`, запрос ждёт свободный слот; `limits.timeout`
ограничивает и ожидание, и сам RPC. Число одновременно исполняемых calls не
превышает настройку instance.

## Назначение plugin target

```yaml
listeners:
  web:
    type: http
    address: ':443'
    routes:
      - when: { method: [POST], path: { exact: /api/forms } }
        then: { plugin: { instance: forms, capability: forms.submit } }
  relay:
    type: tcp
    address: ':8443'
    rules:
      - when: {}
        then: { plugin: { instance: peer-relay, capability: peer.session } }
```

Gateway проверяет существование instance и capability при compile. HTTP
capability получает request context и тело в заданных лимитах; TCP capability
получает двунаправленную session; UDP capability — datagram flow. Плагин не
получает socket handle, filesystem path, raw Gateway secret,
`Authorization`, `Cookie`, `Proxy-Authorization` или identity claims.

### `plugin.context`

```yaml
then:
  plugin:
    instance: forms
    capability: forms.submit
    context:
      request: { method: true, path: false, query: false }
      headers: [content-type, x-requested-with]
      body: json
      secrets: []
```

| Field | Type / default | Meaning |
| --- | --- | --- |
| `request` | object / `{method:true,path:false,query:false}` | allow-list basic request fields |
| `headers` | lowercase string[] / `[]` | only forwarded headers |
| `body` | `none|json|bytes`, default `none` | body encoding in payload; max 10 MiB |
| `secrets` | secret-name[] / `[]` | запрашиваемые named grants; Gateway прикладывает к `Call` только opaque handles, а значение выдаёт отдельным typed redemption RPC |

Secret bytes никогда не сериализуются в capability JSON и не пересылаются как
обычные IPC metadata. Gateway выдаёт handle только если secret name разрешён
в `plugins.<instance>.grants.secrets`; handle связывает конкретный plugin,
capability-вызов, purpose и domain scope и отзывается по окончании этого вызова.
Gateway также не передаёт raw HTTP, `Authorization`, cookies или все identity
claims по умолчанию.

## Жизненный цикл и наблюдаемость

Supervisor запускает процесс на loopback IPC, проверяет health, применяет
конфиг, ограничивает вызовы и выполняет graceful shutdown/restart. Ошибки
преобразуются в response только ядром: plugin не определяет HTTP status или
маршрутизацию. `GET /api/plugins` показывает состояние, health, limits и
capabilities; logs проходят redaction и доступны через endpoint instance.

## Control-plane capabilities

Plugin capabilities могут обслуживать control-plane flow, а не публичный
route. Gateway не резервирует для них продуктовые имена, resource types или
специальные provider registries: подключённый plugin объявляет свою capability,
а вызывающий адаптер связывает её через общий runtime и grants. Любой будущий
TLS-issuance adapter должен отдельно определить эту binding boundary и её
versioned contract; текущий Gateway принимает TLS profile с явными `cert`/`key`.

## Существующие плагины

<div class="cards">
  <a class="card" href="/plugins/tls-issuer"><h3>tls-issuer</h3><p>ACME HTTP-01/DNS-01 и безопасное обновление TLS/mTLS материалов.</p></a>
  <a class="card" href="/plugins/forms-db"><h3>forms-db</h3><p>Сохранение и управление отправками форм.</p></a>
  <a class="card" href="/plugins/captcha"><h3>captcha</h3><p>Проверка challenge провайдеров.</p></a>
  <a class="card" href="/plugins/identity"><h3>Identity plugin</h3><p>Browser identity flows, provider protocols и lifecycle токенов.</p></a>
</div>

Для wire-деталей см. [Plugin protocol](/gateway/architecture/protocol), для
авторов процессов — [гайд](/gateway/architecture/guide). Их JSON contracts,
typed errors, grants и acceptance requirements находятся в
<a href="/spec/plugin-contracts.json" target="_blank" rel="noopener">plugin-contracts.json</a>.
