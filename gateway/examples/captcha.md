# Проверка запроса через plugin capability

Gateway не содержит специального CAPTCHA action, provider registry или
verification endpoint. Это пример границы архитектуры, а не встроенная функция
Gateway: WAF может вызвать произвольную capability подключённого plugin, а
сам plugin владеет проверкой, callback-маршрутом и token/cookie lifecycle.

Общее поведение WAF capability и редактирование чувствительных данных описаны
в [разделе безопасности](/gateway/configuration/security). Продуктовая
конфигурация CAPTCHA, если она реализована в отдельном plugin, описывается
только в [документации этого plugin](/plugins/captcha).
