# Manifest и capabilities

Manifest объявляет identity, version, capabilities и config schema. Capability
— минимальная операция, которую Gateway разрешает instance, например
`forms.submit` или `identity.client.authenticate`; это не произвольная RPC
поверх public request.

Конфигурация instance находится в `gateway.yaml` в `plugins.<name>.settings`.
Gateway валидирует settings schema до запуска. Полная декларация, grants и
ограниченный request context — на [странице plugins](/plugins/).
