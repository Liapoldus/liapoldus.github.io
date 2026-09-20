# Конфигурация

Единый `gateway.yaml` («микро-nginx»). Весь источник состояния — на диске;
БД у gateway нет. Путь задаётся `--config`, env `LIAPOLDUS_GATEWAY_CONFIG`
либо default.

## Возможности

| Возможность | Описание |
| --- | --- |
| **Сайты из registry** | версии раздаются из `sites/<slug>/<version>/`; `current` — активная, `prev` — резервная для отката |
| **Server-блоки** | слушатели, выбор по Host, статика, `proxyPass`, редиректы, маршруты, языки сайтов |
| **TLS и HTTP/2** | мульти-сертификатный SNI-подбор, ALPN h2, h2c на «голом» HTTP |
| **Веб-функции** | gzip/brotli, access-лог, rate limit по IP, CORS, security-заголовки, ETag, Cache-Control |
| **Плагины** | внешние процессы с полным протоколом (unary + все направления stream) |
| **Управление** | CLI-подкоманды (офлайн-доставка) и management HTTP API |
| **Наблюдаемость** | Prometheus и OTLP push-экспорт, структурированные логи |

## Быстрый старт

### 1. Соберите gateway

```bash
cd gateway/core
go build ./cmd/gateway     # появится ./bin/gateway (или задайте -o)
```

### 2. Создайте конфиг

`gateway.yaml`:

```yaml
listen: "18080"            # публичный порт по умолчанию
registry: ./data/registry  # каталог реестра сайтов
management:                # порт управления
  enabled: true
  port: "18090"
  token: ""                # пусто = только loopback
```

### 3. Опубликуйте простой сайт

```bash
mkdir -p data/registry/sites/example/current
echo '<h1>Hello, Liapoldus</h1>' > data/registry/sites/example/current/index.html

cat > data/registry/sites/example/config.yaml <<'YAML'
slug: example
hosts: [example.localhost, localhost]
languages: [ru]
defaultLang: ru
loginRequired: false
YAML
```

### 4. Запустите и проверьте

```bash
./bin/gateway serve
curl -H 'Host: example.localhost' http://localhost:18080/   # -> <h1>Hello, Liapoldus</h1>
curl http://localhost:18090/healthz                          # -> {"status":"ok",...}
```

Если `Host` не задан, gateway выберет подходящий блок по умолчанию.

## Разделы

| Раздел | Содержание |
| --- | --- |
| [Корневая схема](root-schema) | полный `gateway.yaml`, справочник корневых ключей |
| [Server-блоки](server-blocks) | инстансы `server`: статика/прокси/TLS во вкладках, справочник ключей, имплицитные сайты |
| [Конфиг сайта](site-config) | unified schema `sites/<slug>/config.yaml`, версии `current`/`prev` |
| [TLS и Reload](tls-reload) | сертификаты, SNI, HTTP/2, горячая перезагрузка |
| [Management API](management-api) | HTTP-интерфейс управления |
| [Безопасность](security) | токены, service accounts, security-заголовки, rate limit, CORS |