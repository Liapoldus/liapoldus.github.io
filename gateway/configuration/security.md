# TLS, auth и WAF

Безопасность публичного listener’а складывается из TLS-профиля, auth policy,
WAF policy и rate limit. Все они именованы в корневом YAML и назначаются на
конкретный route или L4-rule.

Канонический lifecycle mTLS, captcha, Geo/ASN и TLS находится в
<a href="/spec/security-runtime.json" target="_blank" rel="noopener">security-runtime.json</a>.
Эта страница содержит только конфигурационную навигацию и не расширяет contract.

## TLS

```yaml
tlsIssuers:
  public-acme:
    plugin: { instance: tls-issuer, capability: tls.issue }
    storage: tls-public
    challenges:
      http01: { listener: public-http }
      dns01: { secret: cloudflareDnsToken }
tlsProfiles:
  public:
    certificates:
      - domains: [example.com, www.example.com]
        issuer: public-acme
    protocols: [http/1.1, h2, h3]
    securityHeaders:
      strictTransportSecurity: max-age=31536000; includeSubDomains
      contentSecurityPolicy: "default-src 'self'"
  service-mtls:
    certificates: [{ cert: file:/etc/liapoldus/service.crt, key: file:/etc/liapoldus/service.key }]
    clientAuth: { mode: require, ca: file:/etc/liapoldus/clients-ca.pem }
```

Сертификат выбирается по SNI. `tls-issuer` получает ACME-задание, а Gateway
сам хранит account key, приватный ключ и сертификат в защищённом storage,
проверяет grants и добавляет результат в следующий runtime snapshot. TCP listener
может завершать TLS (`terminate`) или передавать зашифрованный поток по SNI
(`passthrough`). mTLS доступен только при termination.

Protected storage находится в `${registry.path}/tls/<storage>/`: account keys,
private keys и certificate chain имеют режим `0600`, владелец Gateway; plugins
видят только opaque handle. HTTP/3 открывает UDP и TCP на одном address: QUIC
использует тот же SNI/certificate profile, имеет лимиты listener `connections`,
`bytesPerSecond` и idle timeout. Неуспешный renewal до истечения действующего
certificate не прерывает трафик; после истечения профиль `degraded`, возвращает
`503 tls_degraded`, пишет alert/audit и metric expiry.

Допустимы только `strictTransportSecurity`, `contentSecurityPolicy`,
`xContentTypeOptions`, `referrerPolicy`, `permissionsPolicy`, `frameOptions`.
Значения переводятся соответственно в HSTS, CSP, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy и X-Frame-Options response headers.

## Identity plugin и mTLS

```yaml
authPolicies:
  users:
    plugin: { instance: identity, capability: identity.client.authenticate }
    mtls: { identities: { subject: { regex: '^CN=service-' } } }
plugins:
  identity:
    binary: ./bin/identity
    capabilities: [identity.client.authenticate, identity.token.validate, identity.server.authorize, identity.server.token]
    settings:
      clients: {}
      authorizationServers: {}
```

OIDC/OAuth client, OAuth authorization server, browser sessions, PKCE, state,
nonce, cookies и JWT/JWKS validation принадлежат identity-plugin. Gateway
передаёт только разрешённый HTTP context, применяет типизированный plugin
response и не получает ключи, cookie либо token lifecycle. Канонический
контракт capabilities находится в
[`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/identity/v1).

mTLS проверяет client certificate после TLS termination. mTLS `require`
отклоняет отсутствие/invalid certificate, `optional` разрешает отсутствие, но
проверяет представленный certificate; subject mapping использует RE2.

## WAF и ограничения

```yaml
wafPolicies:
  public:
    rules:
      - when: { method: [TRACE], path: { regex: '.*' } }
        then: { deny: { status: 405 } }
      - when: { sourceIp: { notIn: [10.0.0.0/8] }, path: { regex: '^/admin' } }
        then: { challenge: { provider: captcha } }
rateLimits:
  public-api: { key: source-ip, requests: 120, per: 1m, burst: 30 }
```

WAF condition использует тот же язык `when`, что и route. Встроенные действия:
`allow`, `deny`, `challenge` и `limit`. Geo/ASN проверка требует явно
объявленного data provider; при его недоступности rule не становится silently
allow — применяется заданный `onError`.

```yaml
dataProviders:
  geo:
    type: mmdb
    path: /var/lib/liapoldus/GeoLite2-City.mmdb
    onError: deny
```

`dataProviders` поддерживает только локальный MaxMind MMDB. Gateway читает
новый файл во временный handle и атомарно заменяет active reader; failed reload
сохраняет предыдущий reader. Если reader отсутствует/lookup failed, применяется
`onError: allow|deny` (default `deny`).

## Captcha providers

```yaml
captchaProviders:
  public:
    plugin: { instance: captcha, capability: captcha.verify }
    verifyUrl: https://www.google.com/recaptcha/api/siteverify
    secret: ${recaptchaSecret}
    allowedHosts: [www.google.com]
```

`challenge: { provider: public }` и captcha route ссылаются только на имя
provider. При блокировке Gateway отвечает `403 challenge_required` с Problem
Details extensions `provider` и `challengeToken`; token одноразовый, opaque и
живёт 10 min. Browser отправляет `POST
/.well-known/liapoldus/challenge/verify` с JSON
`{"challengeToken":"…","responseToken":"…"}`. При успехе Gateway ставит
`_lpgw_challenge` (`HttpOnly; Secure; SameSite=Lax; Path=/`, TTL 10 min), после
чего клиент повторяет исходный запрос. Неверный/expired token даёт `403
challenge_required`; provider failure — `503 plugin_unavailable`. Gateway
выдаёт captcha plugin verify URL и scoped secret только на этот вызов; URL и
секрет из request headers/body запрещены.
