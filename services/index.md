# Сервисы Liapoldus

Runtime-сервис — самостоятельный процесс со своим бинарником, конфигурационной
схемой и данными. Core управляет его desired settings, replica metadata,
readiness и общими peer-link policies. Сервисы не импортируют и не требуют
друг друга: состав системы меняется без продуктовых ветвей в Core.

## Control plane и data plane

```text
Control plane: Studio → typed CLI → Core Management API → Service SDK REST API
Data plane:    Server → Wool → Echo
```

CLI запускает локальную Docker-среду и сообщает Core безопасные registration
metadata. Core самостоятельно получает live manifest/schema/identity/readiness
сервиса по Service SDK REST и применяет configuration generation. CLI и Studio
не вызывают service REST endpoints. Core не проксирует application calls.
Сервисные binaries уже собраны; Studio/CLI не собирают service images или сервисы.

Service SDK предоставляет одинаковые `GET /healthz` и `GET /metrics` всем
сервисам. Эти routes принадлежат SDK, а сервисы используют SDK lifecycle и
получают settings от Core. Все API/validation contracts владеет соответствующий
сервис.

## Прямое взаимодействие

Wool — generic transport для вызовов между независимыми сервисами. У него нет
business methods или Core lifecycle. Core выдаёт peer directory и управляет
общей policy; затем вызов идёт напрямую между сервисами. Например,
Server → Wool → Echo. Server не содержит зависимости, upstream implementation
или адрес Echo. Если Echo остановлен, Server остаётся работоспособным и
показывает недоступность соответствующего peer.

## Статус сервисов

| Сервис | Статус | Остаток |
| --- | --- | --- |
| [Server](/services/server) | Активный | Универсальные SDK health/metrics, API configuration и прямые peer routes проверяются через локальный CLI/Docker smoke и обычный curl. |
| [Echo](/services/echo) | Активный диагностический | Самостоятельная schema/configuration, bounded console output и Wool handler; не знает о Server. |
| [forms-db](/services/forms-db) | Отложен | Повторная проверка Service SDK, storage lifecycle, schema и peer integration. |
| [Domain](/services/domain) | Отложен | Проверить Service SDK composition и закрыть свои Domain acceptance gates. |
| [Runtime](/services/runtime) | Отложен | Проверить Service SDK/Wool boundary и собственные WASM runtime gates. |
| Identity и CAPTCHA | Заморожены | Изменения отложены до отдельного решения; их репозитории остаются в frozen workspace. |

## Контракты и разработка

- [Service SDK](/service-sdk/) — registration, manifest/schema, configuration
  lifecycle и universal observability.
- [Wool](/wool/) — authenticated direct transport между сервисами.
- [Core architecture](/core/architecture/target) — контроль конфигурации и
  peer policy.
- [Server API](/services/server) и [Echo](/services/echo) — product-owned
  contracts. Вызовов между продуктами через Core нет.

Расширения desktop редактора называются **плагинами Studio** и описаны отдельно
в [Studio Plugin](/studio/studio-plugins). Они не являются runtime-сервисами.
