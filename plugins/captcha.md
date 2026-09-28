# CAPTCHA plugin

CAPTCHA — plugin-owned capability, не встроенная Core feature. Plugin владеет
provider settings, token verification, challenge/callback, nonce/state, replay
protection и cookies. Core хранит generic versioned settings в SQLite и
push-ит JSON через `ConfigApply`; provider names и provider behavior не
появляются в Core.

## Статус

Текущий deterministic provider — skeleton, не production verifier. Он не
обращается к Google, Cloudflare, hCaptcha или иному внешнему provider. Старый
Gateway smoke запускал plugin через legacy embedded Caddy; это evidence
текущего кода и будет заменено E2E с отдельным `plugins/caddy` и
pluginprotocol SDK.

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
Режимы и TLS описаны в [plugin deployment](/gateway/architecture/plugin-deployment),
общая cookie модель — в [cookie contract](/gateway/architecture/cookies).
