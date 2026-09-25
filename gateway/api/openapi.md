# OpenAPI

Единственный machine-readable целевой Management API contract v1 —
[management.openapi.yaml](/spec/management.openapi.yaml). Он включает
аутентификацию, group release/rollback, Caddy Admin pass-through, drift,
checkpoints, plugin instances, TLS operations, operations, audit и service keys.
Спецификация описывает требуемую поверхность API, а не только уже подключённые
core handlers. Сверяйте реализованное покрытие и незавершённые integration gates
с [матрицей реализации Gateway](/gateway/architecture/implementation#текущее-состояние-core)
и [core TODO](https://github.com/Liapoldus/core/blob/main/TODO.md).

Описания endpoint в других страницах не должны расходиться с OpenAPI. Полный
Caddy Admin API представлен как native pass-through; поскольку native payloads
не принадлежат Liapoldus DTO, spec намеренно не копирует Caddy request/response
schemas.
