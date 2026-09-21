# Конфиг сайта в registry

`site.yaml` — единственный контракт поведения опубликованного сайта. Он лежит
в `sites/<slug>/site.yaml`, а неизменяемые артефакты — в
`sites/<slug>/releases/<revision>/`. В `site.yaml` запрещены домены, listener,
upstream и credentials: публичное назначение делает route в `gateway.yaml`.

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

| Путь | Тип | Required / default | Ограничение и семантика |
| --- | --- | --- | --- |
| `slug` | string | required | `[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?`; совпадает с именем site resource и каталога |
| `index` | relative path | `index.html` | файл внутри release; `/`, `..` и абсолютный путь запрещены |
| `spa` | boolean | `false` | при `true` только HTML navigation miss возвращает `index` по правилам [HTTP runtime](http-runtime) |
| `locales` | string[] | `[]` | уникальные BCP 47 language tags |
| `defaultLocale` | string | absent | обязательно один из `locales`, если `locales` задан |
| `redirects[]` | object | `[]` | `from` — exact path, `to` — absolute path, `status` — `301`, `302`, `307` или `308` |
| `headers.response` | header actions | absent | response transforms сайта; route может только дополнить их |
| `cache.static` | cache policy | absent | `visibility: public|private|no-store`, `maxAge: duration` |

Неизвестный ключ, некорректный тип, несуществующий `index` или путь за
пределами release дают `site_invalid` с YAML path; release не публикуется.

## Публикация и rollback

`gateway site publish <slug> <source>` и `POST /api/sites/{slug}/publish`
создают `releases/<revision>` из полного подготовленного каталога. Revision
формата `release-YYYY-MM-DDTHH-mm-ssZ-<12-hex>` генерирует Gateway. Операции
одного `slug` сериализуются lock-файлом `.publish.lock`.

1. Gateway копирует source во временный каталог в том же filesystem.
2. Валидирует `site.yaml`, путь `index` и все release-файлы.
3. Переименовывает каталог в `releases/<revision>`, атомарно заменяет
   `previous` на прежний `current`, затем `current` на новый release.
4. После успешного switch удаляет release, на который указывал прежний
   `previous`: Gateway хранит ровно `current` и `previous`.
5. Пишет audit record с prune и возвращает active/previous revision.

При любой ошибке до последнего шага `current` и `previous` не меняются.
`gateway rollback <slug>` и `POST /api/sites/{slug}/rollback` атомарно меняют
ссылки местами; удаление release не входит в эти операции.

`.publish.lock` — JSON `{pid,startedAt,nonce}`. Его lease равен 15 min.
Gateway снимает lock только если указанный PID отсутствует или lease истёк, и
пишет `publish_lock_recovered` в audit; действующий lock даёт `409
publish_in_progress`. Ручное удаление lock не является штатной операцией.

Главный route может дополнить policy, но не меняет файлы release.
