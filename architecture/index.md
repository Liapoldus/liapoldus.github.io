# Архитектура Liapoldus

Эта страница описывает только межсервисные границы. Полная архитектура каждого
сервиса принадлежит его репозиторию: [Core](/core/architecture/),
[Service SDK](/service-sdk/), [Wool](/wool/),
[сервисы](/services/). Агрегатор
собирает owner Markdown и диаграммы, не создавая их параллельные копии.

Для v2 единственным каноном по регистрации replicas, rollout и смешанному
размещению служит [Core deployment design](/core/architecture/service-deployment).
В v2 Core не управляет процессами или replica count. Установка и плановые
обновления Core и services принадлежат оператору.

Liapoldus состоит из независимых продуктов с явными API-границами. Это не
монолит: каждый продукт можно развивать и развертывать отдельно.

<img src="/diagrams/ecosystem.svg" alt="Архитектура экосистемы Liapoldus" />

| Продукт | Владеет | Не владеет |
| --- | --- | --- |
| [Core](/core/) | control plane, Management API, desired state, service lifecycle, releases и runtime reconciliation | traffic protocol execution, которое принадлежит Server service; прикладная логика services |
| [Core runtime](/core/architecture/core) | desired-state control plane, Management API и service lifecycle | public HTTP/TLS traffic Server service |
| [Сервисы](/services/) | capability-логика, свой lifecycle и schema | public socket, внешняя маршрутизация и raw secrets |

## Путь публикации

`Git revision → Snapshot → validation → Build → static artifact → Core
release`. Snapshot фиксирует, что именно собирается и развёртывается; он не
подменяет ни Git commit, ни версию сущности.

## Документы

<div class="cards">
  <a class="card" href="/architecture/boundaries"><h3>Границы и инварианты</h3><p>Ownership, source of truth и production boundary.</p></a>
  <a class="card" href="/architecture/api-boundaries"><h3>API-границы</h3><p>Core, Service SDK и service Admin API.</p></a>
  <a class="card" href="/architecture/glossary"><h3>Глоссарий</h3><p>Единая терминология экосистемы.</p></a>
</div>
