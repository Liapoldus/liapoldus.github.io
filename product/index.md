# Liapoldus: экосистема

Liapoldus v2 объединяет Core runtime, отдельные сервисы, Studio и универсальный
CLI для управления commit-backed конфигурациями и публикации сайтов.

В экосистеме также создаются Liapoldus Studio и универсальный Liapoldus CLI.
Studio — отдельный desktop-first клиент для проектов, файлов и Git; CLI —
единый инструмент сборки и доставки commit-backed конфигураций в один или
несколько Core. Studio не обращается к Core напрямую.

<img src="/diagrams/ecosystem.svg" alt="Core управляет сервисами; Server обслуживает опубликованный сайт" />

<div class="cards">
  <a class="card" href="/core/"><h3>Core</h3><p>Control API, SQLite desired state и конфигурация services.</p></a>
  <a class="card" href="/studio/"><h3>Studio</h3><p>Проект, дерево файлов, Git, canvas и подготовка конфигураций.</p></a>
  <a class="card" href="/cli/"><h3>CLI</h3><p>Единый CLI для materialization, plan/apply и деплоя в один или несколько Core.</p></a>
  <a class="card" href="/services/"><h3>Сервисы</h3><p>Независимые процессы прикладной и инфраструктурной логики.</p></a>
</div>

## Какую проблему решаем

Команда получает безопасный control plane и Server для HTTP/HTTPS сайтов
и API. Studio хранит source project и Git history, CLI материализует exact
commit в bundle, а Core хранит применённое состояние в SQLite. Пользовательский
HTTP traffic обслуживает отдельно запущенный сервис Server на базе Caddy.
Публичный L4 relay отложен до v3.

## Для кого

| Роль | Задача | Главная точка входа |
| --- | --- | --- |
| Оператор | настроить, проверить, применить и наблюдать Core | [Core](/core/) |
| Разработчик-оператор | собрать project, связать services и передать revision в CLI | [Studio](/studio/) + [CLI](/cli/) |
| Интегратор | подключить capability-процесс | [Сервисы](/services/) |
| Реализатор | понять границы продуктов и API | [Архитектура](/architecture/) |

## Продуктовые границы

**Core v2** владеет applied desired state, Management API, конфигурационным
lifecycle, аудитом и reconciliation. Core не содержит CLI, Git или deployment
provider; это ответственность standalone CLI. **Server service**
владеет публичными HTTP/HTTPS listener-ами, TLS и исполнением HTTP traffic.
Остальные services владеют подключаемой capability-логикой, своими данными и
настройками.

**В v2:** standalone/remote/multi-Core targets, API-driven rollout, GitHub CI и
remote approval. **Отложено до v3:** масштабирование Server,
Caddy-L4/public TCP/UDP relay, CAPTCHA, Identity/OIDC/OAuth,
FFI/Python и монолитная композиция. Studio развивается отдельно. Внутренний
Wool transport остаётся generic механизмом прямого взаимодействия сервисов
и не открывает публичный L4 data plane.

## Принципы продукта

- **Явные долговременные источники.** Core хранит control-plane metadata и
  версии в SQLite, а большие и неизменяемые артефакты — в файлах. Активный
  runtime собирается в памяти.
- **Безопасное действие важнее удобной команды.** Валидация происходит до
  публикации; опасные действия показывают цель, последствия и путь отката.
- **Расширение без проникновения в ядро.** Предметная логика живёт в сервисах;
  Core использует общий Service SDK REST lifecycle.

Дальше: [архитектура экосистемы](/architecture/) или [правила кода](/guidelines/).
