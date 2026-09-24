# Traffic configuration

Маршруты и серверные блоки не задаются через gateway.yaml. Gateway v1
принимает native Caddyfile fragments в group release и передаёт их совместимому
Caddy runtime на адаптацию/проверку.

Семантика нативного Caddyfile определяется документацией Caddy. Liapoldus
добавляет только необходимые узкие modules для plugin dispatch и immutable
frontend roots; эти модули не образуют отдельную route DSL. Group publication,
plugin binding validation и atomic activation определяет
[Group Releases API](/gateway/api/groups).
