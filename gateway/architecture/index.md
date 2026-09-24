# Архитектура Gateway

Эти страницы описывают целевую архитектуру Gateway v1, а не текущую
реализацию. Нормативная модель настройки: native Caddyfile group revisions +
минимальный bootstrap gateway.yaml + authenticated Management API.

| Документ | Для чего |
| --- | --- |
| [План перепроектирования v1](v1-migration-roadmap) | Этапы, карта replace/adapt/remove и gates. |
| [Control plane](control-plane) | Caddy build variants, группы, Admin API, SQLite и безопасность. |
| [Границы и решения](target) | Зафиксированные продуктовые инварианты. |
| [Компоненты runtime](gateway) | Владельцы компонентов и потоки данных. |
| [Кодовая архитектура](structure) | Слои и persistence adapters. |
| [Plugin protocol](protocol) | Единственный IPC contract. |
| [Режимы plugins](plugin-deployment) | Local supervision и remote mTLS. |
| [Cookie boundary](cookies) | Plugin-owned cookies и типизированные actions. |

Общие цели и зависимости вынесены в per-repository TODO файлы; подробный
порядок работ хранится в roadmap.
