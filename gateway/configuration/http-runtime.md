# HTTP runtime boundary

HTTP/HTTPS, HTTP/2/3, TLS, reverse proxy, static serving, WebSocket, SSE и L4
исполняет отдельный Caddy plugin с Caddy-L4. Core не встраивает Caddy и не
обслуживает пользовательский traffic.

Единственный source of truth настроек — versioned JSON Caddy plugin в SQLite
Core. Core schema-validates документ по Manifest/ConfigSchema, но не разбирает
его продуктовые поля, а отправляет полную revision через `ConfigApply`. Caddy
plugin преобразует JSON в свою runtime-конфигурацию и применяет её атомарно.
Файл Caddyfile или внутренний Caddy JSON, если они используются внутри plugin,
являются производными runtime-данными и не редактируются независимо.

Caddy plugin напрямую принимает public traffic и напрямую вызывает разрешённые
plugins по mTLS. Он не обращается к Management API Core за пользовательскими
запросами; Core остаётся control plane для конфигураций, grants, общих policy,
operations и audit. В v1 разрешён ровно один active Caddy instance, а его
ACME/site runtime state сохраняется на собственном persistent filesystem.

Поведение и границы HTTP plugin actions описывает единственный
[pluginprotocol source](https://github.com/Liapoldus/pluginprotocol). Состав
v1-проверок приведён в [acceptance matrix](acceptance), а целевая архитектура —
в [каноническом документе](../architecture/target).
