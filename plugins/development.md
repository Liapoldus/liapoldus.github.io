# Разработка plugin

Начните с [гайда создания plugin](/gateway/architecture/guide) и единственного
wire-канона `github.com/Liapoldus/pluginprotocol`. Business payload не
добавляется в framing/session primitives: он принадлежит capability contract.

Автор обязан описать manifest, settings schema, typed errors, required grants,
health behavior, bounded execution и tests malformed input/cancellation. Для
Constructor дополнительно описывается Admin UI schema, не отдельный frontend.
