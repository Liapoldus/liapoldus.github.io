# API Guidelines

API проектируется по owner boundary. Constructor API не создаёт параллельный
Gateway API, а Plugin contract не получает административные права Gateway.
Public response typed/versioned; mutation документирует authorization,
validation, optimistic concurrency, idempotency и audit behavior.

Новый endpoint появляется только после определения модели, stable error codes
и expected failure modes. Если capability отсутствует, documentation фиксирует
API gap вместо случайного URL.
