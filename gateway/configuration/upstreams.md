# Upstream и балансировка

Gateway не вводит YAML-модель upstream-ов. HTTP reverse proxy и TCP/UDP
upstreams задаются native Caddyfile и доступными в выбранном custom Caddy build
modules. Конкретную семантику proxy/load balancing определяет используемый
Caddyfile module; Liapoldus отвечает за сборку, проверку и атомарную активацию
group snapshot.

Для ограничений двух вариантов Caddy и parity gate см.
[архитектуру control plane](/gateway/architecture/control-plane)
и [матрицу приёмки](acceptance).
