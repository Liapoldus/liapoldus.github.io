# Конфиг сайта в registry

`site.yaml` — единственный контракт поведения опубликованного сайта. Source
обязан содержать его в корне; во время publish Gateway валидирует и копирует
его внутрь `sites/<slug>/releases/<revision>/site.yaml`. Active site config
читается исключительно из target `current`, а не из изменяемого каталога
`sites/<slug>/`. В `site.yaml` запрещены домены, listener,
upstream и credentials: публичное назначение делает route в `gateway.yaml`.

Каноническая исполнимая схема — <a href="/spec/site.schema.json" target="_blank" rel="noopener">site.schema.json</a>.
Неизвестный ключ, неверный тип, несуществующий `index`, `defaultLocale` вне
`locales`, или путь за пределами release дают `site_invalid` с YAML path;
release не публикуется. Максимум release: 10 000 regular files, 1 GiB суммарно,
никаких device/FIFO/socket и никаких symlink; нарушение даёт `release_invalid`.

`locales` задаёт только допустимые URL-prefix. `/ru/a` ищется как `/ru/a` в
release; путь без prefix ищется в `<defaultLocale>/…`, без redirect.
`Accept-Language` полностью игнорируется.

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
