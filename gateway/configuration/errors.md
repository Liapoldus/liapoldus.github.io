# Каталог ошибок

Все HTTP ошибки используют RFC 9457 `application/problem+json`. `type` всегда
`https://liapoldus.dev/problems/<code>`, а `detail` ниже — нормативный русский
текст. CLI выводит этот `detail` в stderr и указанный exit code. API добавляет
`requestId`; validation errors — ещё `path` и `diagnostics`.

## Configuration и control plane

| Code | HTTP | Detail | CLI | Когда |
| --- | --- | --- | --- | --- |
| `config_invalid` | 422 | `Конфигурация не прошла проверку.` | 3 | неверное поле, тип или ссылка |
| `include_cycle` | 422 | `Обнаружен цикл include.` | 3 | include graph цикличен |
| `secret_unavailable` | 422 | `Не удалось разрешить секрет.` | 3 | env/file secret отсутствует |
| `digest_conflict` | 409 | `Конфигурация была изменена другим оператором.` | 4 | If-Match не совпал |
| `restart_required` | 409 | `Для изменения требуется перезапуск Gateway.` | 4 | bind нельзя заменить без restart |
| `invalid_cursor` | 400 | `Курсор пагинации недействителен.` | 2 | cursor malformed/expired |
| `operation_not_found` | 404 | `Операция не найдена или её срок хранения истёк.` | 5 | operation отсутствует |
| `unauthorized` | 401 | `Ключ service account недействителен.` | 6 | Bearer отсутствует/неверен |
| `forbidden` | 403 | `У этого service account нет необходимого разрешения.` | 6 | роль не допускает действие |

## Runtime, registry и security

| Code | HTTP | Detail | CLI | Когда |
| --- | --- | --- | --- | --- |
| `route_not_found` | 404 | `Для запроса не найден маршрут.` | — | no matching route |
| `site_invalid` | 422 | `Конфигурация сайта недействительна.` | 3 | invalid site YAML/release |
| `release_invalid` | 422 | `Версия сайта не прошла проверку.` | 3 | publish source invalid |
| `publish_in_progress` | 409 | `Публикация этого сайта уже выполняется.` | 4 | active valid lock |
| `no_previous_release` | 404 | `Предыдущая версия сайта отсутствует.` | 5 | rollback without previous |
| `body_too_large` | 413 | `Тело запроса превышает допустимый размер.` | — | body > 10 MiB |
| `rewrite_invalid` | 422 | `Преобразованный путь недействителен.` | — | rewrite result invalid |
| `rate_limited` | 429 | `Превышен лимит запросов.` | — | token bucket empty |
| `challenge_required` | 403 | `Требуется пройти проверку captcha.` | — | WAF challenge |
| `tls_degraded` | 503 | `TLS-профиль находится в деградированном состоянии.` | 7 | no valid certificate |
| `unknown_sni` | 421 | `Для указанного SNI не найден сертификат.` | — | TLS profile cannot select cert |
| `identity_invalid` | 401 | `Не удалось подтвердить identity клиента.` | — | OIDC/JWT/mTLS validation |

## Plugins и protocol

| Code | HTTP | Detail | CLI | Когда |
| --- | --- | --- | --- | --- |
| `plugin_unavailable` | 503 | `Плагин недоступен.` | 7 | startup/health/connection failure |
| `plugin_timeout` | 504 | `Время ожидания ответа плагина истекло.` | 7 | call deadline |
| `protocol_violation` | 502 | `Плагин нарушил контракт протокола.` | 1 | invalid frame/handshake |
| `payload_too_large` | 413 | `Payload плагина превышает допустимый размер.` | 3 | > 10 MiB unary payload |
| `frame_too_large` | 502 | `Кадр протокола превышает допустимый размер.` | 1 | > 1 MiB frame |
| `invalid_stream_method` | 400 | `Этот метод не поддерживает потоковый вызов.` | 2 | control method opened as stream |
| `validation_failed` | 422 | `Данные не прошли проверку.` | 3 | capability business validation |
| `duplicate` | 409 | `Ресурс уже существует.` | 4 | forms business duplicate |
| `not_found` | 404 | `Ресурс не найден.` | 5 | capability resource missing |
| `storage_unavailable` | 503 | `Хранилище временно недоступно.` | 7 | retryable plugin storage error |
| `resource_exhausted` | 503 | `Исчерпан лимит ресурсов.` | 7 | calls/RSS/flow limit |

`code` — единственный стабильный машинный идентификатор. `title` может быть
кратким русским заголовком, но не является ключом обработки.
