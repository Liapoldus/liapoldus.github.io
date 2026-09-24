# Пользователи и UX

UX Liapoldus разделяет автора сайта, оператора Gateway, Constructor user и
plugin developer. Constructor — единственный UI настройки Gateway; его
изменения проходят только через versioned Management API.

## Модель действия

У любого изменения один жизненный цикл: **описать → проверить → применить →
подтвердить → откатить при необходимости**. Проверка не меняет runtime;
применение формирует immutable результат; UI показывает digest/revision,
операцию и доступное безопасное следующее действие.

![Путь изменения для оператора](/diagrams/operator-journey.svg)

## Роли и результат

| Роль | Действие | Результат |
| --- | --- | --- |
| Автор frontend | собирает артефакт и добавляет roots в application group release | immutable artifact, digest и результат проверки |
| Gateway operator | редактирует Caddyfile group и управляет Caddy/Admin state | preview, operation, current/previous revision, drift/checkpoint state |
| CI | публикует group release или вызывает rollback | стабильный operation ID, errors и revision reference |
| Plugin developer | объявляет generic capability/settings/admin surface | отдельный process без права самостоятельно создавать traffic listeners |

## UX Constructor и Gateway

Constructor показывает Caddyfile source как есть, не преобразует его в свою
DSL и не редактирует bootstrap configuration кроме setup при установке. Для
каждого group release UI показывает candidate diff, Caddy validation, frontend
archive digest, ожидаемый current revision и последствия для полного snapshot.

При conflict пользователь видит фактическую current revision. При Caddy Admin
drift group publish блокируется; UI показывает последнюю checkpoint и предлагает
явно восстановить её либо reconcile к выбранной полной group composition.
Любое создание/rotate service key раскрывает значение один раз и сохраняет его
через OS credential store.

## Поведение при ошибке

Ошибка должна отвечать на четыре вопроса: что не получилось, где источник,
изменилось ли активное состояние и что делать дальше. API отдаёт typed problem,
UI показывает безопасную диагностику, audit хранит metadata. Ни один слой не
показывает secret values, private keys, cookies, Authorization или raw
Caddy/plugin payload.

## Критерии качества

- Оператор создаёт native Caddyfile group и frontend release без доступа к
  исходному коду Gateway.
- Ошибка validation, CAS, Caddy activation или storage не приводит к заявлению
  успеха и сохраняет прежний runtime.
- При disconnect UI восстанавливает operation по idempotency key/digest.
- Plugin не получает права на слушатель, который не был выдан через Gateway.
- Caddy Admin не становится открытым browser endpoint.
- Поведение и terminology одинаковы для Constructor, CLI и Management API.
