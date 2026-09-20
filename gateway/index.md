# Gateway

**Liapoldus Gateway** — независимый multi-tenant L7 gateway («микро-nginx»)
для публичных сайтов. Он раздаёт статические версии сайтов из локального
registry-каталога, применяет маршруты и редиректы, обслуживает TLS/HTTP/2 и
вызывает внешние **плагины** (формы, капча и др.) как отдельные процессы.

Gateway работает без собственной базы данных: конфиги и сайты — файлы на
диске, управление — CLI и management HTTP API.

Развёрнутое описание:

- возможности и быстрый старт — в разделе «[Configuration](/gateway/configuration/)»;
- модель gateway и его место в системе — в разделе «[Архитектура](/gateway/architecture/)»;
- готовые сценарии настройки — в разделе «[Практические примеры](/gateway/examples/)»;
- плагины и их настройка — в разделе «[Плагины](/plugins/)».

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