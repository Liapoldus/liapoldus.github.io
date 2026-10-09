# Liapoldus: экосистема

Liapoldus v1 объединяет Core, отдельные plugins и две библиотеки для управления
сервисами и публикации сайтов.

В экосистеме также создаётся Liapoldus Studio — отдельный клиент для
обслуживания экосистемы с desktop-вариантом на Wails и заделом на web-вариант.
Web-каркас привязан к одному Core, не поддерживает SSH-мост и переключение
системы; оба варианта используют общий React UI. Подключение к Core пока не
реализовано, Studio не входит в сервисную приёмку v1.

<img src="/diagrams/ecosystem.svg" alt="Core управляет plugins, Server plugin обслуживает опубликованный сайт" />

<div class="cards">
  <a class="card" href="/core/"><h3>Core</h3><p>Control API, SQLite desired state и конфигурация plugins.</p></a>
  <a class="card" href="/plugins/"><h3>Plugins</h3><p>Изолированные процессы для прикладной и инфраструктурной логики.</p></a>
</div>

## Какую проблему решаем

В v1 команда получает безопасный control plane и HTTP/HTTPS Server plugin для
сайтов и API. Core хранит долговременный desired state в SQLite; пользовательский
HTTP traffic обслуживает отдельно запущенный Server plugin на базе Caddy.
Публичный L4 relay отложен до v3.

## Для кого

| Роль | Задача | Главная точка входа |
| --- | --- | --- |
| Оператор | настроить, проверить, применить и наблюдать Core | [Core](/core/) |
| Интегратор | подключить capability-процесс | [Плагины](/plugins/) |
| Реализатор | понять границы продуктов и API | [Архитектура](/architecture/) |

## Продуктовые границы

**Core v1** владеет desired state, Management API, конфигурационным lifecycle,
аудитом и reconciliation. Оператор вручную устанавливает и запускает сервисы;
Core подключается к fixed endpoints и применяет settings. **Server plugin**
владеет публичными HTTP/HTTPS listener-ами, TLS и исполнением HTTP traffic.
Остальные plugins владеют подключаемой capability-логикой, своими данными и
настройками.

**Отложено до v2:** внешнее размещение, self-registration/rollout и смешанные
peer transports. **Отложено до v3:** масштабирование Server,
Caddy-L4/public TCP/UDP relay, CAPTCHA, Identity/OIDC/OAuth,
FFI/Python и монолитная композиция. Studio развивается отдельно. Внутренний
TCP/QUIC transport `pluginprotocol` остаётся generic plugin↔plugin механизмом
и не открывает публичный L4 data plane.

## Принципы продукта

- **Явные долговременные источники.** Core хранит control-plane metadata и
  версии в SQLite, а большие и неизменяемые артефакты — в файлах. Активный
  runtime собирается в памяти.
- **Безопасное действие важнее удобной команды.** Валидация происходит до
  публикации; опасные действия показывают цель, последствия и путь отката.
- **Расширение без проникновения в ядро.** Предметная логика живёт в plugins;
  Core знает только общий Plugin SDK REST lifecycle.

Дальше: [архитектура экосистемы](/architecture/) или [правила кода](/guidelines/).
