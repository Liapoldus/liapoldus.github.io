# TLS, HTTP/3 и mTLS

Gateway использует явно предоставленные TLS material. Отдельный профиль требует
сертификат клиента для service-to-service маршрута.

```yaml
tlsProfiles:
  public:
    certificates:
      - cert: file:/etc/liapoldus/app.crt
        key: file:/etc/liapoldus/app.key
    protocols: [http/1.1, h2, h3]
  services:
    certificates: [{ cert: file:/etc/liapoldus/services.crt, key: file:/etc/liapoldus/services.key }]
    clientAuth: { mode: require, ca: file:/etc/liapoldus/services-ca.pem }
listeners:
  public:
    type: http
    address: ':443'
    tls: public
    routes: [{ when: { host: app.example.com }, then: { site: portal } }]
  internal:
    type: http
    address: ':9443'
    tls: services
    routes: [{ when: { path: { prefix: / } }, then: { proxy: internal-api } }]
```

HTTP/3 открывает UDP/QUIC и TCP на `:443` с тем же TLS profile. Gateway не
содержит ACME workflow или привязки к конкретному issuer plugin. Внешняя
интеграция issuance пока не включена в текущую конфигурационную поверхность.
