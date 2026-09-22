# Существующие plugins

| Plugin | Назначение |
| --- | --- |
| [tls-issuer](/plugins/tls-issuer) | ACME и TLS/mTLS material через scoped control-plane capability |
| [forms-db](/plugins/forms-db) | сохранение и управление отправками форм |
| [captcha](/plugins/captcha) | verification challenge providers |

[Identity plugin](/plugins/identity) описан как versioned capability contract;
его executable не поставляется в этом repository. Gateway по-прежнему владеет
mTLS transport security.
