# Документация Liapoldus — состояние миграции

Канонические продуктовые контракты принадлежат Core, CLI, Studio, Service SDK,
Wool и владельцам сервисов. Этот репозиторий собирает их по закреплённым
ревизиям и хранит только общие материалы экосистемы.

## Словарь и границы

- Runtime-компоненты, управляемые Core, называются сервисами.
- Service SDK владеет регистрацией, конфигурацией, lifecycle и универсальными
  health/metrics контрактами сервисов.
- Wool обеспечивает прямые вызовы между независимыми сервисами. Core не
  проксирует бизнес-трафик.
- Только расширения desktop-редактора называются Studio plugins.
- Control plane: Studio → typed CLI → Core Management API → Service SDK REST.
- Data plane: Service → Wool → Service.

## Локальная миграция

- [x] Сохранить прежний план Studio в архиве и заменить `studio/plan.md`
  согласованным планом конфигуратора и терминологической миграции.
- [x] Перенести активные owner checkouts в `services/`, Service SDK и Wool — в
  одноимённые каталоги; сохранить отдельные Git boundaries там, где они были.
- [x] Обновить локальные Core, CLI, Studio, Service SDK, Wool и Server contracts
  на новую терминологию и API paths.
- [x] Добавить preview/recovery для миграции Studio workspace и сохранить
  registry данные CLI, SQLite поколения Core и исторические reports.
- [x] Подключить опубликованный Core contract bundle к docs staging напрямую,
  без второй устаревшей копии OpenAPI и схем.
- [x] Завершить терминологическую миграцию активных сервисов и проверить
  Go-модули отдельно и через `services/go.work`.
- [x] Пройти локальные межрепозиторные проверки: Core/Server/forms-db smoke,
  Core/CLI/Studio, generated Wails bindings, Service SDK/Wool и VitePress.

## Публикация

- [x] Проверить доступность новых URL `Liapoldus/service-sdk` и
  `Liapoldus/wool`; на 2026-10-13 они доступны и старые имена ведут к тем же
  опубликованным HEAD.
- [ ] После owner commits/push закрепить в `docs-sources.yaml` точные SHA
  мигрированных `service-sdk` и `wool`; до публикации локальных изменений pins
  не менять.
- [ ] После публикации source revisions выполнить remote `docs:sync`, build и
  проверить hosted CI. Локальный VitePress build по соседним worktrees не
  заменяет remote pin/hosted gate.
- [ ] Commit, push, release и Pages deployment — только по отдельному явному
  запросу пользователя.

## Конфигуратор Studio — владелец общего сайта

- [x] Определить owner routing: Studio и каждый Service SDK/Core/CLI/Service
  контракт редактируются только в их исходном репозитории; сайт не создаёт
  копию спецификаций.
- [x] Развести source placement: runtime-компоненты остаются сервисами в
  `services/`, Server editor package — StudioPlugin в
  `plugins/studio-server/`; frozen `plugins/captcha`/`identity` не включать.
- [x] Сохранить канонический план в `studio/plan.md` и его предусмотренный
  маршрут `/studio/plan`; VitePress build по локальным owner worktrees проходит.
- [ ] После появления опубликованных owner revisions синхронизировать новые
  разделы `/service-sdk/`, `/wool/` и `/services/` по точным commit SHA;
  проверить nav/sidebar и отсутствие ссылок на старые runtime routes.
- [ ] Добавлять сюда только общий UX/product overview и межсервисную архитектуру;
  implementation details и таблицы контрактов оставлять у владельцев.

## Замороженные сервисы

CAPTCHA и Identity остаются вне активной миграции. Их owner repositories,
контракты и product code не меняются; страницы агрегатора показывают только
статус и не описывают устаревший runtime API как действующий.
