# CLI диагностика

CLI отображает профиль Core, здоровье SQLite, состояние plugin instances и
durable operations без секретов или raw plugin payloads. В v1 Core не
предоставляет `group`, `caddy`, `drift` или `checkpoint` commands; Caddy-specific
traffic/site operations принадлежат Caddy plugin Admin Surface.

В supervised profile CLI дополнительно управляет локальной installation и
process lifecycle. В external profile эти действия запрещены, потому что
процессы принадлежат Docker/Kubernetes/operator. Точный CLI contract будет
синхронизирован с code-owned flags/defaults в ходе implementation; текущий
roadmap — [здесь](../architecture/v1-migration-roadmap).
