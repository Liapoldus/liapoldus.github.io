# Гайд: создание плагина

Пошаговый сценарий создания плагина на Go с общей библиотекой
`pkg/pluginprotocol`. Эталонные примеры — плагины [forms-db](/plugins/forms-db)
и [captcha](/plugins/captcha): каждый — отдельный репозиторий со своей
структурой каталога `<name>/`.

## Минимальный плагин

Плагин обязан:

- принимать `--port <port>` (обязателен) и опционально `--config <path>`;
- слушать `127.0.0.1:<port>` (bind только на loopback);
- через `runtime` (или `Server` + `Handler`) отвечать на методы протокола
  `manifest`, `health`, `config.schema`, `config.apply`, `shutdown`;
- реализовать business-методы объявленных capabilities;
- корректно завершаться по `shutdown` / `SIGTERM`.

### 1. Структура проекта

Плагин — отдельный git-репозиторий и Go-модуль с теми же четырьмя слоями,
что и gateway:

```text
<name>/
  cmd/<name>/main.go        # composition root + flags + server
  internal/config/          # конфиг instance (YAML)
  internal/presentation/    # Handler: business-методы (JSON decode/encode)
  internal/application/     # use cases
  internal/domain/          # модели/порты
  internal/infrastructure/  # БД, HTTP-клиенты и пр.
```

### 2. Composition root

```go
package main

import (
    "context"
    "flag"
    "log"
    "net"
    "os"
    "os/signal"
    "syscall"

    "liapoldus.local/pkg/pluginprotocol"
)

var version = "dev"

func main() {
    port := flag.Int("port", 0, "localhost TCP port for plugin protocol")
    cfgPath := flag.String("config", "", "plugin YAML config")
    flag.Parse()
    logger := log.New(os.Stderr, "<name>: ", log.LstdFlags)
    if *port <= 0 {
        logger.Fatal("--port обязателен")
    }

    // ... загрузка конфига из --config ...

    listener, err := pluginprotocol.ListenLoopback(*port)
    if err != nil {
        logger.Fatalf("listen TCP: %v", err)
    }
    defer listener.Close()

    runtime := pluginprotocol.NewRuntime(
        manifest(),
        schema(),
        yourHandler{},
        pluginprotocol.RuntimeOptions{OnConfig: applyConfig},
    )

    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer cancel()
    server := &pluginprotocol.Server{Handler: runtime}
    if err := server.Serve(ctx, listener); err != nil && ctx.Err() == nil {
        logger.Fatalf("serve protocol: %v", err)
    }
}
```

### 3. Manifest и схема

Manifest — self-description плагина; gateway сверяет его с декларацией в
`gateway.yaml` (name, protocol, capabilities). Никакие capabilities не зашиты
в ядро gateway.

```go
func manifest() pluginprotocol.Manifest {
    return pluginprotocol.Manifest{
        Protocol:     pluginprotocol.ProtocolV2,
        Name:         "<name>",
        Version:      version,
        Capabilities: []string{"<prefix>.<verb>"},
    }
}

func schema() pluginprotocol.ConfigSchema {
    return pluginprotocol.ConfigSchema{
        Version: "v1",
        Fields: []pluginprotocol.ConfigField{
            {Name: "timeout", Type: "duration", Required: true, Default: "5s"},
            {Name: "mode", Type: "string", Options: []pluginprotocol.ConfigOption{{Value: "a"}, {Value: "b"}}},
        },
    }
}
```

Схема отдаётся через `config.schema` по management API (не подключаясь к
плагину напрямую). Runtime-конфиг — содержимое файла `--config`: gateway
передаёт его в `config.apply`, плагин применяет через
`RuntimeOptions.OnConfig`.

### 4. Business Handler

Handler удовлетворяет `pluginprotocol.Handler`: `HandleCall` (unary) и
`OpenStream` (streams).

```go
type yourHandler struct{ svc application.Service }

func (h yourHandler) HandleCall(ctx context.Context, req pluginprotocol.Envelope) (pluginprotocol.Envelope, error) {
    switch req.Capability + ":" + req.Method {
    case "<prefix>.<verb>":
        var in Input
        if err := json.Unmarshal(req.Payload, &in); err != nil {
            return pluginprotocol.Envelope{}, pluginError("bad_request", "неверный payload", false)
        }
        out, err := h.svc.Run(ctx, in)
        if err != nil { return pluginprotocol.Envelope{}, err }
        return pluginprotocol.Envelope{
            Capability: req.Capability,
            Method:     req.Method,
            Payload:    mustJSON(out),
        }, nil
    default:
        return pluginprotocol.Envelope{}, pluginError("not_found", "нет такого метода", false)
    }
}

func (h yourHandler) OpenStream(ctx context.Context, req pluginprotocol.Envelope) (pluginprotocol.StreamHandler, error) {
    // верните реализацию pluginprotocol.StreamHandler (Receive/Close)
}

func pluginError(code, msg string, retryable bool) error {
    return pluginprotocol.Error{Code: code, Message: msg, Retryable: retryable}
}

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }
```

Typed `pluginprotocol.Error{Code, Message, Retryable}` — способ плагина
передать «свою» ошибку; gateway преобразует её в согласованный 5xx.

### 5. Протокольные логи

Через `RuntimeOptions.OnEvent` (или `Server.OnEvent`) можно отправлять
`pluginprotocol.Event` — отдельные от payload EVENT-сообщения протокола:

```go
onEvent: func(ev pluginprotocol.Event) {
    // ev.Level, ev.Message, ev.Fields
}
```

Они не смешиваются с данными business-вызовов и не ломают stream-потоки.

### 6. Локальный запуск и отладка

```bash
cd <name>
go build -o bin/<name> ./cmd/<name>

# ручной запуск (например, с nc/pytest-стыком):
./bin/<name> --port 18099 --config ./conf/dev.yaml
```

В «боевом» режиме gateway сам выбирает порт и передаёт `--port`. Декларация
экземпляра в `gateway.yaml` — общий формат: [«Плагины»](/plugins/).

После старта gateway инстанс доступен через управление:
`GET /api/plugins`, `GET /api/plugins/<name>/logs`, `POST /api/plugins/<name>/restart`.

### 7. Тесты

Для модуля плагина минимум:

```bash
go test ./...
go vet ./...
go build ./...
```

Для протокола обязательно: `-race`, fuzz/negative-тесты malformed frames,
oversized messages, concurrent calls, все направления stream, cancellation,
restart. Примеры проверок — `*_test.go` в `pkg/pluginprotocol`
(`frame_fuzz_test.go`, `session_test.go`, `tcp_test.go`).

## Требования к плагину

- Слушать **только** loopback (`127.0.0.1`).
- Отвечать на `health`/`manifest` до истечения `startTimeout` gateway
  (default 10s).
- Отвечать `{"applied": true}` на `config.apply`.
- Уважать `context` (cancellation/deadline) во всех бизнес-методах.
- Ограничивать размер payload лимитами протокола (см. `pluginprotocol.Limits`).
- Собираться на всех трёх ОС (macOS/Windows/Linux); memory/CPU лимиты —
  platform-specific и не должны ломать сборку.