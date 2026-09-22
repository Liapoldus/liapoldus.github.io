# Существующие plugins

| Plugin | Назначение |
| --- | --- |
| [tls-issuer](/plugins/tls-issuer) | ACME и TLS/mTLS material через scoped control-plane capability |
| [forms-db](/plugins/forms-db) | сохранение и управление отправками форм |
| [captcha](/plugins/captcha) | verification challenge providers |

Identity/OIDC/OAuth — не встроенная возможность Gateway: это будущий
identity-plugin contract. Gateway по-прежнему владеет mTLS transport security.
