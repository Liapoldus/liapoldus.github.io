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
совпавшие пары, остальные исключаются. Это правило применяется к HTTP
capability, поддерживающей `Call`, `HTTP Stream`, WebSocket или SSE; для
TCP/UDP-only capability cookie policy недопустима. Для совпавших повторов
сохраняются порядок и кратность; их интерпретация принадлежит plugin. Пустой
allow-list ничего не передаёт. Сама политика остаётся локальной для
Gateway/Caddy и не входит в plugin payload.

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

Изолированные Caddy `Call` и `Stream` handler integration tests проверяют
передачу cookie только по allow-list и обработку typed response actions, включая
`HttpOnly`; некорректный response не должен частично менять headers. `serve`
читает inventory instances из SQLite, запускает локальные runtime и передаёт
dispatch bindings embedded Caddy. Generic API регистрации/изменения plugin
instances пока отсутствует; полный путь от чистой установки до настройки
policy не подтверждён.

## Управление policy в Gateway v1

Allow-list — Gateway-owned policy, а не plugin setting и не директива
Caddyfile. Каждая запись адресуется парой `instanceId + capability`, хранится в
отдельной SQLite policy relation и имеет монотонную `revision`. В ней нет
значений cookie — только разрешённые имена.

Каноническая machine-readable поверхность —
[`management.openapi.yaml`](/spec/management.openapi.yaml). В core реализованы
handler `GET`/`PUT`, сильный ETag/If-Match CAS, SQLite schema v3, audit в одной
транзакции с policy CAS и embedded-Caddy activation с rollback при ошибке
durable commit. Caddy принимает policy для capability с HTTP `Call`, HTTP Stream,
WebSocket или SSE mode и отвергает TCP/UDP-only capability. Это ещё не полная
production-приёмка: остаются child-process
conformance для фактической фильтрации cookies и typed response actions,
crash-recovery между activation и commit, rollback-failure fencing и
external-Caddy snapshot synchronization. Текущий endpoint в external-варианте
отвечает unavailable.

- `GET /api/plugins/{instanceId}/cookie-policies/{capability}` возвращает
  `instanceId`, `capability`, `allowedNames`, `revision` и сильный `ETag` вида
  `"<revision>"`. Для ещё не созданной policy возвращается пустой allow-list с
  revision `0` и `ETag: "0"`. Instance и capability должны существовать;
  capability и её HTTP invocation mode сверяются с Manifest подключённого plugin.
- `PUT` на том же ресурсе принимает только `allowedNames` и обязательный
  `If-Match` со значением текущего `ETag`. Имена уникальны, сравниваются точно
  и чувствительно к регистру; wildcard и регулярные выражения запрещены.
  Несовпадающий `If-Match` возвращает `412 Precondition Failed`, отсутствующий —
  `428 Precondition Required`; ни один случай не меняет runtime или audit.
- Успешное изменение создаёт audit event `plugin.cookie_policy.replace`, без
  cookie values, secret references и содержимого plugin payload.

PUT сериализуется с другими изменениями policy. Gateway строит и проверяет
candidate dispatch generation, затем активирует её в Caddy. Только после
успешной активации SQLite compare-and-swap фиксирует новую revision вместе с
audit event; успешный ответ содержит новую revision и соответствующий `ETag`.
Ошибка подготовки или активации сохраняет прежнюю policy и generation. Если
durable CAS/audit завершается ошибкой после активации, Gateway восстанавливает
прежний generation и не сообщает об успехе. При аварийном завершении между
активацией и durable commit восстановление при запуске обязано поднять последнее
зафиксированное поколение до открытия public listeners.

Для external Caddy PUT возвращает `503 Service Unavailable`, пока закрытый
механизм private immutable dispatch snapshot sync не способен подготовить и
подтвердить candidate generation. Gateway не должен сохранять policy отдельно
от runtime и не должен считать успешной синхронизацию только конфигурации
Caddyfile. До появления этого механизма endpoint остаётся недоступным в external
variant.

Это ограничение относится к Liapoldus plugin dispatch, а не утверждает
поведение произвольных native Caddy handlers. Внешний или Constructor session
cookie также не является cookie plugin и описывается отдельными security
контрактами.

Подтверждённые handler slices и отсутствующая production composition сведены в
[матрицу реализации core](/gateway/architecture/implementation#текущее-состояние-core).

Оставшаяся реализация должна загрузить durable allow-list в active dispatch
generation, фильтровать request до `Call`/`Stream` и валидировать все response
actions до commit. Неприемлемые policy/request/action завершаются безопасно и без
частичного forwarding; сырой cookie value не включается в ошибку. Оставшаяся
работа перечислена в [roadmap Gateway v1](v1-migration-roadmap#план-этапов-и-gates) и
[`core/TODO.md`](https://github.com/Liapoldus/core/blob/main/TODO.md).
