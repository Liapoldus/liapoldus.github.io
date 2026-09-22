# Конфигурация

Configuration отделяется от кода, описывается versioned schema и валидируется
до применения. Secret хранится как reference, не inline value в Git/fixtures.
Gateway config применяет immutable snapshot атомарно; schema error не меняет
обслуживаемый трафик.

Внешние assets/contracts доступны только разрешённым infrastructure или
presentation adapters, не domain model. Конфигурация plugin instance живёт в
`gateway.yaml`, а его `settings` проверяются schema capability.
