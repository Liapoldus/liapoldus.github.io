# OpenAPI

Единственный machine-readable Management API contract —
[management.openapi.yaml](/spec/management.openapi.yaml). Он включает
аутентификацию, group release/rollback, Caddy Admin pass-through, drift,
checkpoints, plugin instances, TLS operations, operations, audit и service keys.

Описания endpoint в других страницах не должны расходиться с OpenAPI. Полный
Caddy Admin API представлен как native pass-through; поскольку native payloads
не принадлежат Liapoldus DTO, spec намеренно не копирует Caddy request/response
schemas.
