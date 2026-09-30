# CAPTCHA plugin

> **Статус: полностью заморожен и исключён из Core v1.** Репозиторий не
> входит в активный workspace; код, tests и product contracts не изменяются.
> Содержимое ниже сохранено как справочная спецификация и не является v1 gate.
> Security Core Management API остаётся обязательной частью v1.

CAPTCHA — plugin-owned capability, не встроенная Core feature. Plugin владеет
provider settings, token verification, challenge/callback, nonce/state, replay
protection и cookies. Core хранит generic versioned settings в SQLite и
выдаёт их plugin через REST pull после `Reload`; provider names и provider behavior не
появляются в Core.

## Контракт v1

Единственный production provider v1 — Cloudflare Turnstile. Deterministic
provider остаётся только для тестов и не считается production verification.
Plugin обязан выполнять server-side Siteverify для каждого токена; клиент не
может выбрать provider или verification URL. Настройки provider принадлежат
plugin и поступают только через Plugin SDK REST pull, а secret — через scoped
Core REST grant.
Owner contract в `plugins/captcha/contracts/v1/` фиксирует Turnstile settings,
проверку ответа и ошибки, а также `captcha.public-config` для выдачи только
публичных `siteKey`/`action` через явно настроенный Caddy route.

Turnstile требует обязательной проверки на сервере; его токены одноразовые,
действуют пять минут и имеют предел 2048 символов. См. [официальный контракт
проверки Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
CAPTCHA plugin получает конфигурацию только через Plugin SDK REST lifecycle;
`pluginprotocol` используется только для прямого plugin↔plugin взаимодействия.

## Границы

- Client request не выбирает trusted provider, verification URL или IP policy.
- Provider credentials выдаются только через scoped grants и не входят в
  settings JSON или capability payload.
- CAPTCHA challenge/session cookies принадлежат plugin; Core/Caddy boundary
  проверяет общий allow-list и typed ordinary/`HttpOnly` actions.
- Caddy обращается к CAPTCHA plugin напрямую по разрешённому
  plugin-to-plugin edge; Core не проксирует user request.

Схемы request/response/errors находятся в plugin-owned `contracts/v1/` каталоге
репозитория CAPTCHA plugin. `pluginprotocol` не содержит capability-specific
контрактов.
Режимы и TLS описаны в [plugin deployment](/core/architecture/plugin-deployment),
общая cookie модель — в [cookie contract](/core/architecture/cookies).
