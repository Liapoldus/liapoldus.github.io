# Капча на сайте: плагин captcha

Плагин **captcha** — stateless-проверка токенов Cloudflare, Google reCAPTCHA и
hCaptcha. Клиент передаёт только token; Gateway выбирает именованный provider
и выдаёт plugin scoped verify URL/secret на один вызов.

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
    binary: ./bin/captcha
    config: ./conf/captcha.yaml
    capabilities: [captcha.verify]
    restart: { enabled: true, backoff: 1s }
captchaProviders:
  public:
    plugin: { instance: captcha, capability: captcha.verify }
    verifyUrl: https://www.google.com/recaptcha/api/siteverify
    secret: ${recaptchaSecret}
listeners:
  web:
    type: http
    address: ':80'
    routes:
      - when: { host: site.localhost, method: [POST], path: { exact: /api/captcha/verify } }
        then: { plugin: { instance: captcha, capability: captcha.verify } }
```

## 3. Вызов

Route ссылается на `captchaProviders.public`; request не может выбрать provider
или передать secret:

```http
POST /api/captcha/verify HTTP/1.1
Host: site.localhost
Content-Type: application/json

{"token": "<client-response>"}
```

## 4. Проверка

```bash
./bin/gateway serve --config gateway.yaml

curl -H 'Host: site.localhost' \
  -X POST http://localhost:18080/api/captcha/verify \
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
