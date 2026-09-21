# Gateway API

Control-plane API для автоматизации Gateway. Он не предназначен для
браузерного трафика и по умолчанию слушает loopback `127.0.0.1:9090`.
Удалённый listener — отдельный TLS+mTLS endpoint, а не public route.

| Задача | Раздел |
| --- | --- |
| Подключить клиента | [Аутентификация](authentication) |
| Читать и применять состояние | [Ресурсы и операции](operations) |
| Смотреть точные request/response | [OpenAPI](openapi) |
| Понять ошибку | [Каталог ошибок](/gateway/configuration/errors) |

Все успешные JSON-ответы содержат `requestId`. Ошибки имеют media type
`application/problem+json` и формат RFC 9457. Долгие операции возвращают
`202` и `operationId`; результат доступен 24 часа.
