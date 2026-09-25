# Cookie boundary

Страница описывает разделение ответственности и статус интеграции cookie в
Gateway. Единственный normative source для JSON contract — репозиторий
[`pluginprotocol`](https://github.com/Liapoldus/pluginprotocol):
[политика входящих cookie](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/http/v1/cookie-policy.schema.json),
[семантика границы и ошибок](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/http/v1/cookie-boundary.json),
[typed HTTP response actions](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/http/v1/response-action.schema.json).
Эта страница не копирует их схемы и не вводит Gateway API или конфигурационный
синтаксис.

## Владение

- Plugin владеет назначением cookie, её значением и жизненным циклом сессии,
  включая rotation/revocation, срок действия и выбор `HttpOnly`.
- Gateway/Caddy владеет границей передачи: разрешает ли конкретная capability
  получить входящие cookie, фильтрует их и безопасно применяет plugin response.
- `HttpOnly` — атрибут browser-facing response cookie: JavaScript страницы не
  может читать такую cookie, но браузер отправляет её в последующих подходящих
  HTTP-запросах. Обычная cookie доступна JavaScript в соответствии с browser
  policy. Gateway не должен менять выбранное plugin значение атрибута.

## Нормативное поведение pluginprotocol v1

Политика входящих cookie относится ровно к паре plugin instance и capability.
Сравнение имён точное и чувствительное к регистру; wildcard и регулярные
выражения не поддерживаются. Перед `Call` или `Stream` разрешено передать только
совпавшие пары, остальные исключаются. Для совпавших повторов сохраняются
порядок и кратность; их интерпретация принадлежит plugin. Пустой allow-list
ничего не передаёт. Сама политика остаётся локальной для Gateway/Caddy и не
входит в plugin payload.

Исходящие cookie задаются только типизированными response actions. Каждое
действие формирует отдельный `Set-Cookie`; plugin не задаёт его через общий
headers map. Явный boolean `httpOnly` различает HttpOnly и script-readable
cookie. Весь response, включая каждое cookie action, должен быть проверен
атомарно до commit headers/upgrade: ошибка не должна оставлять частично
отправленный ответ.

Policy validation, фильтрация запроса и проверка response выполняются без
раскрытия cookie values. Значения редактируются в логах, traces, audit,
диагностике и ошибках. Точные поля, ограничения и error semantics находятся
только в связанных выше versioned contracts.

## Состояние интеграции в Gateway

Protocol contract уже опубликован, но текущий Gateway runtime ещё не реализует
эту cookie boundary. В существующем Caddy plugin handler входящий заголовок
`Cookie` исключается из передаваемых HTTP headers; cookie-specific allow-list и
отдельное поле запроса пока не подключены. Если plugin вернёт cookie actions,
handler отклонит ответ до записи `Set-Cookie`; generic `Set-Cookie` response
header также запрещён. Следовательно, сейчас plugin через этот handler не
может получить browser cookie или установить её.

Это ограничение относится к Liapoldus plugin dispatch, а не утверждает
поведение произвольных native Caddy handlers. Внешний или Constructor session
cookie также не является cookie plugin и описывается отдельными security
контрактами.

Будущая интеграция должна связать allow-list с выбранными instance и capability,
проверять её до активации candidate dispatch configuration, фильтровать request
до `Call`/`Stream`, а все response actions валидировать до commit. Неприемлемые
policy/request/action должны завершаться безопасно и без частичного forwarding;
сырой cookie value нельзя включать в ошибку. Это целевое поведение protocol
contract, а не утверждение о реализованном runtime. Реализация и E2E-проверки
остаются в [roadmap Gateway v1](v1-migration-roadmap#план-этапов-и-gates) и
[`core/TODO.md`](https://github.com/Liapoldus/core/blob/main/TODO.md).
