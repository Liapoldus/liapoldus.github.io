# Капча на сайте: плагин captcha

Плагин **captcha** — stateless-проверка токенов Cloudflare, Google reCAPTCHA и
hCaptcha. Каждый вызов `captcha.verify` получает `verifyUrl` и `secret`
провайдера в параметрах запроса, а не из конфига — плагин не хранит секретов, и
секреты разных сайтов не смешиваются.

## 1. Конфиг плагина

`conf/captcha.yaml`:

```yaml
timeout: 5s
# allowedHosts не указываем: действует default (Cloudflare/Google/hCaptcha)
allowAnyHost: false
```

## 2. Декларация в gateway.yaml

```yaml
plugins:
  captcha:
    manifest:
      protocol: liapoldus.plugin/v2
      name: captcha
      capabilities: [captcha.verify]
    enabled: true
    binary: ./bin/captcha
    config: ./conf/captcha.yaml
    autoRestart: true

server:
  - serverName: [site.localhost]
    site: site
    index: index.html
    apiRoutes:
      - methods: [POST]
        path: /api/captcha/verify
        plugin:
          instance: captcha
          capability: captcha.verify
```

## 3. Провайдер: параметры в вызове

Конфиг не зависит от провайдера: `verifyUrl` и `secret` приходят в каждом
запросе (заголовки/тело). Например, для reCAPTCHA:

```http
POST /api/captcha/verify HTTP/1.1
Host: site.localhost
X-Verify-Url: https://www.google.com/recaptcha/api/siteverify
X-Verify-Secret: <site-key>
Content-Type: application/json

{"token": "<client-response>"}
```

## 4. Проверка

```bash
./bin/gateway serve --config gateway.yaml

curl -H 'Host: site.localhost' \
  -X POST http://localhost:18080/api/captcha/verify \
  -H 'X-Verify-Url: https://www.google.com/recaptcha/api/siteverify' \
  -H 'X-Verify-Secret: <site-key>' \
  -H 'Content-Type: application/json' \
  -d '{"token":"03A..."}'
# -> результат верификации провайдера (success/hostname/score...)
```

## 5. Ограничение хостов

По умолчанию плагин обращается только к `challenges.cloudflare.com`,
`www.google.com`, `google.com`, `hcaptcha.com`, `api.hcaptcha.com`. Разрешить
собственный endpoint — `allowAnyHost: true` либо `allowedHosts`:

```yaml
timeout: 5s
allowedHosts:
  - api.internal.example
```

Примечание: gateway запускает и контролирует binary плагина отдельным
процессом; состояние и логи — через management API, как в примере с формами.