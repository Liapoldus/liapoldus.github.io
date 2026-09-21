# TCP passthrough

Этот сценарий принимает TLS-соединения, читает SNI без расшифрования и
направляет поток в подходящий upstream. Полная схема L4-правил — в
[TCP, UDP и P2P](/gateway/configuration/transports).

```yaml
upstreams:
  mail:
    targets: [{ address: tcp://10.0.20.10:443 }]
    healthCheck: { tcp: true, interval: 10s, timeout: 2s }
listeners:
  tls-relay:
    type: tcp
    address: ':443'
    tls: { mode: passthrough }
    rules:
      - when: { sni: mail.example.com }
        then: { proxy: mail }
      - when: { sni: { regex: '.*' } }
        then: { deny: { reason: unknown-sni } }
```

Gateway не завершает TLS в этом режиме: сертификат и прикладной протокол
остаются у upstream. На одном адресе можно сочетать passthrough rules и
отдельный HTTP listener только при разных socket bindings.
