# captcha

Stateless-плагин проверки капчи: верифицирует токены Cloudflare,
Google reCAPTCHA и hCaptcha. Каждый вызов `captcha.verify` получает
`verifyUrl` и `secret` из `gateway.yaml` — плагин не хранит секреты провайдеров.

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

Параметры провайдера (`verifyUrl`, `secret`) плагин получает в параметрах
**каждого** вызова (тело/заголовки HTTP-запроса, проброшенные gateway как
payload/metadata), а не из своего конфига — так плагин остаётся stateless, а
секреты разных сайтов не смешиваются.