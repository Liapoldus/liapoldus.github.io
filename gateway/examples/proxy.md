# HTTP reverse proxy с native Caddyfile

Gateway не задаёт YAML-модель upstream/WAF/rate limit. Caddyfile использует
нативные Caddy matchers/handlers, а compatible Caddy build поставляет
зафиксированные modules. Group Release API валидирует и активирует fragment
вместе со всеми active groups.

Пример native reverse proxy:

    app.example.test {
        handle /api/* {
            reverse_proxy api.internal:8080
        }
    }

Plugin capability, если она нужна вместо upstream, задаётся отдельным
liapoldus_plugin directive, описанным в
[control-plane contract](/gateway/architecture/control-plane#liapoldus-caddyfile-handlers).
Никаких route YAML, WAF policy objects или upstream groups Gateway не добавляет.

Полное поведение reverse_proxy и доступные Caddy modules фиксируются в build
manifest и проверяются parity suite обоих Caddy variants.
