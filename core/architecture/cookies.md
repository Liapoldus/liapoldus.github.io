# Cookie boundary

Cookie policy — control-plane data Core; plugin HTTP response actions и
преобразование их в HTTP headers принадлежат Server plugin contract. `pluginprotocol`
не определяет HTTP cookies: он обеспечивает только generic plugin-to-plugin
network transport.

## Владение

- Plugin владеет назначением cookie, её значением и жизненным циклом сессии:
  rotation/revocation, срок действия и выбор `HttpOnly`.
- Core хранит allow-list имён на пару `instance + capability`, проверяет
  revision/CAS и распространяет её в desired generation Server plugin.
- Server plugin отфильтровывает входящий `Cookie` по подтверждённой generation,
  затем вызывает целевой plugin напрямую по разрешённой interaction policy.
- Plugin capability contract определяет типизированное HTTP response action
  для cookie. Caddy формирует отдельный `Set-Cookie` для каждого action.

`HttpOnly` запрещает JavaScript страницы читать cookie, но не мешает браузеру
посылать её в последующих подходящих запросах. Атрибут задаёт plugin, а
посредник обязан сохранить его без изменений.

## Policy API и активация

Machine-readable endpoint —
[`management.openapi.yaml`](/spec/management.openapi.yaml):
`GET`/`PUT /api/plugins/{pluginId}/cookie-policies/{capability}`. `PUT`
требует strong `If-Match`, содержит только уникальные имена без wildcard и
regex, а успешная операция создаёт audit event без значений cookie.

Изменение подготавливается как candidate Core generation. Server plugin
проверяет и атомарно активирует полную policy вместе с dispatch settings;
Core фиксирует SQLite revision/audit после требуемого ACK. При ошибке Core
сохраняет предыдущую revision и компенсирует уже обновлённые participants.
После рестарта Core восстанавливает последнее durable поколение до readiness.

В v1 Caddy — отдельный plugin и имеет одну replica. Нет embedded/external
Caddy variants и Caddy Admin API в Core. При отказе Caddy policy mutation не
считается успешной; несогласованное состояние не открывается как ready.

## Безопасность и проверка

Входная allow-list относится только к HTTP-вызовам, которым применимы cookies;
TCP/UDP capabilities её не получают. Имена сравниваются точно и с учётом
регистра, wildcard и regex не поддерживаются. Пустой список не передаёт cookie.
Дубликаты входных cookie сохраняют порядок и кратность, если это допускает
protocol contract.

Весь plugin response, включая cookie actions, проверяется до отправки headers
или upgrade. Ошибка не оставляет частично сформированный ответ. Значения
cookie редактируются в log, trace, audit, diagnostics и errors. Caddy owner
contract/tests фиксируют допустимые actions; Core acceptance проверяет
allow-list, ordinary/`HttpOnly` действия, атомарный отказ, CAS/audit, restart
recovery и отсутствие утечек.
