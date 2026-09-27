# CAPTCHA plugin

> **Статус:** локальный supervised dispatch проверен с настоящим бинарником
> плагина; provider остаётся deterministic. Реальные внешние providers и полный
> browser challenge/callback lifecycle пока не реализованы.

CAPTCHA — plugin-owned function, а не встроенная Gateway feature. Gateway не
содержит provider registry, CAPTCHA-specific WAF action, endpoint, error code
или challenge cookie.

Плагин владеет provider settings, token verification, challenge/callback
capabilities, nonce/state, replay protection и cookie lifecycle. Settings
schema и capabilities объявляет сам plugin. Gateway валидирует settings,
хранит immutable settings revision как файл и её metadata/digest в SQLite;
содержимое settings Gateway не интерпретирует.

## Traffic и provider ownership

Маршрут связывается с instance и capability через общий
`liapoldus_plugin` directive в native Caddyfile. Интеграционный тест
`core/tests/integration/serve-local-plugin-products.test.ts` собирает и
запускает локальные бинарники CAPTCHA, forms-db и identity через Gateway
`serve` и embedded Caddy; запрос `POST /verify` доходит до настоящего CAPTCHA
child process и возвращает deterministic результат. Это подтверждает local
unary dispatch, но не интеграцию CAPTCHA с WAF-политикой, remote plugin mode,
external Caddy или реальным provider. Management API пользовательский request
не проксирует.

При подключении реального provider его identity, verification URL и credentials
должны принадлежать plugin settings; browser body не может выбирать trusted
provider/URL. Передача credentials должна использовать scoped grant, а не
обычный Call JSON. Сейчас deterministic adapter не обращается к внешнему URL и
не использует provider credentials; secrets не входят в его действующий
verification flow.

Plugin владеет challenge/session cookie lifecycle. Gateway применяет общий
входной cookie allow-list на пару instance/capability и типизированные
response actions для обычных и `HttpOnly` cookies согласно
[cookie contract](/gateway/architecture/cookies). Production `serve` E2E
`core/tests/integration/serve-cookie-policy.test.ts` проверяет восстановление
policy, фильтрацию входных cookies и атомарное
применение обоих типов response actions на отдельном fixture plugin. Это
подтверждает Gateway cookie boundary, но не CAPTCHA-specific challenge/session
flow: сам CAPTCHA plugin пока не реализует такой lifecycle.

Текущий skeleton не выполняет обращения к внешним providers и не реализует
полный challenge/callback/session flow; production readiness не заявляется.
Общий plugin boundary — [manifest](manifest), [cookies](/gateway/architecture/cookies)
и [Gateway security](/gateway/configuration/security).
