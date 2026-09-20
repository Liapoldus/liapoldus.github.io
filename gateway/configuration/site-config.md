# Конфиг сайта (unified schema)

`<registry>/sites/<slug>/config.yaml`:

```yaml
slug: example
hosts: [example.localhost, localhost]
languages: [ru, en]
defaultLang: ru
loginRequired: false
redirects:
  - from: /start
    to: /
    status: 302
routes: []                    # matcher → target (+priority)
```

| Ключ | Назначение | По умолчанию |
| --- | --- | --- |
| `slug` | идентификатор сайта (должен совпадать с каталогом) | — |
| `hosts` | хосты имплицитного server | — |
| `languages` / `defaultLang` | языки сайта и язык по умолчанию | — |
| `loginRequired` | требуется ли вход | `false` |
| `redirects` | редиректы | `[]` |
| `routes` | маршруты | `[]` |

Единый источник для CLI, management API и runtime: `gateway config <slug>`,
`gateway routes <slug>`, `GET /api/sites/{slug}` отдают его напрямую.

## Версии сайта

| Версия | Каталог | Использование |
| --- | --- | --- |
| `current` | `sites/<slug>/current/` | активная, раздаётся |
| `prev` | `sites/<slug>/prev/` | предыдущая, для отката |
| `/__prev/` | публичный (при `server.prev: true`) | сверка перед откатом |