# Пользователи и UX

Liapoldus v2 предоставляет Core Management API, standalone CLI, Studio, Server
plugin для публичного HTTP traffic и forms-db для простых форм. Studio работает
с Project/Git, а CLI обращается к Core API; Core credentials не передаются в
Studio или браузер.

## Модель действия

У каждого изменения один жизненный цикл: **изменить source → проверить →
закоммитить → получить approval → plan/apply через CLI → подтвердить rollout →
откатить при необходимости**. Core хранит применённое состояние в SQLite и
показывает generations и durable operations; plugin подтверждает поколение.
Публичный traffic не проходит через Management API.

![Путь изменения для оператора](/diagrams/operator-journey.svg)

## Роли и результат

| Роль | Действие | Результат |
| --- | --- | --- |
| Оператор | выбирает target и запускает CLI plan/apply | generation, per-replica Reload acknowledgement, operation state и audit |
| Владелец сайта | передаёт статический артефакт Server plugin через Admin Surface | immutable artifact, digest и результат проверки; `current`/`previous` принадлежат Server plugin |
| CI | запускает тот же CLI с exact commit и environment approval | стабильный operation ID, typed error и revision reference |
| Разработчик plugin | объявляет capabilities, settings schema и Admin Surface | отдельный процесс без специальных правил в Core |

## Изменения и восстановление

Настройки передаются Core как raw JSON. Core валидирует generic schema,
сохраняет исходные bytes и вызывает REST `Reload(generation)`; plugin получает
точное поколение через защищённый config-pull endpoint.

Смена settings и plugin lifecycle показывает revision/generation и operation.
При конфликте CAS API возвращает текущую revision. После timeout клиент читает
operation по её ID; повторная мутация требует того же idempotency key и
соблюдения контракта конкретной операции.

## Поведение при ошибке

Ошибка должна отвечать на четыре вопроса: что не получилось, какой ресурс или
revision затронуты, изменилось ли активное состояние и что безопасно делать
дальше. API отдаёт typed problem; audit хранит только metadata/digests. Ни один
слой не показывает secret values, private keys, cookies, Authorization, grants
или raw plugin payloads.

## Критерии качества

- Изменение desired config не требует менять Core bootstrap YAML.
- Ошибка validation, CAS, storage или Reload ACK не приводит к заявлению успеха
  и сохраняет ранее подтверждённое состояние.
- После disconnect CLI восстанавливает operation по её ID, а Studio импортирует report.
- Недоступность одного plugin ограничивает только связанные capabilities.
- Management API и Caddy Admin API не становятся public browser endpoints.
