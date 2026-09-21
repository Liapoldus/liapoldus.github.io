# Простой сайт из registry

Сайт хранит артефакт и site YAML рядом в registry. Главный YAML назначает
сайт HTTP-route; он не дублирует домены, редиректы или файловую структуру.

```text
data/registry/sites/blog/
├── site.yaml
├── releases/release-2026-09-21/index.html
├── current -> releases/release-2026-09-21
└── previous -> releases/release-2026-09-20
```

```yaml
# data/registry/sites/blog/site.yaml
slug: blog
index: index.html
redirects: [{ from: /start, to: /, status: 308 }]
```

```yaml
# gateway.yaml
registry: { path: ./data/registry }
sites: { blog: { path: ./data/registry/sites/blog } }
listeners:
  web:
    type: http
    address: ':80'
    routes:
      - when: { host: blog.example.com }
        then: { site: blog, cache: { visibility: public, maxAge: 1h }, compression: [br, gzip] }
```

Публикация создаёт immutable release, проверяет `site.yaml` и только затем
атомарно меняет symlink `current`; прежняя ссылка становится `previous`.
Точный контракт — [Конфиг сайта](/gateway/configuration/site-config).
