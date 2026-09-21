# TLS, auth и WAF

Безопасность публичного listener’а складывается из TLS-профиля, auth policy,
WAF policy и rate limit. Все они именованы в корневом YAML и назначаются на
конкретный route или L4-rule.

## TLS

```yaml
tlsProfiles:
  public:
    certificates:
      - domains: [example.com, www.example.com]
        acme: { issuer: lets-encrypt, email: ops@example.com, storage: file:/var/lib/liapoldus/acme }
    protocols: [http/1.1, h2, h3]
    securityHeaders:
      strictTransportSecurity: max-age=31536000; includeSubDomains
      contentSecurityPolicy: "default-src 'self'"
  service-mtls:
    certificates: [{ cert: file:/etc/liapoldus/service.crt, key: file:/etc/liapoldus/service.key }]
    clientAuth: { mode: require, ca: file:/etc/liapoldus/clients-ca.pem }
```

Сертификат выбирается по SNI. ACME обновляет сертификаты в указанном
защищённом storage и добавляет их в следующий runtime snapshot. TCP listener
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

OIDC выполняет browser redirect-flow, JWT проверяется по JWKS и claims, mTLS
проверяет клиентский сертификат. Gateway не хранит учётные записи, пароли или
сессии identity provider.

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
