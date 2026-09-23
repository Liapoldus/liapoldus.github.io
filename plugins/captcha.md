# Плагин CAPTCHA

> **Статус:** в репозитории плагинов есть runnable skeleton с deterministic
> provider. Реальные внешние провайдеры, production settings schema и полный
> browser lifecycle пока не реализованы. Описание ниже фиксирует границу
> владения, а не обещает готовую production-функцию.

CAPTCHA — отдельная функция подключённого plugin, а не встроенная возможность
Gateway. Gateway не содержит `captchaProviders`, специального WAF `challenge`,
зарезервированного verification endpoint, CAPTCHA-кодов ошибок или собственного
challenge cookie.

## Владение

Плагин владеет provider selection, provider settings, token verification,
challenge/callback маршрутами, nonce/state, replay protection и cookie/token
lifecycle. Его `ConfigSchema` определяет provider URL, host allowlist, публичные
и секретные настройки. Gateway валидирует настройки только общим lifecycle;
неизвестные plugin-поля он не интерпретирует.

Gateway остаётся владельцем public listener, route matching, WAF policy order,
plugin process и вызова объявленной capability. WAF может вызвать любую
capability manifest-а. Она получает ограниченный request context без
`Authorization`, `Cookie`, `Proxy-Authorization`, socket и файловых путей, а
возвращает либо `continue`, либо типизированный HTTP response action. Gateway
применяет response status, headers, body и отдельные `Set-Cookie` actions, не
объединяя cookie-заголовки и не изменяя их атрибуты.

Секрет provider-а не передаётся в обычных plugin settings или capability JSON.
Если операция требует его, instance получает scoped secret grant с заданными
purpose и domain scope. Gateway выдаёт секрет только через redemption RPC в
пределах вызова и никогда не возвращает его клиенту, не пишет в logs и не
включает в diagnostics.

## Обязательная модель конфигурации плагина

Production-версия должна объявлять произвольные plugin settings через собственный
versioned JSON Schema. Для установки Gateway-конфигурация содержит только общую
декларацию plugin instance:

```yaml
plugins:
  edge-check:
    binary: ./bin/captcha-plugin
    capabilities: [edge.challenge]
    settings: {}
```

Пример намеренно не раскрывает поля provider settings: точная schema является
частью самого CAPTCHA plugin contract и должна поставляться его репозиторием.
Привязка к WAF выполняется стандартным generic action:

```yaml
wafPolicies:
  browser-check:
    rules:
      - when: { path: { prefix: /protected } }
        then:
          plugin: { instance: edge-check, capability: edge.challenge }
```

Плагин должен самостоятельно объявить callback route capability и выбрать
только собственные settings для обращения к внешнему provider. Никакие имена
provider-а или URL из клиентского body не становятся trusted context автоматически;
источник и валидация каждого значения должны быть определены схемой и
алгоритмом самого плагина.

## Текущее состояние и следующая работа

В текущем runnable skeleton есть только deterministic provider для локальных
проверок. Он не выполняет исходящие обращения к Google, Cloudflare, hCaptcha или
другим поставщикам. Также skeleton не реализует завершённый flow из WAF
challenge, browser callback и plugin-owned session cookie. Поэтому его нельзя
использовать как production-защиту.

Перед production-ready состоянием репозиторию плагина нужно отдельно закрепить
capability request/response schemas, provider settings schema, безопасный egress
allowlist, secret-grant scope, token replay/expiry model, callback route,
HttpOnly/Secure/SameSite cookie policy и end-to-end тесты через generic Gateway
dispatch. Gateway contract остаётся независимым от имён provider-ов и этих
деталей реализации.

Общее поведение generic WAF action и redaction описано в
[Gateway security runtime](/gateway/configuration/security).
