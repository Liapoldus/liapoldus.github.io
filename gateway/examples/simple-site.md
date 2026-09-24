# Caddyfile group: HTTP и reverse proxy

Traffic configuration находится в application group Caddyfile, не в
gateway.yaml. Нативные Caddyfile directives сохраняют семантику Caddy; group
release добавляет fragment к остальным active groups и проверяет полный
snapshot до activation.

Пример native Caddyfile reverse proxy:

    api.example.test {
        reverse_proxy api.internal:8080
    }

Frontend root публикуется в том же release как frontends/portal/... и
связывается с Caddy runtime immutable-root adapter. Физический artifact path
не зашивается в управляемый Caddyfile и не выдаётся клиентам.

Загрузка выполняется через POST /api/groups/{id}/releases с metadata,
Caddyfile и необязательным одним .tar.gz. После успешной активации новая
revision становится current, старая — previous. Ошибка adapt/load/activation
не меняет active revision. Поля запроса и лимиты определяются в
[Group Releases API](/gateway/api/groups).
