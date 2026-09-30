# Пользователи и UX

Liapoldus разделяет автора сайта, оператора Core, Constructor user и plugin
developer. Constructor остаётся отдельным продуктом и единственным UI
управления Core; он взаимодействует только с Management API Core. Этот
документ описывает целевые продуктовые границы, не меняя замороженные исходники
Constructor и `react-lib`.

## Модель действия

У каждого изменения один жизненный цикл: **описать → проверить → применить →
подтвердить → откатить при необходимости**. Core хранит durable desired state
в SQLite, показывает candidate/active revision и durable operation, а plugin
подтверждает применённое поколение. Публичный traffic не проходит через
Management API.

![Путь изменения для оператора](/diagrams/operator-journey.svg)

## Роли и результат

| Роль | Действие | Результат |
| --- | --- | --- |
| Автор frontend | собирает артефакт и отправляет его Server plugin через объявленный Admin Surface | immutable artifact, digest и результат проверки; `current`/`previous` принадлежат Server plugin |
| Core operator | создаёт plugin instances с выбранным deployment mode, settings и interaction policies через Management API | candidate revision, process/provider operation, per-replica Reload ACK, operation state и audit |
| CI | вызывает versioned Management API для разрешённых lifecycle/settings operations | стабильный operation ID, typed error и revision reference |
| Plugin developer | объявляет generic capabilities, settings schema и Admin Surface | отдельный процесс без знания специальных правил Core |

## UX Constructor и Core

Constructor формирует запрос по опубликованным schema/OpenAPI и не становится
альтернативным хранилищем Core desired state. Browser не получает Core
Bearer credential или plugin connection details; сетевой доступ выполняет
Constructor backend. Настройки передаются Core, Core валидирует schema и
сохраняет exact versioned JSON. Затем Core вызывает REST `Reload(generation)`,
и plugin сам забирает точный документ через защищённый config-pull endpoint.

Смена settings, plugin lifecycle и взаимодействий показывает ожидаемую
revision/generation и operation. При конфликте CAS интерфейс получает текущую
revision и требует явного повторного действия. При timeout операция читается по
operation ID и не отправляется повторно с новым idempotency key без решения
пользователя. Caddy traffic settings редактируются как settings Server plugin,
а не через отдельный Caddyfile/group editor в Core.

## Поведение при ошибке

Ошибка должна отвечать на четыре вопроса: что не получилось, какой ресурс или
revision затронуты, изменилось ли активное состояние и что безопасно делать
дальше. API отдаёт typed problem, UI показывает безопасную диагностику, audit
хранит только metadata/digests. Ни один слой не показывает secret values,
private keys, cookies, Authorization, grants или raw plugin payloads.

## Критерии качества

- Изменение desired config не требует редактировать Core YAML или применять
  независимый Caddy runtime config.
- Ошибка validation, CAS, process/provider lifecycle, storage или Reload ACK не приводит
  к заявлению успеха и сохраняет ранее подтверждённое состояние.
- После disconnect UI восстанавливает operation по тому же idempotency key и
  operation ID.
- Недоступность одного plugin ограничивает только связанные capabilities;
  несвязанные страницы и сервисы остаются доступны.
- Management API и Caddy Admin API не становятся public browser endpoints.
- Термины и error semantics одинаковы для Constructor backend, CLI и API.
