# Плагины

Плагин — независимый процесс с явно объявленными capabilities. Он не создаёт
public listener и не регистрирует route: Gateway принимает трафик, выбирает
YAML-rule и передаёт capability только разрешённый запрос, stream или datagram
flow.

## Декларация instance

```yaml
plugins:
  forms:
    binary: ./bin/forms-db
    config: ./plugins/forms.yaml
    args: []
    env: [DATABASE_URL=env:FORMS_DATABASE_URL]
    capabilities: [forms.submit, forms.list, forms.delete]
    limits: { calls: 100, timeout: 5s, memory: 256MiB }
    restart: { enabled: true, backoff: 1s, maxBackoff: 30s }
```

| Поле | Назначение |
| --- | --- |
| `binary`, `config`, `args`, `env` | запуск отдельного процесса и его изолированный конфиг |
| `capabilities` | единственный список допустимых вызовов |
| `limits` | concurrency, deadline, payload/flow и ресурсные пределы |
| `restart` | политика восстановления после failure |

## Назначение plugin target

```yaml
listeners:
  web:
    type: http
    address: ':443'
    routes:
      - when: { method: [POST], path: { exact: /api/forms } }
        then: { plugin: { instance: forms, capability: forms.submit } }
  relay:
    type: tcp
    address: ':8443'
    rules:
      - when: {}
        then: { plugin: { instance: peer-relay, capability: peer.session } }
```

Gateway проверяет существование instance и capability при compile. HTTP
capability получает request context и тело в заданных лимитах; TCP capability
получает двунаправленную session; UDP capability — datagram flow. Плагин не
получает секреты, заголовки или client identity, если правило не разрешает их
в `plugin.context`.

## Жизненный цикл и наблюдаемость

Supervisor запускает процесс на loopback IPC, проверяет health, применяет
конфиг, ограничивает вызовы и выполняет graceful shutdown/restart. Ошибки
преобразуются в response только ядром: plugin не определяет HTTP status или
маршрутизацию. `GET /api/plugins` показывает состояние, health, limits и
capabilities; logs проходят redaction и доступны через endpoint instance.

## Control-plane plugins

Некоторые capabilities обслуживают инфраструктуру Gateway, а не публичный
route. Они всё равно объявлены в YAML и не получают произвольных прав. Например,
`tls-issuer` вызывается именованным `tlsIssuer`; Gateway передаёт ему ACME
задание и scoped storage/secret grants, но сам записывает ключи и сертификаты,
публикует TLS snapshot и ведёт audit.

## Существующие плагины

<div class="cards">
  <a class="card" href="/plugins/tls-issuer"><h3>tls-issuer</h3><p>ACME HTTP-01/DNS-01 и безопасное обновление TLS/mTLS материалов.</p></a>
  <a class="card" href="/plugins/forms-db"><h3>forms-db</h3><p>Сохранение и управление отправками форм.</p></a>
  <a class="card" href="/plugins/captcha"><h3>captcha</h3><p>Проверка challenge провайдеров.</p></a>
</div>

Для wire-деталей см. [Plugin protocol](/gateway/architecture/protocol), для
авторов процессов — [гайд](/gateway/architecture/guide).
