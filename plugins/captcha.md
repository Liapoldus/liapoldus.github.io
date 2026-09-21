# captcha

Stateless-плагин проверки капчи: верифицирует токены Cloudflare,
Google reCAPTCHA и hCaptcha. `captchaProviders` в `gateway.yaml` выбирает URL
и secret; capability получает их только как scoped grant от Gateway, а клиент
передаёт только token.

Репозиторий: **отдельный git-репозиторий** плагина — свой Go-модуль,
не в репозитории ядра gateway. Бинарник собирается из этого репозитория.

## Capability

| Capability | Тип | Назначение |
| --- | --- | --- |
| `captcha.verify` | unary | проверить токен капчи у провайдера |

## Конфиг instance

```yaml
timeout: 5s
allowedHosts:           # заменяет default (провайдеры Cloudflare/Google/hCaptcha)
  - challenges.cloudflare.com
  - "*"                  # "." префикс — поддомены
allowAnyHost: false
```

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `timeout` | таймаут запроса к провайдеру | `5s` |
| `allowedHosts` | хосты, которым разрешён запрос к `verifyUrl`; `"*"` — поддомены | `challenges.cloudflare.com`, `www.google.com`, `google.com`, `hcaptcha.com`, `api.hcaptcha.com` |
| `allowAnyHost` | разрешить любой хост из `verifyUrl` | `false` |

Декларация плагина и привязка capability к маршруту — общий синтаксис
[«Обзор и настройка»](/plugins/).

Параметры провайдера (`verifyUrl`, `secret`) приходят только из
`captchaProviders` как временный scoped grant и не могут быть заданы в HTTP
body/header. Плагин не хранит секреты, а секреты разных сайтов не смешиваются.
