# Liapoldus: архитектура

Архитектура задаёт состав системы, её внешние контракты и границы
ответственности. Детальные страницы фиксируют поведение продукта и правила,
которым следует реализация.

Liapoldus состоит из:

1. **Gateway** — самостоятельный multi-tenant L7 reverse proxy («микро-nginx»).
   Работает без собственной БД: читает персональные конфиги и готовые
   артефакты сборки с диска (registry-volume) и управляет внешними
   plugin-процессами.
2. **Plugins** — отдельные кроссплатформенные процессы, которые gateway
   запускает и вызывает через plugin protocol. Плагин не знает о системе
   управления gateway.

Gateway — единственная обязательная часть; plugins подключаются по мере
надобности.

## Общая схема

```mermaid
flowchart LR
    subgraph client["Клиент (браузер)"]
        HTTP[HTTP/HTTPS-запрос]
    end

    subgraph gateway["gateway (процесс)"]
        LISTEN[Публичный рантайм<br/>listen + SNI/TLS + h2c]
        MGMT[Management-порт<br/>контроль и наблюдение]
        SNAP[Immutable snapshot<br/>server-блоки из registry]
        SUP[Супервизор плагинов]
    end

    subgraph registry["registry (volume на диске)"]
        SITES[sites/&lt;slug&gt;/ ... версии]
    end

    subgraph plugins["plugin-процессы"]
        P1[forms-db]
        P2[captcha]
        P3[прочие]
    end

    HTTP --> LISTEN
    LISTEN --> SNAP
    SNAP -->|файлы сайтов| SITES
    LISTEN -->|capability call через loopback TCP| SUP
    SUP --> P1
    SUP --> P2
    SUP --> P3
    MGMT --> SNAP
    MGMT --> SUP
```

## Компоненты

| Часть | Назначение | Зависимости |
| --- | --- | --- |
| **gateway** | публичный рантайм, раздача сайтов, плагины | без БД; читает файлы конфигов и registry |
| **plugins** | отдельные binary: формы, капча и т.д. | TCP loopback + protobuf протокол |

## Принципы

| Принцип | Что это даёт |
| --- | --- |
| **Gateway без БД** | конфиги и версии сайтов — файлы на диске (registry); runtime — производная величина от файлов |
| **Один процесс** | data plane и управление в едином process; нет отдельных сервисов |
| **Plugins — отдельные процессы** | gateway запускает инстансы; несколько инстансов одного binary с разными конфигами |
| **TCP, не HTTP/gRPC** | plugin IPC — localhost TCP + protobuf + length-prefixed frames |
| **DDD-слои** | единая структура всех Go-проектов и общая библиотека `pkg` через `go.work` |

## Документы

| Файл | Содержание |
| --- | --- |
| [target.md](target.md) | Системный контекст, архитектурные решения и инварианты. |
| [structure.md](structure.md) | Структура репозиториев, обязательные DDD-слои, правила зависимостей, общая библиотека `pkg`. |
| [gateway.md](gateway.md) | Data plane и control plane gateway, путь запроса, immutable snapshot, управление и метрики. |
| [protocol.md](protocol.md) | Transport: TCP loopback, protobuf, length-prefixed frames, multiplexing, методы, streams, ошибки → 5xx. |
| [contract.md](contract.md) | Контракт протокола для авторов плагинов: методы, фреймы, streams, ошибки. |
| [guide.md](guide.md) | Гайд создания плагина на Go с `pkg/pluginprotocol`. |

Документация по декларации, супервизору и жизненному циклу плагинов —
в разделе «[Плагины](/plugins/)».
