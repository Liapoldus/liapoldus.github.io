# TLS, auth и WAF

Безопасность публичного listener’а складывается из TLS-профиля, auth policy,
WAF policy и rate limit. Все они именованы в корневом YAML и назначаются на
конкретный route или L4-rule.

Канонический lifecycle OIDC/JWT/mTLS, captcha, Geo/ASN и TLS находится в
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

## Публичная аутентификация

```yaml
authPolicies:
  users:
    oidc:
      issuer: https://id.example.com
      clientId: liapoldus
      clientSecret: ${oidcClientSecret}
      redirectUri: https://app.example.com/oauth/callback
      scopes: [openid, profile, email]
    jwt:
      jwksUrl: https://id.example.com/keys
      issuers: [https://id.example.com]
      audiences: [public-api]
      requiredClaims: { tenant: acme }
    mtls: { identities: { subject: { regex: '^CN=service-' } } }
```

OIDC browser flow: неаутентифицированный browser получает `302` на issuer;
Gateway сохраняет short-lived signed `state` и `nonce` в `HttpOnly; Secure;
SameSite=Lax` cookie, принимает callback только на `redirectUri`, сверяет
state/nonce и создаёт encrypted session cookie. Logout удаляет cookie и делает
issuer end-session redirect, если endpoint объявлен. Gateway не хранит пароли.

`_lpgw_oidc_state` — AES-256-GCM signed/encrypted cookie, TTL 10 min;
`_lpgw_session` — AES-256-GCM cookie, TTL 8 h. Оба `HttpOnly`, `Secure`,
`SameSite=Lax`, `Path=/`; key берётся из named secret. Discovery разрешает
только HTTPS issuer и его `end_session_endpoint`; callback path обязан точно
совпадать с `redirectUri`.

JWT берётся только из `Authorization: Bearer`; проверяются signature, `iss`,
`aud`, expiry, `nbf` и `requiredClaims` с leeway 60 s. Ошибка даёт RFC 9457
`401` и `WWW-Authenticate: Bearer error="invalid_token"`. mTLS проверяет
client certificate после TLS termination. Identity не проксируется неявно:
route обязан объявить allow-list в `proxy.requestHeaders` или
`plugin.context.identity` для plugin.

JWT допускает только `EdDSA`, `ES256` и `RS256`; JWKS обновляется каждые 15 min
и однократно при unknown `kid`. `iss` и `aud` обязательны. mTLS `require`
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
