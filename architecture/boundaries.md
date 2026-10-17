# Границы и инварианты

- **Git — источник исходников.** Опубликованные сайты собираются из
  версионированных артефактов; Core не становится хранилищем исходных проектов.
- **Core владеет control plane.** Он хранит desired configuration в SQLite,
  публикует Management API и управляет общим lifecycle подключённых services.
- **Server service владеет public data plane.** Он открывает HTTP/HTTPS
  listeners, применяет TLS и исполняет маршруты.
- **service владеет предметной логикой.** Схемы, данные и capabilities принадлежат
  соответствующему service; Core работает с ними через общие контракты.
- **Секреты не попадают в Git, конфигурационные документы, логи или audit.**
  В settings хранятся только внешние references.

## Runtime boundary

Core принимает настройки через Management API, сохраняет точные JSON bytes и
передаёт поколения через Service SDK REST lifecycle. services применяют настройки
в собственной памяти и обслуживают принадлежащую им работу. service-to-service
вызовы используют generic `Wool` и не проходят через Core.

Server-side webhook, cron и handler не могут исполняться в static frontend: их
надо реализовать отдельным upstream либо service capability.
