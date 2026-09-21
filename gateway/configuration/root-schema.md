# Корневая схема

`gateway.yaml` — точка входа конфигурации. Он описывает process-level ресурсы
и подключает остальные YAML-файлы. Все ссылки на именованные ресурсы должны
разрешиться при компиляции конфига; gateway не запускается с частично валидной
конфигурацией.

```yaml
includes: [./conf.d/*.yaml]             # относительные файлы и glob

variables:
  publicDomain: example.com
secrets:
  oidcClientSecret: env:OIDC_CLIENT_SECRET
  dnsToken: file:/run/secrets/dns-token

registry:
  path: ./data/registry

upstreams:
  app-api:
    targets: [{ address: https://api.internal:8443 }]
    discovery: { dns: api.internal, interval: 30s }
    healthCheck: { path: /healthz, interval: 10s, timeout: 2s }
    balance: least-connections             # round-robin | least-connections | hash

tlsProfiles:
  public:
    certificates:
      - domains: [${publicDomain}, www.${publicDomain}]
        acme: { issuer: lets-encrypt, email: ops@example.com }
  internal-mtls:
    certificates: [{ cert: file:/etc/liapoldus/internal.crt, key: file:/etc/liapoldus/internal.key }]
    clientAuth: { mode: require, ca: file:/etc/liapoldus/clients-ca.pem }

authPolicies:
  users:
    oidc: { issuer: https://id.example.com, clientId: liapoldus, clientSecret: ${oidcClientSecret} }
    jwt: { jwksUrl: https://id.example.com/keys, audiences: [public-api] }

wafPolicies:
  public:
    rules:
      - when: { requestSize: { gt: 10MiB } }
        then: { deny: { status: 413 } }
      - when: { sourceIp: { notIn: [10.0.0.0/8] }, path: { regex: '^/admin' } }
        then: { challenge: { provider: captcha } }

rateLimits:
  public-api: { key: source-ip, requests: 120, per: 1m, burst: 30 }

plugins:
  forms:
    binary: ./bin/forms-db
    config: ./plugins/forms.yaml
    capabilities: [forms.submit, forms.list]
    limits: { calls: 100, timeout: 5s, memory: 256MiB }

sites:
  blog: { path: ./data/registry/sites/blog }

listeners:
  public-http:
    type: http
    address: ':80'
    routes:
      - when: { host: [${publicDomain}, www.${publicDomain}] }
        then: { redirect: { scheme: https, status: 308 } }
  public-https:
    type: http
    address: ':443'
    tls: public
    routes:
      - when: { host: ${publicDomain}, path: { prefix: /api/ } }
        then: { proxy: app-api, auth: users, waf: public, rateLimit: public-api }
      - when: { host: ${publicDomain} }
        then: { site: blog }
  tunnel:
    type: tcp
    address: ':8443'
    tls: { mode: passthrough }
    rules:
      - when: { sni: relay.example.com }
        then: { plugin: { instance: forms, capability: relay.tcp } }

management:
  address: 127.0.0.1:9090
  serviceAccounts:
    - id: ops
      role: platform-admin
      keyHash: file:/run/secrets/ops-key-hash

logging: { format: json, access: [stdout] }
metrics: { prometheus: true, otlp: { endpoint: https://otel.example.com, interval: 15s } }
tracing: { otlp: { endpoint: https://otel.example.com }, sampling: parent-based }
```

## Корневые разделы

| Раздел | Назначение |
| --- | --- |
| `includes` | дерево YAML-файлов, объединяемое до валидации |
| `variables`, `secrets` | безопасные значения и ссылки, доступные через `${name}` |
| `registry`, `sites` | опубликованные артефакты и их site YAML |
| `listeners` | HTTP, TCP и UDP точки входа с маршрутами/правилами |
| `upstreams` | discovery, health checks, балансировка и retry |
| `tlsProfiles`, `authPolicies`, `wafPolicies`, `rateLimits` | именованные политики, на которые ссылаются правила |
| `plugins` | процессы и разрешённые capabilities |
| `management`, `logging`, `metrics`, `tracing` | управление и наблюдаемость |

Семантика include, переменных и секретов описана в [Секреты и переменные](secrets).
Маршрутизация — в [Маршруты и условия](server-blocks).
