# HTTP reverse proxy с WAF

Маршрут API применяет политики до передачи запроса в здоровый upstream. Полные
справочники: [маршруты](/gateway/configuration/server-blocks),
[upstream](/gateway/configuration/upstreams) и [безопасность](/gateway/configuration/security).

```yaml
upstreams:
  api:
    discovery: { dns: api.internal, interval: 30s }
    healthCheck: { path: /healthz, interval: 10s, timeout: 2s }
    balance: least-connections
wafPolicies:
  public:
    rules: [{ when: { requestSize: { gt: 2MiB } }, then: { deny: { status: 413 } } }]
rateLimits:
  api: { key: source-ip, requests: 120, per: 1m, burst: 30 }
listeners:
  https:
    type: http
    address: ':443'
    tls: public
    routes:
      - when: { host: app.example.com, path: { prefix: /api/ } }
        then: { proxy: api, waf: public, rateLimit: api }
      - when: { host: app.example.com }
        then: { site: portal }
```

`proxy` сохраняет метод, путь и query. При отсутствии healthy target Gateway
возвращает согласованную ошибку и записывает request ID в log/trace.
