# Логирование

Логи структурированы: timestamp, level, component, request/operation ID и
безопасные fields. Redaction происходит до записи, ring buffer и экспортера.
Audit record отделён от diagnostic log и фиксирует actor/action/resource/result.

Лог не заменяет typed error: клиент получает безопасный problem, оператор
находит корреляционный идентификатор в observability.
