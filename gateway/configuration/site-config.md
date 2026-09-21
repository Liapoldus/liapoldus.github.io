# Static sources и `site.yaml`

`sites.<name>` выбирает источник файлов. У каждого source в root лежит
`site.yaml`; Gateway читает его как manifest и никогда не отдаёт клиенту.

| Source | Поля | Для чего |
| --- | --- | --- |
| `release` | `type: release`, `slug` | production publish, immutable versions, rollback |
| `directory` | `type: directory`, `root` | local development и legacy filesystem hosting |

```yaml
sites:
  blog:
    source: { type: release, slug: blog }
  preview:
    source: { type: directory, root: /srv/preview }
```

## `site.yaml`

| Поле | Назначение |
| --- | --- |
| `slug` | identity release source; обязателен для release |
| `index`, `spa` | directory resolution и HTML fallback |
| `locales`, `defaultLocale` | явные locale prefixes без `Accept-Language` redirect |
| `redirects` | static redirects до file resolution |
| `headers`, `cache.static` | response headers и Cache-Control |

Полные типы и defaults: <a href="/spec/site.schema.json" target="_blank" rel="noopener">site.schema.json</a>.

## Поведение source

`release` читает только target `current` в
`sites/<slug>/releases/<revision>/`. Publish валидирует полный source, создаёт
immutable revision, атомарно переключает `previous` и `current`, затем хранит
ровно две версии. Failed publish не меняет pointers.

`directory` читает regular files внутри `root`; directory listing, traversal,
special files и symlink за root запрещены. Gateway не следит за filesystem:
изменение root или manifest требует `config validate` и `reload`. Контент файла
читается на следующем запросе. Publish, versions и rollback отвечают
`site_source_immutable`.
