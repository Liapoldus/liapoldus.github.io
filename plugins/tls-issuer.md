# Plugin управления TLS-сертификатами

> **Статус:** runnable skeleton. Реальное ACME, DNS-01/HTTP-01, выдача и
> сохранение certificate material, renewal/revoke orchestration и интеграция с
> Gateway listener пока не реализованы.

Этот plugin описывает возможную интеграцию поставщика TLS-сертификатов. Он не
является частью Gateway core и не добавляет Gateway-корневой ресурс
`tlsIssuers`. Конфигурация ACME directory, account, DNS provider, egress allowlist,
renewal policy и секретов относится к versioned settings schema самого plugin.

## Граница ответственности

Gateway остаётся владельцем TLS listener-а, handshake, SNI certificate
selection, mTLS verification и активного TLS profile. Подключённый plugin
может заявить capability-ы управления certificate lifecycle через manifest.
Gateway не содержит специальных capability names, ACME state machine, DNS
provider-ов или plugin-specific settings. До появления versioned integration
contract TLS profiles используют явно заданные `cert` и `key`.

Если plugin получает grant, он должен быть ограничен конкретным вызовом,
capability, purpose и domain scope. Raw secret не помещается в settings или
capability JSON; filesystem path, private key и socket Gateway plugin-у не
передаются. Gateway должен валидировать полученный material и атомарно менять
активный TLS snapshot только после полной проверки.

## Требования к будущему контракту

До включения интеграции в Gateway v1 отдельный plugin contract должен определить:

- versioned issue/renew/revoke request и typed result без раскрытия private key
  через обычные IPC metadata;
- exact/wildcard SAN authorization и связь доменов с scoped grants;
- владение ACME account state, challenge lifecycle и DNS credentials;
- временные HTTP-01 routes либо другой challenge mechanism без передачи socket
  и прав на изменение публичной routing table;
- атомарную запись certificate material, rollback и reload TLS snapshot;
- renewal deadline/retry policy, операции Management API и audit/telemetry без
  секретов;
- failure behavior, когда сертификат ещё валиден, истёк или новый material
  некорректен;
- тесты Linux/macOS с deterministic ACME test server, без реальных внешних
  заказов и secrets.

Эти пункты — план, не описание уже работающего Gateway API. Общая граница
plugin runtime и grants описана в [Plugin protocol](/gateway/architecture/protocol),
а текущая TLS/mTLS-поверхность — в [конфигурации безопасности](/gateway/configuration/security).
