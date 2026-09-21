# TCP, UDP и P2P

Liapoldus принимает TCP и UDP наряду с HTTP. L4-listener владеет сокетом,
ограничениями, TLS и выбором rule; он не интерпретирует прикладной протокол.
Это позволяет использовать gateway как защищённый relay для произвольной
peer-to-peer системы.

```yaml
listeners:
  game-udp:
    type: udp
    address: ':3478'
    limits: { datagramsPerSecond: 2000, bytesPerSecond: 32MiB }
    rules:
      - when: { sourceIp: { notIn: [10.0.0.0/8] } }
        then: { proxy: game-relay }

  peer-tcp:
    type: tcp
    address: ':443'
    tls: { mode: passthrough }
    rules:
      - when: { sni: peers.example.com, alpn: [p2p] }
        then:
          plugin: { instance: peer-relay, capability: peer.session }
          rateLimit: peer-connections
      - when: { sni: api.example.com }
        then: { proxy: app-api }
```

## Контракт L4-rule

`rules` обрабатываются по порядку и используют тот же `when → then → else`,
что HTTP. Terminal target для L4 — `proxy`, `plugin` или `deny`. TCP передаёт
двунаправленный поток; UDP создаёт flow по tuple source/destination и передаёт
датаграммы до idle timeout.

| Поле | TCP | UDP |
| --- | --- | --- |
| `proxy` | поток к выбранному upstream target | flow к выбранному target |
| `plugin` | capability получает session stream | capability получает datagram flow |
| `tls.mode` | `terminate` или `passthrough` | не применяется |
| `sni`, `alpn` | доступны при ClientHello | не применяются |
| `limits` | connections, bytes, idle timeout | datagrams, bytes, flow idle timeout |

## P2P-граница

Gateway аутентифицирует, ограничивает и relay-ит peer-трафик. Он не хранит
каталог пиров, не выполняет NAT traversal и не навязывает прикладной формат
сообщений. Эти функции принадлежат внешней системе или plugin capability.
