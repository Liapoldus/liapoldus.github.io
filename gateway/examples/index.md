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
    <p>proxyPass и маршруты на бэкенд, SPA-fallback на index.html.</p>
  </a>
  <a class="card" href="/gateway/examples/tls">
    <h3>TLS и SNI</h3>
    <p>Мульти-сертификатный слушатель, выбор по SNI, HTTP/2 (ALPN h2).</p>
  </a>
  <a class="card" href="/gateway/examples/forms">
    <h3>Формы на сайте</h3>
    <p>Плагин forms-db: apiRoutes для submit/list/delete.</p>
  </a>
  <a class="card" href="/gateway/examples/captcha">
    <h3>Капча на сайте</h3>
    <p>Плагин captcha: проверка токена Cloudflare/reCAPTCHA/hCaptcha.</p>
  </a>
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