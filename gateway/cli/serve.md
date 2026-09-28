# `gateway serve`

`gateway serve` открывает Core Management listener, восстанавливает единственный
SQLite desired state и подключает plugins выбранного глобального профиля.
Supervised profile запускает локальные процессы; external profile только
подключается к уже запущенным workloads.

Startup считается готовым после восстановления SQLite/journal, загрузки
active in-memory snapshot, Manifest/schema/identity checks и подтверждения
активных `ConfigApply`/`DispatchApply` generations. Caddy — отдельный plugin
process, не часть Gateway бинарника. В v1 его instance ровно один; Core не
создаёт Caddy runtime и не принимает public traffic.

Если config candidate не применился, прежняя revision остаётся active. Если
недоступен один plugin, Core остаётся ready в degraded состоянии, а связанные
с ним capabilities сообщают bounded unavailable. Невосстановимая ошибка
SQLite или generation journal блокирует Management readiness.

Bootstrap fields описаны в [gateway.yaml reference](../configuration/yaml-reference),
а полная lifecycle model — в
[target architecture](../architecture/target) и
[plugin deployment](../architecture/plugin-deployment).
