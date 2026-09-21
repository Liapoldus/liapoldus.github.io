# Gateway

::: info Справочник Gateway
Здесь описаны команды, ключи YAML, API и ожидаемое поведение Gateway. Примеры
можно использовать как основу для настройки и демонстрации системы.
:::

**Liapoldus Gateway** — полнофункциональный multi-tenant web server и reverse
proxy. Он обслуживает HTTP(S), TCP и UDP, раздаёт опубликованные сайты из
registry, применяет политики безопасности, балансирует upstream и вызывает
явно назначенные **плагины** как отдельные процессы.

Gateway работает без собственной базы данных: конфиги и сайты — файлы на
диске, управление — CLI и management HTTP API.

## С чего начать

Выберите путь по задаче:

| Нужно | Начните здесь |
| --- | --- |
| Опубликовать первый статический сайт | [Быстрый старт конфигурации](/gateway/configuration/) |
| Настроить домен, TLS или proxy | [Практические примеры](/gateway/examples/) |
| Автоматизировать Gateway | [Gateway API](/gateway/api/) |
| Развернуть и эксплуатировать runtime | [Запуск](/gateway/deploy/) |
| Понять контракт и ограничения системы | [Архитектура](/gateway/architecture/) |

## Разделы документации

<div class="cards">
  <a class="card" href="/gateway/examples/">
    <h3>Практические примеры</h3>
    <p>Полные сценарии настройки: статика, reverse proxy, TLS, формы, капча.</p>
  </a>
  <a class="card" href="/gateway/configuration/">
    <h3>Configuration</h3>
    <p>gateway.yaml, server-блоки, TLS/SNI, reload, management API, безопасность.</p>
  </a>
  <a class="card" href="/gateway/cli/">
    <h3>CLI</h3>
    <p>Подкоманды: версии сайтов, откат, диагностика диска.</p>
  </a>
  <a class="card" href="/gateway/deploy/">
    <h3>Deploy</h3>
    <p>Локальная разработка, Docker Compose, переменные окружения.</p>
  </a>
  <a class="card" href="/gateway/architecture/">
    <h3>Архитектура</h3>
    <p>Структура проектов, data/control plane gateway, plugin protocol.</p>
  </a>
</div>
