# Версии, publish и rollback

Registry хранит immutable release в `releases/<revision>/`; `current` и
`previous` — symlink. Они не являются публичными URL и не содержат копии
файлов. Полная файловая процедура — [Конфиг сайта](/gateway/configuration/site-config).

```bash
gateway site publish <slug> <source>
gateway versions <slug>
gateway current <slug>
gateway previous <slug>
gateway rollback <slug>
```

| Command | Exit / result |
| --- | --- |
| `site publish` | `0` и active/previous revision; `3` release invalid; `4` publish in progress |
| `versions` | все immutable revision и ссылки current/previous |
| `current`, `previous` | revision ссылки; `5` если ссылка отсутствует |
| `rollback` | атомарно меняет ссылки; `5` если `previous` отсутствует |

```bash
gateway versions blog
# current: release-2026-09-21T10-00-00Z-a1b2c3d4e5f6
# previous: release-2026-09-20T10-00-00Z-f6e5d4c3b2a1

gateway rollback blog
# current: release-2026-09-20T10-00-00Z-f6e5d4c3b2a1
```
