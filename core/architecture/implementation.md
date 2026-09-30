# Статус реализации Core v1

Это краткий статус целевой архитектуры, не журнал команд или прошлых запусков.
Предыдущие проверки засчитываются только если доказывают текущее поведение REST
lifecycle и новых config generations. Актуальные критерии и формат evidence описаны в
[матрице acceptance](../configuration/acceptance); по репозиториям — в их
`TODO.md`.

## Зафиксировано

- Core должен быть singleton plugin-agnostic control plane; Caddy data plane
  принадлежит независимому plugin.
- Core↔plugin lifecycle переходит на отдельный REST Plugin SDK; Core не зависит
  от `pluginprotocol`.
- `pluginprotocol` ограничен generic plugin↔plugin transport/communication.
- Plugin settings представлены прямым plugin-owned JSON object, хранятся в
  Core как точный raw JSON BLOB, а не как нормализованная Go-модель.
- На instance остаются только durable поколения `active` и `previous`; candidate
  не сохраняется третьим slot. При частичном rollout выполняется roll-forward
  с ACK для каждой replica.
- Constructor и `react-lib` заморожены.

## Состояние миграции

**Core v1 не готов.** Целевая документация и правила владельцев обновляются;
Plugin SDK имеет локальный четырёхслойный Go-module scaffold. Его REST owner
contract, рабочие server/client adapters и plugin consumers ещё нужно
реализовать. В Core и plugins остаются прежние lifecycle/storage участки, пока
не перенесён соответствующий consumer и не добавлен replacement conformance.

Следующий критический путь:

1. SDK REST contract и первый реальный end-to-end Reload → exact config pull →
   in-memory apply → digest ACK.
2. Core migration к одной `plugin_config_generations` таблице, прямому raw-body
   `PUT`, точному byte round-trip и atomic `active`/`previous` transitions.
3. Core per-replica REST mTLS, roll-forward/fencing, rollback и crash recovery.
4. Переход plugins на SDK, затем удаление устаревшего lifecycle и непотребляемых
   compatibility code/contracts.
5. Product conformance только для вручную запущенных активных v1 plugins:
   Caddy и forms-db. CAPTCHA и Identity
   целиком заморожены, не входят в active workspace и v1; их миграцию и
   проверки не выполнять до явной разморозки.
6. Полный platform, security, backup/restore и deployment acceptance из
   [матрицы](../configuration/acceptance).

В рабочей копии документации есть незакоммиченные изменения, включая удаление
устаревших diagram sources/generated SVG. Их происхождение и соседние изменения
надо сохранять; VitePress generator не запускать поверх этих файлов без
проверки фактической области генерации. Статус remotes, веток и незакоммиченных
файлов повторно сверяется перед публикацией.
