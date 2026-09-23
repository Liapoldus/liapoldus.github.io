# Гайд: создание plugin

Этот гайд описывает границы и порядок разработки plugin для Gateway v1. Точный
Go API генерируется из proto, а JSON shape задают versioned contracts в
[`github.com/Liapoldus/pluginprotocol`](https://github.com/Liapoldus/pluginprotocol).
Не копируйте protobuf definitions или capability schemas в репозиторий plugin.

## Обязательная граница

Plugin — отдельный процесс и отдельный Go-модуль. Его server слушает только
`127.0.0.1:<port>` по gRPC/HTTP/2. Gateway владеет публичным socket,
маршрутизацией, TLS, лимитами, grants, rate limits и выдачей HTTP response.
Plugin получает ограниченный context и может вернуть только действие,
разрешённое соответствующим capability contract.

Сохраните прежние declarative JSON contracts и версии их payloads. Переход на
gRPC не превращает каждую capability в отдельный protobuf тип: unary business
вызовы проходят через `Call(capability, JSON payload)`, потоковые — через
двунаправленный `Stream`. Сырые credentials, cookies, Authorization, filesystem
paths, listener sockets и grant handles нельзя писать в logs/events или
включать в error message.

## Создание plugin

1. Импортируйте `github.com/Liapoldus/pluginprotocol`. Protobuf namespace и
   import path остаются v1; по решению проекта breaking transport migration
   также выпускается в v1. Прежний framing server несовместим с новым Gateway,
   поэтому plugin надо пересобрать и обновить синхронно с Gateway.
2. Реализуйте generated gRPC server interface из proto. Control surface состоит
   из `Manifest`, `ConfigSchema`, `ConfigApply`, `Shutdown`; readiness
   обслуживается стандартным `grpc.health.v1`.
3. Зарегистрируйте `Call`-обработчик. Он обязан проверять имя capability,
   валидировать JSON по её опубликованной schema и возвращать только
   задекларированный response или typed error.
4. Реализуйте `Stream` только для capability, объявивших streaming contract.
   Уважайте `context.Context`, cancellation, deadlines, лимит одного сообщения
   и gRPC flow control; не создавайте неограниченные внутренние очереди.
5. Получайте loopback endpoint через `LIAPOLDUS_PLUGIN_ENDPOINT`, объявленный в
   [launch contract](https://github.com/Liapoldus/pluginprotocol/blob/main/contracts/protocol/v1/launch.json),
   и открывайте его `transport.ListenLoopback`. Не открывайте listener на
   `0.0.0.0` или публичном интерфейсе.
6. Передавайте runtime settings через `ConfigApply`; применяйте их атомарно.
   `ConfigSchema` описывает пользовательские settings и не должен содержать
   raw secrets, которые Gateway выдаёт только как краткоживущий scoped grant.
7. При остановке завершите активные RPC/streams и ответьте на `Shutdown`.

Стандартный gRPC reflection зарегистрирован для диагностики loopback-сервера
через `grpcurl`. Reflection доступна только локально и не заменяет manifest,
health check, schema validation или authorization на capability boundary.

## Проверки plugin

Plugin repository проверяет generated API и совместимость с
`pluginprotocol/contracts/`. Обязательны тесты: корректный handshake, неверная
capability/payload, typed error, unary timeout/cancellation, обе стороны
bidirectional stream, backpressure, stream cancellation, закрытие во время
активного RPC и restart процесса. Транспортные wire-hex golden tests заменены
protobuf descriptor conformance и TypeScript JSON-schema examples.

Минимальная локальная проверка Go plugin:

```bash
go vet ./...
go build ./...
npm test --prefix tests
```

Полная transport acceptance и cross-platform checks описаны в
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol) и
[Gateway acceptance contract](/gateway/configuration/acceptance).

## Сохранение product boundaries

- Конкретный plugin владеет своими settings, capability semantics, state,
  tokens, sessions и cookies; Gateway предоставляет общий runtime, scoped
  grants, ограниченный context и применение типизированных response actions.
- Конкретные capability и продуктовые схемы описываются и версионируются
  владельцем plugin, а не включаются в Gateway runtime или общий перечень
  встроенных providers.
- Constructor control plane остаётся REST и не использует plugin gRPC.
