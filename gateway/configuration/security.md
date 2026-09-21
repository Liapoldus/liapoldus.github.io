# TLS, auth и WAF

Безопасность публичного listener’а складывается из TLS-профиля, auth policy,
WAF policy и rate limit. Все они именованы в корневом YAML и назначаются на
конкретный route или L4-rule.

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

JWT берётся только из `Authorization: Bearer`; проверяются signature, `iss`,
`aud`, expiry и `requiredClaims`. mTLS проверяет client certificate после TLS
termination. Identity не проксируется неявно: route должен объявить allow-list
headers для upstream или `plugin.context.identity` для plugin.

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
provider. Клиент передаёт исключительно token. Gateway выдаёт captcha plugin
verify URL и scoped secret в `plugin.context.secrets` для одного вызова; URL и
секрет из request headers/body запрещены.
