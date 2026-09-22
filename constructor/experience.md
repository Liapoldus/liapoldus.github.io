# Validation, preview и UX

Validation pipeline запускается перед Snapshot/Build и проверяет Component
schemas, React/Gateway routes, assets, localization, infrastructure, theme,
plugin/Gateway configuration и references. Problems panel различает error и
warning и ведёт к сущности: missing Page, missing upstream, absent locale или
missing font.

Preview существует на уровнях Component, Page, Site и Snapshot и переключает
desktop/tablet/mobile. Snapshot Preview использует ровно зафиксированную
revision/model, поэтому решение publish/rollback можно проверить до действия.

Принципы UX: visual first; code as escape hatch; contextual inspector справа;
graph для зависимостей; preview everywhere; progressive complexity; single
model для visual/code. Права определяют доступ: developer создаёт модели,
designer редактирует разрешённый content, admin выполняет infrastructure и
deployment действия; это permissions, а не жёстко заданные роли.
