# Разработка plugin

Начните с [гайда создания plugin](/gateway/architecture/guide) и
[архитектуры protocol](/gateway/architecture/protocol). Единственный источник
protobuf и capability payload contracts — репозиторий
[`github.com/Liapoldus/pluginprotocol`](https://github.com/Liapoldus/pluginprotocol).
Не копируйте его `.proto` и JSON Schemas в Gateway docs или plugin repository.

Транспорт Gateway v1 — gRPC/HTTP/2 поверх TCP-loopback. Он заменяет
length-prefixed framing из pluginprotocol v1.0.0; старый transport
несовместим, хотя migration по решению проекта остаётся внутри protocol v1.
Business payload и административные контракты остаются версионированным JSON.
Автор plugin обязан задекларировать manifest, settings schema, capabilities,
typed errors, grants и bounded execution; для Constructor дополнительно
описывается Admin UI schema, а не отдельный frontend.
