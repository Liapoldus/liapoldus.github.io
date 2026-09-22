# Liapoldus Constructor

Constructor — Git-native React development environment, visual site management
system и визуальный control plane для Liapoldus Gateway и его plugin ecosystem.
Это одно web-приложение с двумя режимами: **Development** для разработки и
**Site Management** для работы с опубликованной разработчиком моделью.

<img src="/diagrams/constructor-flow.svg" alt="От Git через Constructor и Snapshot к Build, статическому frontend и Gateway" />

## Что Constructor делает

- создаёт и редактирует обычный React-проект: components, pages, scripts,
  state, routes, theme, localization и assets;
- предоставляет визуальные редакторы там, где модель однозначна, сохраняя
  TypeScript/TSX как escape hatch;
- собирает согласованный Snapshot, Build и Deployment;
- показывает и управляет функциональностью Gateway, доступной по его API;
- строит plugin UI из versioned Admin UI contract.

Он не является Webflow/Figma clone, unrestricted HTML/CSS builder, proprietary
CMS или новым runtime framework вместо React.

<div class="cards">
  <a class="card" href="/constructor/concepts"><h3>Модель проекта</h3><p>Git, Site, Component, Content и Snapshot.</p></a>
  <a class="card" href="/constructor/development"><h3>Development Mode</h3><p>Специализированная IDE и визуальные инструменты.</p></a>
  <a class="card" href="/constructor/site-management"><h3>Site Management</h3><p>Безопасное редактирование в пределах Component Schema.</p></a>
  <a class="card" href="/constructor/integrations"><h3>Gateway и plugins</h3><p>Control plane без дублирования runtime.</p></a>
</div>
