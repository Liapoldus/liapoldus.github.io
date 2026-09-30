# Liapoldus: экосистема

Liapoldus — экосистема из трёх самостоятельных продуктов. Вместе они
покрывают путь от React-проекта в Git до безопасно опубликованного сайта.

<img src="/diagrams/ecosystem.svg" alt="Constructor работает с Git, Core и Plugins; Core публикует статический frontend" />

<div class="cards">
  <a class="card" href="/core/"><h3>Core</h3><p>Control API, SQLite desired state и конфигурация plugins.</p></a>
  <a class="card" href="/plugins/"><h3>Plugins</h3><p>Изолированные capability-процессы для прикладной и инфраструктурной логики.</p></a>
  <a class="card" href="/constructor/"><h3>Constructor</h3><p>React IDE, site management и визуальный control plane Core.</p></a>
</div>

## Какую проблему решаем

В v1 команда получает безопасный control plane и HTTP/HTTPS Server plugin для
сайтов и API. Core хранит долговременный desired state в SQLite; пользовательский
HTTP traffic обслуживает отдельно запущенный Server plugin на базе Caddy.
Публичный L4 relay отложен до v2.

## Для кого

| Роль | Задача | Главная точка входа |
| --- | --- | --- |
| Оператор | настроить, проверить, применить и наблюдать Core | [Core](/core/) |
| Интегратор | подключить capability-процесс | [Плагины](/plugins/) |
| Разработчик | создавать React-сайт и его модель | [Constructor](/constructor/) |
| Реализатор | понять границы продуктов и API | [Архитектура](/architecture/) |

## Продуктовые границы

**Core v1** владеет desired state, Management API, конфигурационным lifecycle,
аудитом и reconciliation. Оператор вручную устанавливает и запускает сервисы;
Core только подключается к fixed endpoints и применяет settings. **Server
plugin** владеет публичными HTTP/HTTPS listener-ами, TLS и исполнением HTTP
traffic. **Plugins** владеют
подключаемой capability-логикой. **Constructor** владеет проектной,
редакторской и operational metadata, но не реализует Core повторно и не
делает БД источником исходного кода.

**Отложено до v2:** Caddy-L4/public TCP/UDP relay, CAPTCHA, Identity/OIDC/OAuth,
TUF/plugin installation и управление процессами или контейнерами. Внутренний
TCP/QUIC transport `pluginprotocol` остаётся generic plugin↔plugin механизмом и
не открывает публичный L4 data plane.

## Принципы продукта

- **Явные долговременные источники.** Core хранит control-plane metadata и
  версии в SQLite, а большие и неизменяемые артефакты — в файлах. Активный
  runtime собирается в памяти; точные правила хранения заданы архитектурой
  Core.
- **Безопасное действие важнее удобной команды.** Валидация происходит до
  публикации; опасные действия показывают цель, последствия и путь отката.
- **Простой путь — короткий.** Первый статический сайт не требует знания
  плагинов, API управления или внутреннего протокола.
- **Расширение без проникновения в ядро.** Предметная логика живёт в плагинах;
Core знает только общий Plugin SDK REST lifecycle, а Server plugin исполняет трафик и
  вызывает подключённые capabilities.

Дальше: [архитектура экосистемы](/architecture/), [правила кода](/guidelines/)
или [Constructor](/constructor/).
