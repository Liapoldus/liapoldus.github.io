# Git

Git — source of truth исходников. Коммит должен быть маленьким, проверяемым и
не включать secret или generated runtime state. История Git не равна entity
version и не равна Snapshot: Snapshot ссылается на commit и metadata.

Перед коммитом запускаются релевантные tests, linters и build. Не используйте
destructive history rewrite для общей ветки без отдельного согласования.
