# Секреты, переменные и include

`includes` формируют одно дерево конфигурации. Пути вычисляются относительно
файла, который их объявил; glob раскрывается лексикографически. Цикл include,
отсутствующий файл, дублирующийся именованный ресурс и неизвестная ссылка —
ошибка компиляции.

```yaml
includes: [./conf.d/*.yaml]
variables: { environment: production }
secrets:
  databaseUrl: env:FORMS_DATABASE_URL
  acmeDnsToken: file:/run/secrets/acme-dns-token
```

`env:NAME` читает переменную окружения процесса, `file:/path` читает защищённый
файл. Секрет нельзя задать plaintext-значением. Подстановка `${name}` допустима
в строковых полях после раскрытия include; рекурсивные переменные и подстановка
в ключах YAML запрещены.

## Защита значений

- `GET /api/config`, audit log и diagnostics возвращают только ссылку или
  маску `***`.
- Access logs и traces не записывают Authorization, Cookie и значения secrets.
- Ошибка раскрытия называет YAML-путь, но не значение секрета.
- Изменение файла секрета требует validate/reload; gateway не перечитывает
  секрет посреди активного runtime snapshot.
