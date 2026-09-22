# Практические примеры

Готовые сценарии от простого к составному. В каждом примере — полный фрагмент
`gateway.yaml` (и конфига сайта там, где нужен), команды проверки через
`curl` и что должно получиться.

Все примеры — рабочие локально: достаточно собрать gateway
(`go build ./cmd/gateway`) и запустить `./bin/gateway serve --config <example>.yaml`.
Запуск и базовые команды — в разделе «[Deploy](/gateway/deploy/)», полная схема
ключей — «[Configuration](/gateway/configuration/)».

<div class="cards">
  <a class="card" href="/gateway/examples/simple-site">
    <h3>Простой сайт</h3>
    <p>Статика из registry, hosts, редиректы, сжатие и кэш-заголовки.</p>
  </a>
  <a class="card" href="/gateway/examples/proxy">
    <h3>Reverse proxy</h3>
    <p>Upstream, identity plugin, WAF и SPA fallback.</p>
  </a>
  <a class="card" href="/gateway/examples/tls">
    <h3>ACME TLS и mTLS</h3>
    <p>Сертификаты, HTTP/3 и service-to-service защита.</p>
  </a>
  <a class="card" href="/gateway/examples/forms">
    <h3>Формы на сайте</h3>
    <p>Плагин forms-db через явно назначенные YAML-routes.</p>
  </a>
  <a class="card" href="/gateway/examples/captcha">
    <h3>Капча на сайте</h3>
    <p>Плагин captcha: проверка токена Cloudflare/reCAPTCHA/hCaptcha.</p>
  </a>
  <a class="card" href="/gateway/examples/tcp"><h3>TCP passthrough</h3><p>Маршрутизация TLS-потоков по SNI.</p></a>
  <a class="card" href="/gateway/examples/udp-p2p"><h3>UDP и P2P relay</h3><p>Защищённые datagram flows и plugin target.</p></a>
</div>

## Общие шаги

Для любого примера:

1. Положите `gateway.yaml` и конфиги плагинов в отдельный каталог.
2. Каталог registry по умолчанию — `./data/registry` относительно рабочей
   директории (переопределяется `--config`, env `LIAPOLDUS_GATEWAY_REGISTRY`
   или ключом `registry:`).
3. Проверка: `curl -H 'Host: <host>' http://localhost:18080/` и
   `curl http://localhost:18090/healthz` (management, только loopback).

Про состояние плагинов и лог runtime — `GET /api/plugins` и
`GET /api/plugins/{id}/logs` на management-порту.
