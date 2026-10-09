# Liapoldus: экосистема

Liapoldus v2 объединяет Core runtime, отдельные plugins, Studio и универсальный
CLI для управления commit-backed конфигурациями и публикации сайтов.

В экосистеме также создаются Liapoldus Studio и универсальный Liapoldus CLI.
Studio — отдельный desktop-first клиент для проектов, файлов и Git; CLI —
единый инструмент сборки и доставки commit-backed конфигураций в один или
несколько Core. Studio не обращается к Core напрямую.

<img src="/diagrams/ecosystem.svg" alt="Core управляет plugins, Server plugin обслуживает опубликованный сайт" />

<div class="cards">
  <a class="card" href="/core/"><h3>Core</h3><p>Control API, SQLite desired state и конфигурация plugins.</p></a>
  <a class="card" href="/studio/"><h3>Studio</h3><p>Проект, дерево файлов, Git, canvas и подготовка конфигураций.</p></a>
  <a class="card" href="/cli/"><h3>CLI</h3><p>Единый CLI для materialization, plan/apply и деплоя в один или несколько Core.</p></a>
  <a class="card" href="/plugins/"><h3>Plugins</h3><p>Изолированные процессы для прикладной и инфраструктурной логики.</p></a>
</div>

## Какую проблему решаем

Команда получает безопасный control plane и HTTP/HTTPS Server plugin для сайтов
и API. Studio хранит source project и Git history, CLI материализует exact
commit в bundle, а Core хранит применённое состояние в SQLite. Пользовательский
HTTP traffic обслуживает отдельно запущенный Server plugin на базе Caddy.
Публичный L4 relay отложен до v3.

## Для кого

| Роль | Задача | Главная точка входа |
| --- | --- | --- |
| Оператор | настроить, проверить, применить и наблюдать Core | [Core](/core/) |
| Разработчик-оператор | собрать project, связать services и передать revision в CLI | [Studio](/studio/) + [CLI](/cli/) |
| Интегратор | подключить capability-процесс | [Плагины](/plugins/) |
| Реализатор | понять границы продуктов и API | [Архитектура](/architecture/) |

## Продуктовые границы

**Core v2** владеет applied desired state, Management API, конфигурационным
lifecycle, аудитом и reconciliation. Core не содержит CLI, Git или deployment
provider; это ответственность standalone CLI. **Server plugin**
владеет публичными HTTP/HTTPS listener-ами, TLS и исполнением HTTP traffic.
Остальные plugins владеют подключаемой capability-логикой, своими данными и
настройками.

**В v2:** standalone/remote/multi-Core targets, API-driven rollout, GitHub CI и
remote approval. **Отложено до v3:** масштабирование Server,
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
