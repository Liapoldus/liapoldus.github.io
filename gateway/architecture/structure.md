# Кодовая архитектура

Целевая кодовая архитектура должна отражать фактические product boundaries:
Gateway composition root, flat application use cases, domain-only models/ports,
infrastructure adapters и presentation API/CLI. Caddy, SQLite и protocol SDK
остаются infrastructure details и не проникают в domain/API DTO.

## Основные adapters

- bootstrap loader и schema validation;
- SQLite migrations/repositories для group metadata, plugin instances, access,
  operations, idempotency, audit и checkpoints;
- immutable artifact store для Caddyfile fragments, frontend roots и
  checkpoint snapshots;
- Caddy build adapter для embedded и compatible external variants;
- Caddy data-plane modules для direct `Call`/`Stream` dispatch и immutable static roots;
- Admin API pass-through/checkpoint/reconcile adapter;
- generic plugin client/supervisor/remote mTLS/grant broker;
- Management REST API и CLI.

Domain не зависит от Caddy packages, SQLite driver, filesystem, TLS SDK или
plugin protocol generated types. Application use cases координируют typed
ports; Infrastructure реализует их; API и CLI являются входными adapters.
Caddy handler — отдельный infrastructure data-plane adapter: он получает
immutable prepared dispatch view и обращается к plugin protocol client
напрямую. Он не импортирует Management API/application handlers и не читает
SQLite на пользовательском request path. Gateway control manager подготавливает
и atomically меняет этот view; external Caddy получает тот же generation через
private authenticated Admin API/IPC.

## Обязательная структура четырёх слоёв

В `core` разрешены ровно четыре слоя; новые слои и альтернативные корни пакетов
не вводятся.

| Слой | Разрешённое содержимое | Запрещённое содержимое |
| --- | --- | --- |
| `internal/domain` | Только `models/` и `interfaces/`. `models/` содержит модели и связанные typed errors; `interfaces/` — порты. Каждая модель, typed error и интерфейс объявляются в отдельном файле. Допустимы валидирующие конструкторы и валидация модели. | Use cases, реализации, I/O, зависимости от инфраструктуры, отдельные `types`, `errors`, `services` или другие каталоги. |
| `internal/application` | Плоский набор use cases и их orchestration-кода. | Глубокие деревья каталогов, транспортные DTO, SQL/Caddy/gRPC детали, `reflect`-диспетчеризация. |
| `internal/infrastructure` | Реализации портов, сгруппированные по техническим адаптерам в тематические подкаталоги. | Предметные правила конкретных плагинов и публичные API-типы. |
| `internal/presentation` | Только входные адаптеры `api/` и `cli/`. | Хранилища, бизнес-логика, Caddy handlers и дополнительные presentation-подслои. |

Composition root и запуск процесса находятся в `cmd/gateway`; тесты хранятся
отдельно в `tests/`, а не рядом с production-пакетами. Статические контракты,
схемы и прочие данные размещаются во внешних contract assets; в `assets/` не
допускается Go-код.

### Направление зависимостей

`domain` зависит только от стандартной библиотеки и собственных моделей;
`application` — от typed domain interfaces/models; `infrastructure` реализует
порты; `presentation` переводит входные запросы в вызовы application. Только
composition root связывает реализации и входные adapters. Domain-модели и API
DTO не должны импортировать Caddy, SQLite, gRPC или filesystem packages.

### Конфигурация вместо хардкода

Не зашивать в production-код изменяемые продуктовые значения: контрактные
строки и ключи, имена capabilities, сообщения ошибок, пути, defaults, имена
переменных окружения, флаги CLI, лимиты и значения конфигурации. Для них
используются версионированные contract assets/configuration sources; код
содержит только необходимую логику загрузки, типизации и валидации. Исключения
должны быть явно перечислены в локальном `core/AGENTS.md` и проверяться
architecture/AST gate. Эта норма не запрещает структурные Go identifiers и
алгоритмические константы, которые не являются внешним контрактом или
настраиваемым поведением.

## Persistence invariants

SQLite foreign keys, migrations, write transaction boundaries и crash recovery
покрываются standalone TypeScript tests по black-box API/CLI. Artifact write
происходит до metadata commit, а pointer transaction — только после готового
snapshot. Orphaned artifacts допустимы для последующего GC; dangling metadata
references недопустимы.

Подробная карта сущностей: [ER-модель](control-plane#er-модель). Импортные
границы и слои дополнительно закрепляются architecture lint в core.
