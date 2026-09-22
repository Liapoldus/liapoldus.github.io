# Концепции и модель проекта

## Source of truth

Project — полноценный React repository. Его можно `git clone`, открыть в любой
IDE и продолжить разработку без Constructor. Constructor читает и изменяет
одну модель проекта; visual editor и code editor не создают две версии правды.

| Сущность | Назначение | Где хранится |
| --- | --- | --- |
| Project | React-код, schemas, generated config | Git |
| Site | публикуемая единица Project | Git + operational binding |
| Component/Primitive | UI и её metadata | Git |
| Content/Asset/Theme | конкретные разрешённые значения | Git или configured asset storage |
| Snapshot | deployable ссылка на revision и metadata | Constructor DB + immutable record |
| Build/Deployment | artifact и факт публикации | Constructor DB |

Database не хранит копию исходников. В web deployment это PostgreSQL; в local
mode — SQLite. Оба варианта используют тот же backend/core contract.

## Два режима

**Development** доступен при соответствующих permissions и содержит код,
диагностику, Git и engineering views. **Site Management** не показывает source
editor: designer/content manager работает с pages, content, assets, theme,
localization, preview и publish.

## Роли

Единственная системная роль — `admin`: она всегда существует, имеет все
permissions и не может потерять критические права. Остальные роли произвольны
и permission-based; Developer/Designer/Moderator допустимы только как presets.
