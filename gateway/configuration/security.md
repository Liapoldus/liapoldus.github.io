# TLS, mTLS и WAF

Gateway владеет listener-ами, TLS termination, проверкой mTLS-сертификата,
порядком policy и ограничением запросов. Встроенная WAF отвечает за правила,
Geo/ASN lookup и rate limit. Любое поведение конкретного подключённого plugin
выбирается только по его объявленным capability и не добавляется в core как
специальный provider, endpoint или action.

Нормативные runtime-поля и ошибки описаны в
[security-runtime.json](/spec/security-runtime.json). Поля YAML определены в
[схеме Gateway](/spec/gateway.schema.json).

## TLS и mTLS

```yaml
tlsProfiles:
  public:
    certificates:
      - cert: file:/etc/liapoldus/public.crt
        key: file:/etc/liapoldus/public.key
    protocols: [http/1.1, h2, h3]
    securityHeaders:
      strictTransportSecurity: max-age=31536000; includeSubDomains
      contentSecurityPolicy: "default-src 'self'"

  service-mtls:
    certificates:
      - cert: file:/etc/liapoldus/service.crt
        key: file:/etc/liapoldus/service.key
    clientAuth:
      mode: require
      ca: file:/etc/liapoldus/clients-ca.pem
```

Сертификат выбирается по SNI. TCP listener может завершать TLS (`terminate`)
или передавать зашифрованный поток по SNI (`passthrough`); mTLS доступен при
termination. HTTP/3 открывает UDP и TCP на одном address и использует тот же
SNI/TLS profile. QUIC limits задаются в `listener.limits.quic`:
`maxConnections`, `maxStreams`, `maxPacketBytes` и `idleTimeout`.

Protected TLS material хранится Gateway в `${registry.path}/tls/`. Любая
интеграция, которая создаёт или обновляет TLS material, подключается через
общую capability/grant boundary; Gateway проверяет материал и управляет его
применением к listener. Протокол конкретной интеграции и её settings не входят
в Gateway schema.

mTLS — встроенная transport-security возможность Gateway. Клиентский
сертификат проверяется во время TLS handshake, до разбора HTTP. Недействительный
предъявленный сертификат завершает handshake без HTTP-ответа. Если режим
`require` допускает TLS handshake без сертификата, HTTP middleware отвечает
`401 mtls_required`; при `optional` отсутствие сертификата разрешено. Любой
предъявленный сертификат проверяется TLS stack.

## Привязка policy к plugin

Правила передачи входящих cookie и выдачи response cookie описаны в
[каноническом cookie-контракте](/gateway/architecture/cookies). Транспорт и
режимы запуска plugin описаны в
[архитектуре подключения plugin](/gateway/architecture/plugin-deployment).

Gateway не содержит OIDC/JWT runtime и не определяет формат внешней
аутентификации. Route policy может быть связана с произвольной capability из
manifest подключённого plugin:

```yaml
plugins:
  access:
    binary: ./bin/access-policy
    capabilities: [access.authorize]
    settings: {}

authPolicies:
  protected:
    plugin:
      instance: access
      capability: access.authorize

listeners:
  web:
    type: http
    address: 127.0.0.1:8080
    routes:
      - when: { path: { prefix: /private } }
        then: { proxy: api, auth: protected }
```

Gateway проверяет, что instance и capability объявлены и подключены, передаёт
ограниченный HTTP context и применяет типизированный HTTP response. Plugin
владеет своим протоколом, токенами, сессиями, claims и cookies. Неизвестные
Gateway поля plugin settings не интерпретирует: их валидирует schema самого
plugin через generic plugin lifecycle.

Входящие `Authorization`, `Cookie` и `Proxy-Authorization` не входят в обычный
plugin request context. Plugin не получает socket, путь к файловой системе или
raw Gateway secret. Секрет выдаётся только через scoped grant, если конфигурация
явно разрешила его соответствующей capability.

Plugin response может вернуть несколько отдельных `Set-Cookie` actions.
Gateway добавляет каждую запись отдельно, не объединяя их и не изменяя
атрибуты; plugin сам выбирает, нужна ли cookie с `HttpOnly`, `Secure`, `SameSite`,
`Path` или `Max-Age`. Передача входящих cookie в capability требует отдельного
явного grant/context-контракта и не включается автоматически.

## WAF и ограничения

```yaml
plugins:
  policy:
    binary: ./bin/policy
    capabilities: [edge.inspect]
    settings: {}

wafPolicies:
  public:
    rules:
      - when: { method: [TRACE], path: { regex: '.*' } }
        then: { deny: { status: 405 } }
      - when: { sourceIp: { notIn: [10.0.0.0/8] }, path: { regex: '^/admin' } }
        then:
          plugin: { instance: policy, capability: edge.inspect }

rateLimits:
  public-api: { key: source-ip, requests: 120, per: 1m, burst: 30 }
```

Встроенные WAF actions — `allow`, `deny`, `limit` и вызов произвольной
подключённой capability через `plugin`. Capability получает method, path, query,
не credential headers и измеренный размер тела запроса; чувствительные headers
исключаются. Она должна вернуть ровно одно из двух решений:

- `continue: true` — Gateway продолжает обычный HTTP pipeline;
- `continue: false` вместе с `response` — Gateway применяет status, headers,
  cookies и body, затем завершает запрос.

Провайдеры и специальные verification endpoints не являются частью Gateway
WAF. Если capability реализует challenge, проверку токена или собственный
callback, эти маршруты, конфигурация и cookie/token lifecycle принадлежат
соответствующему plugin. Gateway не создаёт challenge token, не выбирает
внешний provider и не резервирует plugin endpoint.

Geo/ASN использует явно объявленный локальный MaxMind MMDB provider. При его
недоступности правило не становится `allow`: применяется `onError` правила,
затем provider, иначе `deny`. Условия одного matcher объединяются через AND;
`all`, `any` и `not` поддерживают рекурсивную композицию. Ошибка Geo/ASN lookup
имеет состояние «неизвестно» и не инвертируется через `not`.

В HTTP WAF `requestSize` — фактически полученные байты body после снятия HTTP
transfer framing; chunked body измеряется по прочитанным данным, не по
`Content-Length`. Если policy использует `requestSize`, Gateway читает и
сохраняет body до WAF-проверки, затем передаёт те же байты downstream. Чтение
ограничено `listeners.<name>.limits.bodyBytes`; превышение возвращает
`413 body_too_large` до upstream/plugin dispatch. Порог задаётся целым числом
байт или размером с суффиксом `KiB`, `MiB`, `GiB`; доступны `gt`, `gte`, `lt`,
`lte`.

```yaml
dataProviders:
  geo:
    type: mmdb
    path: /var/lib/liapoldus/GeoLite2-City.mmdb
    onError: deny
```

При reload Gateway открывает новый MMDB reader до атомарной замены активного.
Неуспешная загрузка сохраняет предыдущий reader. `geo.country` использует
ISO 3166-1 alpha-2, `geo.city` — английское имя из `city.names.en`; `asn.in` и
`asn.notIn` применяются совместно.

Полный порядок request pipeline — в [описании HTTP runtime](/gateway/configuration/http-runtime).
