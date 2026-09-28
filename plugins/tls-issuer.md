# Старый адрес документации `tls-issuer`

Эта страница сохранена только для совместимости со старыми ссылками.
`tls-issuer` исключён из Gateway v1. ACME/CertMagic lifecycle принадлежит
единственному Caddy plugin; конфигурация приходит из Core SQLite через общий
plugin settings API и `ConfigApply`. Специальных Caddy TLS endpoints в Core нет.

См. [целевую архитектуру Gateway](/gateway/architecture/target) и
[HTTP runtime boundary](/gateway/configuration/http-runtime).
