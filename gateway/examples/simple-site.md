# Простой сайт из registry

Сайт хранит артефакт и site YAML рядом в registry. Главный YAML назначает
сайт HTTP-route; он не дублирует домены, редиректы или файловую структуру.

```text
data/registry/sites/blog/
├── current/index.html
├── prev/
└── site.yaml
```

```yaml
# data/registry/sites/blog/site.yaml
hosts: [blog.example.com]
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
        then: { site: blog, cache: { static: public, maxAge: 1h }, compression: [br, gzip] }
```

Публикация создаёт новый полный release, проверяет site YAML и только затем
атомарно меняет `current`. `prev` остаётся доступен для rollback.
