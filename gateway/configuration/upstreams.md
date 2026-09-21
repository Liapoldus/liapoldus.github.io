# Upstream и балансировка

Upstream — именованная группа целей. HTTP, TCP и UDP rules ссылаются на неё по
имени; listener не хранит адреса backend-сервисов inline.

```yaml
upstreams:
  app-api:
    targets:
      - { address: https://10.0.10.11:8443, weight: 2 }
      - { address: https://10.0.10.12:8443 }
    discovery: { dns: api.internal, interval: 30s }
    healthCheck: { path: /healthz, interval: 10s, timeout: 2s, healthyAfter: 2, unhealthyAfter: 3 }
    balance: hash
    hash: { source: header, name: x-user-id }
    timeouts: { connect: 2s, read: 30s, write: 30s, idle: 60s }
    retry: { attempts: 2, on: [connect-failure, timeout, status-502, status-503, status-504] }
```

| Поле | Поведение |
| --- | --- |
| `targets` | статические адреса с необязательным `weight` |
| `discovery.dns` | периодически добавляет и удаляет DNS endpoints |
| `healthCheck` | исключает unhealthy target до успешного восстановления |
| `balance` | `round-robin`, `least-connections` или `hash` |
| `hash` | источник affinity: source IP, cookie, header или query |
| `timeouts`, `retry` | пределы соединения и безопасные повторные попытки |

DNS не отменяет статические `targets`. Gateway объединяет оба набора, удаляет
устаревшие DNS-адреса и никогда не направляет новый запрос в unhealthy target.
