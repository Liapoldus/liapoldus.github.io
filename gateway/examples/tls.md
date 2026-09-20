# TLS и SNI: несколько сайтов на одном порту

Один слушатель принимает несколько сайтов на `:18443`. Сертификаты индексируются
по хостам, выбор — по SNI (`server.tls`), HTTP/2 включается автоматически
(ALPN h2). Минимальная версия TLS — 1.2.

## 1. gateway.yaml

```yaml
instance:
  mode: gateway
  name: TLS example

registry: ./data/registry
listen: "18080"

management:
  enabled: true
  port: "18090"
  token: ""

server:
  - listen: "18443"                     # общий TLS-слушатель
    serverName: [blog.localhost]
    site: blog
    tls:
      certFile: ./tls/blog.crt
      keyFile: ./tls/blog.key
    http2: true                         # включено по умолчанию для TLS

  - listen: "18443"                     # второй сайт на том же порту
    serverName: [shop.localhost]
    site: shop
    tls:
      certFile: ./tls/shop.crt
      keyFile: ./tls/shop.key
```

Оба блока слушают `18443`; сертификаты `blog` и `shop` индексируются по SNI,
и при подключении с `Host: shop.localhost` gateway выбирает правый серт и блок.

## 2. Проверка

```bash
./bin/gateway serve --config gateway.yaml

# выбор серта по SNI (curl -v покажет выбранный сертификат)
curl -kv https://blog.localhost:18443/ 2>&1 | grep 'subject:'
curl -kv https://shop.localhost:18443/ 2>&1 | grep 'subject:'

# HTTP/2 (ALPN)
curl -sI --http2 https://blog.localhost:18443/ | head -1
# -> HTTP/2 200
```

## 3. Голый HTTP с h2c

На обычном HTTP HTTP/2 (h2c) тоже доступен: `http2: true` на server-блоке:

```yaml
server:
  - listen: "18080"
    serverName: [h2c.localhost]
    site: blog
    http2: true
```

```bash
curl -sI --http2 http://localhost:18080/ -H 'Host: h2c.localhost' | head -1
# -> HTTP/2 200
```

Примечания:

- `tls.certFile/keyFile` задаются на блок; если у слушателя один TLS-блок —
  серт используется как fallback.
- Изменение сертификатов входит в «сигнатуру слушателей»: reload вернёт
  `409 restart required`, нужен рестарт процесса.