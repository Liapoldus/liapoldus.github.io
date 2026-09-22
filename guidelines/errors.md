# Обработка ошибок

Ошибка имеет stable machine code, безопасное detail и actionable context.
Нельзя раскрывать stack trace, secret, cookie, Authorization header или private
material. HTTP API сообщает RFC 9457 problem; Gateway использует свой
[каталог ошибок](/gateway/configuration/errors).

Каждая операция ясно сообщает: где причина, изменилось ли состояние и что
сделать дальше. Validation не изменяет runtime; failed atomic apply сохраняет
предыдущее active состояние.
