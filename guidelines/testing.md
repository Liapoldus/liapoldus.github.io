# Тестирование

Tests живут отдельно от production-кода. Unit tests проверяют модель и
детерминированные use cases; integration tests — adapters и contracts; e2e
tests используют declarative YAML fixtures. Regression всегда начинается с
red-test.

Проверяются schema rejection, authorization/grants, cancellation/backpressure,
typed errors, atomicity и negative paths. Architecture lint проверяет imports,
структуру domain и отсутствие Go-кода в static assets.
