# Echo

Echo — небольшой независимый диагностический сервис. Он реализует собственный
Wool handler и Service SDK configuration. Echo не импортирует и не знает о
Server; он также проходит lifecycle и получает конфигурацию только через Core.

HTTP envelope и метод `echo.handle` — продуктовый контракт Echo. Имя
`echo.handle` нейтрально и не задаёт зависимости от вызывающего сервиса.
В конфигурации сервиса задаются query name, prefix, предел длины, JSON/text
ответ и включение bounded console logging. SDK предоставляет общие
`/healthz` и `/metrics`.

В acceptance Server вызывает Echo напрямую по Wool peer directory. Core выдаёт
конфигурацию и policy, но не проксирует запрос. При остановке Echo Server
остаётся запущен и возвращает понятную ошибку недоступности peer.
