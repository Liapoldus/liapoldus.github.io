# serve

Запускает Gateway control plane, plugin runtime и выбранный Caddy build variant
после bootstrap validation и SQLite migration/recovery.

Целевой startup-порядок: до открытия public traffic listeners Gateway проверяет
Caddy build identity/modules, восстанавливает pending durable operations,
сверяет digests immutable config/artifacts и гидратирует active generation в
in-memory snapshot. Ошибка восстановления не должна открыть traffic listeners.
Временно нездоровый plugin не должен блокировать несвязанные sites: unavailable
получают только его bindings до reconnect, handshake, config apply и health.

**Текущий разрыв реализации:** `serve` сейчас запускает Caddy из текущей
`system` revision до вызова `ActivateCurrent`/`Recover`; реальный crash между
активацией Caddy и фиксацией SQLite ещё не проверен. До закрытия этого пункта
нельзя считать описанную startup-гарантию выполненной; детали — в
[`core/TODO.md`](https://github.com/Liapoldus/core/blob/main/TODO.md).

## Первый запуск без активной system revision

Новая SQLite содержит обязательную `system` group, но её `current` pointer
изначально пуст. В этом состоянии `serve` поднимает только защищённый
Management API и control plane: публичные Caddy listeners не открываются,
`GET /api/status` возвращает `dataPlaneReadiness.state=not-ready` с причиной
`system-release-required`. Это штатный bootstrap state, а не повреждённая БД.
**Целевое поведение:** оператор публикует первую валидную system revision через
Management API; после успешной подготовки Caddy snapshot Gateway открывает
заданные Caddyfile listeners и переводит data plane в `ready`.

**Текущий разрыв реализации:** первая публикация сейчас не работает: при пустом
`system.current` нет активатора Caddy, а release service отклоняет публикацию
без активатора. Для выполнения целевого поведения нужен lazy Caddy activator,
который поднимает data plane только после проверки и успешной активации первой
revision. До этого Gateway остаётся в `system-release-required`.

Если указатель уже задан, но revision, immutable Caddyfile/artifact или digest
отсутствуют либо не совпадают, это не bootstrap state: Gateway не открывает
traffic listeners и сохраняет доступ только к защищённой Management API для
диагностики и восстановления. Нельзя автоматически подменять повреждённую
revision пустым Caddyfile или сбрасывать `current`/`previous`.

Graceful shutdown прекращает принимать новые Management/traffic requests,
завершает bounded in-flight calls, корректно останавливает local-supervised
plugins и закрывает Caddy runtime. External Caddy останавливается как
supervised child. Remote plugins не получают process Shutdown: Gateway
закрывает только свои соединения. Call с неизвестным исходом не replay-ится,
живой Stream закрывается и не мигрирует на другую replica.
