# Конфиг сайта в registry

Каждый опубликованный сайт содержит `site.yaml` рядом с release-артефактами.
Он описывает сам сайт, но не открывает listener и не назначает публичный домен:
это делает route в главном `gateway.yaml`.

```yaml
# data/registry/sites/blog/site.yaml
slug: blog
index: index.html
spa: true
locales: [ru, en]
defaultLocale: ru
redirects:
  - { from: /start, to: /, status: 308 }
headers:
  response:
    set: { content-language: ru }
cache:
  static: { visibility: public, maxAge: 1h }
```

| Поле | Назначение |
| --- | --- |
| `slug` | идентификатор, совпадающий с именем site resource |
| `index`, `spa` | entry file и fallback для client-side routing |
| `locales`, `defaultLocale` | доступные локали и default |
| `redirects` | редиректы внутри сайта |
| `headers`, `cache` | дефолтные response headers и cache-политика статики |

Главный route может дополнить site policy, но не меняет файлы release. При
публикации Gateway сначала валидирует полный release и `site.yaml`, затем
атомарно переключает `current`; `prev` остаётся доступен для rollback.
