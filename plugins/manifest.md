# Manifest и capabilities

Подробный Manifest, settings schema и invocation-mode contract принадлежат
подключённому plugin и
[pluginprotocol](https://github.com/Liapoldus/pluginprotocol). Manifest
объявляет идентичность/release и capability→modes; Core проверяет объявленную
schema и поддерживаемый mode, но не содержит специальных условий для
конкретных plugins.

Instance metadata и desired settings принадлежат Core. Settings JSON
проверяется по Manifest/ConfigSchema, сохраняется versioned revision в SQLite
и push-ится plugin-у через `ConfigApply` до readiness. Plugin не читает
application environment/config files и не делает pull request за settings.

Routing и capabilities связываются через traffic JSON settings Caddy plugin,
а не native Caddyfile или Gateway route DSL. Caddy plugin строит свою runtime
конфигурацию и напрямую вызывает разрешённые plugin instances.

Wire schema и examples не копируются в эту документацию; каноническая модель
описана в [целевой архитектуре Gateway](../gateway/architecture/target),
[plugin deployment](../gateway/architecture/plugin-deployment) и
[plugin Admin Pages](admin-pages).
