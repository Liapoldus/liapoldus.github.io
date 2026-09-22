# Архитектура Liapoldus

Liapoldus состоит из независимых продуктов с явными API-границами. Это не
монолит: каждый продукт можно развивать и развертывать отдельно.

<img src="/diagrams/ecosystem.svg" alt="Архитектура экосистемы Liapoldus" />

| Продукт | Владеет | Не владеет |
| --- | --- | --- |
| [Gateway](/gateway/) | listeners, TLS, routes, upstreams, releases, runtime snapshot | UI Constructor, прикладная логика plugins |
| [Plugins](/plugins/) | capability-логика, свой жизненный цикл и конфигурационная схема | public socket, маршрутизация и raw secrets |
| [Constructor](/constructor/) | Git-native проект, редакторы, snapshots, builds, deployment metadata | реализация Gateway и proprietary исходники |

## Путь публикации

`Git revision → Snapshot → validation → Build → static artifact → Gateway
release`. Snapshot фиксирует, что именно собирается и развёртывается; он не
подменяет ни Git commit, ни версию сущности.

## Документы

<div class="cards">
  <a class="card" href="/architecture/boundaries"><h3>Границы и инварианты</h3><p>Ownership, source of truth и production boundary.</p></a>
  <a class="card" href="/architecture/api-boundaries"><h3>API-границы</h3><p>Constructor, Gateway и Plugin Admin API.</p></a>
  <a class="card" href="/architecture/glossary"><h3>Глоссарий</h3><p>Единая терминология экосистемы.</p></a>
</div>
