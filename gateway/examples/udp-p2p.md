# UDP и P2P relay

Gateway защищает и маршрутизирует датаграммы, но не ведёт discovery пиров и не
выполняет NAT traversal. Прикладной peer-протокол реализует upstream или
плагин, явно назначенный в rule.

```yaml
plugins:
  peer-relay:
    binary: ./bin/peer-relay
    config: ./plugins/peer-relay.yaml
    capabilities: [peer.datagrams]
listeners:
  peers:
    type: udp
    address: ':3478'
    limits: { datagramsPerSecond: 2000, bytesPerSecond: 32MiB, flowIdleTimeout: 30s }
    rules:
      - when: { sourceIp: { notIn: [10.0.0.0/8] } }
        then:
          plugin: { instance: peer-relay, capability: peer.datagrams }
          rateLimit: peer-connections
      - when: {}
        then: { deny: { reason: private-source } }
```

Плагин получает только datagram flow, метаданные источника и разрешённый
контекст rule. Он не может открыть дополнительный публичный listener.
