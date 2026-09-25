# Liapoldus: экосистема

Liapoldus — экосистема из трёх самостоятельных продуктов. Вместе они
покрывают путь от React-проекта в Git до безопасно опубликованного сайта.

<img src="/diagrams/ecosystem.svg" alt="Constructor работает с Git, Gateway и Plugins; Gateway публикует статический frontend" />

<div class="cards">
  <a class="card" href="/gateway/"><h3>Gateway</h3><p>L7/L4 runtime, маршрутизация, TLS, static delivery и control API.</p></a>
  <a class="card" href="/plugins/"><h3>Plugins</h3><p>Изолированные capability-процессы для прикладной и инфраструктурной логики.</p></a>
  <a class="card" href="/constructor/"><h3>Constructor</h3><p>React IDE, site management и визуальный control plane Gateway.</p></a>
</div>

## Какую проблему решаем

Команде нужны публикация сайтов и API, TCP/UDP relay и безопасное управление
Gateway без обязательного внешнего центрального control plane. Gateway хранит
долговременные control-plane metadata в SQLite; пользовательский traffic
исполняет Caddy.

## Для кого

| Роль | Задача | Главная точка входа |
| --- | --- | --- |
| Оператор | настроить, проверить, применить и наблюдать Gateway | [Gateway](/gateway/) |
| Интегратор | подключить capability-процесс | [Плагины](/plugins/) |
| Разработчик | создавать React-сайт и его модель | [Constructor](/constructor/) |
| Реализатор | понять границы продуктов и API | [Архитектура](/architecture/) |

## Продуктовые границы

**Gateway** владеет desired state, Management API, группами и revisions,
plugin lifecycle, аудитом и reconciliation. **Caddy** владеет публичными
listener-ами, TLS и исполнением HTTP/TCP/UDP traffic. **Plugins** владеют
подключаемой capability-логикой. **Constructor** владеет проектной,
редакторской и operational metadata, но не реализует Gateway повторно и не
делает БД источником исходного кода.

**Не входят в ядро:** CMS, CI/CD, identity provider, очереди и нативные
transports сверх HTTP/TCP/UDP. Прикладной протокол реализуется upstream или
plugin поверх TCP/UDP.

## Принципы продукта

- **Явные долговременные источники.** Gateway хранит control-plane metadata и
  версии в SQLite, а большие и неизменяемые артефакты — в файлах. Активный
  runtime собирается в памяти; точные правила хранения заданы архитектурой
  Gateway.
- **Безопасное действие важнее удобной команды.** Валидация происходит до
  публикации; опасные действия показывают цель, последствия и путь отката.
- **Простой путь — короткий.** Первый статический сайт не требует знания
  плагинов, API управления или внутреннего протокола.
- **Расширение без проникновения в ядро.** Предметная логика живёт в плагинах;
  Gateway знает только общий protocol и lifecycle, а Caddy исполняет трафик и
  вызывает подключённые capabilities.

Дальше: [архитектура экосистемы](/architecture/), [правила кода](/guidelines/)
или [Constructor](/constructor/).
