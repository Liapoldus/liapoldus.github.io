# ACME TLS, HTTP/3 и mTLS

Профиль `public` выпускает и обновляет сертификаты через ACME. Отдельный
профиль требует сертификат клиента для service-to-service маршрута.

```yaml
tlsProfiles:
  public:
    certificates:
      - domains: [app.example.com]
        acme: { issuer: lets-encrypt, email: ops@example.com, storage: file:/var/lib/liapoldus/acme }
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

ACME certificate renewal не меняет правила маршрутизации: TLS Manager готовит
новый snapshot и безопасно заменяет сертификат для новых соединений.
