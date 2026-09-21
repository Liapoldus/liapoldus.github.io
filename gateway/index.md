# Gateway

::: info Справочник Gateway
Здесь описаны команды, ключи YAML, API и ожидаемое поведение Gateway. Примеры
можно использовать как основу для настройки и демонстрации системы.
:::

**Liapoldus Gateway** — web server, reverse proxy и transport runtime. Он
обслуживает HTTP(S), TCP и UDP, раздаёт static sources, применяет политики,
балансирует upstream и вызывает явно назначенные plugins. Новый прикладной
протокол реализуется поверх TCP/UDP без изменения ядра.

Gateway работает без собственной базы данных: конфиги и static sources — файлы
на диске, управление — CLI и защищённый Management API.

## С чего начать

Выберите путь по задаче:

| Нужно | Начните здесь |
| --- | --- |
| Описать listeners, static source или policies | [Конфигурация](/gateway/configuration/) |
| Настроить proxy или security | [Практические примеры](/gateway/examples/) |
| Автоматизировать Gateway | [Gateway API](/gateway/api/) |
| Развернуть и наблюдать runtime | [Запуск](/gateway/deploy/) |
| Реализовать совместимый Gateway | [Архитектура](/gateway/architecture/) |

## Разделы документации

<div class="cards">
  <a class="card" href="/gateway/examples/">
    <h3>Практические примеры</h3>
    <p>Полные сценарии настройки: статика, reverse proxy, TLS, формы, капча.</p>
  </a>
  <a class="card" href="/gateway/configuration/">
    <h3>Configuration</h3>
    <p>gateway.yaml, source types, listeners, TLS/SNI, reload и безопасность.</p>
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
