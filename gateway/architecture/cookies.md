# Cookie-контракт Gateway

Эта страница фиксирует v1-архитектуру HTTP-cookie на границе Gateway и plugin.
Она не переносит владение сессией в ядро и не объявляет cookie конкретного
plugin частью общего Gateway API. Wire-схемы capability и typed response
actions будут закреплены в
[`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol) до реализации.

## Владение и граница

- User agent хранит cookie и автоматически отправляет подходящие значения в
  `Cookie` request header.
- Подключённый plugin владеет назначением cookie, значением, идентификатором
  сессии, rotation/revocation, сроком действия и тем, должна ли cookie быть
  `HttpOnly`.
- Gateway остаётся stateless относительно cookie: не хранит browser cookie jar,
  не читает session state и не интерпретирует значение как identity.
- Gateway маршрутизирует запрос и безопасно переносит разрешённые cookie через
  HTTP boundary; cookie и связанные значения никогда не попадают в access log,
  application log, trace, audit или ошибку.

`HttpOnly` — атрибут response cookie, запрещающий доступ к ней из browser
JavaScript. Он не меняет HTTP-передачу: браузер всё равно отправляет такую cookie
в `Cookie`. Обычная cookie также передаётся браузером по HTTP, но доступна
JavaScript, если другие browser policy не запрещают его. Gateway не должен
самостоятельно добавлять или удалять `HttpOnly`.

## Что уже работает в Gateway

- HTTP plugin response может вернуть список отдельных cookie actions; Gateway
  передаёт каждый элемент как самостоятельный `Set-Cookie` header, не объединяя
  несколько cookie в одну строку.
- `Set-Cookie`, пришедший в response headers plugin action, также добавляется
  отдельно. Это текущая совместимая форма; целевой v1-контракт ниже оставляет
  только typed cookie action, чтобы исключить дублирующие способы задания.
- Обычный HTTP proxy работает как прозрачный proxy для request `Cookie` и
  upstream `Set-Cookie`.
- Cookie request header сейчас исключён из HTTP capability и WAF capability
  context, как и `Authorization` / `Proxy-Authorization`. Поэтому browser
  session plugin пока не получает входящую cookie через общий plugin dispatch.
- Текущий cookie response action — строка без структурной проверки атрибутов;
  проверка имени/value/атрибутов и ограничения размера ещё не реализованы.

## Целевой v1-контракт

Пример отдельного cookie action (схема JSON публикуется в `pluginprotocol`):

```json
{
  "cookies": [
    {
      "name": "session",
      "value": "<opaque-plugin-session-value>",
      "path": "/",
      "secure": true,
      "httpOnly": true,
      "sameSite": "Lax"
    },
    {
      "name": "theme",
      "value": "dark",
      "path": "/",
      "secure": true,
      "httpOnly": false,
      "sameSite": "Lax"
    }
  ]
}
```

Это два `Set-Cookie` header, а не объединённая cookie и не Gateway session
storage. Значение session opaque для Gateway и не должно появляться в логах.

### Входящие cookie

Cookie не добавляется в generic `headers` автоматически и не пересылается plugin
по умолчанию. Конфигурация binding конкретной capability разрешает конечный
список имён через plugin context, например `context.cookies`. Gateway извлекает
только эти имена из входящего `Cookie` header и передаёт отдельное поле
`request.cookies`; остальные cookie остаются недоступны plugin. Имена
сопоставляются без изменения регистра, порядок повторяющихся значений
сохраняется.

```yaml
authPolicies:
  browser-session:
    plugin:
      instance: identity
      capability: session.authenticate
      context:
        cookies: [session]
```

В примере capability видит только `session`; она не получает `theme` или
произвольные cookies браузера.

Разрешение ограничивается конкретным `instance + capability`, а не всем
процессом. Пустой или отсутствующий список означает «не передавать cookie».
WAF context продолжает исключать cookie без исключений: WAF получает только
нормализованные признаки запроса, а не сессию. Cookie не становится secret grant
и не может быть выдана plugin по произвольному имени во время вызова.

### Исходящие cookie

Целевой HTTP response schema содержит массив типизированных cookie actions; одна
action соответствует ровно одному `Set-Cookie`. Поля action:

| Поле | Семантика |
| --- | --- |
| `name`, `value` | Обязательные имя и значение; CR/LF и управляющие символы запрещены. |
| `path`, `domain` | Необязательные scope-атрибуты; при отсутствии `Domain` cookie host-only. |
| `expires`, `maxAge` | Абсолютный срок и/или относительный срок; удаление — `Max-Age=0` либо прошедший `Expires`. |
| `secure`, `httpOnly` | Явные boolean-атрибуты; Gateway не повышает и не ослабляет их молча. |
| `sameSite` | `Strict`, `Lax`, `None` или отсутствие атрибута. `None` требует `Secure`. |

Gateway валидирует action до отправки response, отклоняет неоднозначные или
повторные атрибуты, защищает префиксы `__Host-` и `__Secure-` по их правилам и
сериализует атрибуты в один `Set-Cookie`. Cookie actions не допускается задавать
одновременно через общий `headers.Set-Cookie` и typed-массив. Ответ с неверной
cookie action не должен частично отправить набор cookies: Gateway завершает его
типизированной ошибкой plugin protocol до фиксации HTTP response headers.

Browser CORS credentials остаются отдельной политикой. Если frontend отправляет
cross-origin cookie, route обязан использовать разрешённый конкретный Origin,
`Access-Control-Allow-Credentials: true` и browser-compatible cookie attributes;
wildcard Origin с credentials запрещён. `SameSite=None` без `Secure` считается
ошибкой action.

## Безопасность и ограничения

- Gateway никогда не отражает полученную cookie в диагностике, trace attributes,
  audit или ошибках валидации; логировать разрешено только факт наличия и
  безопасные агрегированные размеры.
- Cookie context передаётся только capability, указанной в binding. Изменение
  allow-list требует успешной валидации новой конфигурации и atomic activation.
- Cookie нельзя передавать через WAF context, общие gRPC metadata, error message
  или control plane.
- Cookie actions валидируются целиком до записи статуса/body. Несколько
  `Set-Cookie` никогда не склеиваются запятой.
- Лимит числа actions и суммарного сериализованного размера задаётся в
  versioned contract, проверяется до ответа и покрывается boundary tests; он не
  заимствует неявно request body limit.
- Численные v1 bounds: allow-list содержит максимум 16 разных имён; входящий
  Cookie representation — до 8 KiB; response — до 32 actions, 4 KiB на одну
  serialized cookie и 16 KiB суммарно. Все величины измеряются в octets после
  сериализации и до записи headers.
- TLS listener, upstream TLS и plugin transport TLS — независимые hop security
  boundaries. `Secure` относится к browser-facing cookie и не заменяет TLS/mTLS
  до upstream или remote plugin.

## Этап v1

Реализация выполняется test-first в `core/tests/`; JSON schema и capability
examples публикуются в `pluginprotocol` как единственном источнике контрактов.
Минимальное покрытие: plain и HttpOnly cookie round-trip через browser-like
client; allow-listed входящие cookies; отказ в передаче неразрешённых имён;
повторные `Set-Cookie`; удаление и expiry; `SameSite=None` без `Secure`;
префиксы `__Host-` / `__Secure-`; CRLF/control chars; oversized action; запрет
утечки в access log, error, trace и audit; HTTP/1.1, HTTP/2 и remote-plugin TLS.

До реализации действует текущая граница: plugin может вернуть cookie как raw
строку, но Gateway не проверяет полный набор browser security rules, а входящая
cookie в plugin context не передаётся.
