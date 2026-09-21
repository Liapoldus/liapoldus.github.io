import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import GatewayNav from './components/GatewayNav.vue'
import Breadcrumbs from './components/Breadcrumbs.vue'
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'
import OpenApiReference from './components/OpenApiReference.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'doc-before': () => h(Breadcrumbs)
    }),
  enhanceApp({ app }) {
    app.component('GatewayNav', GatewayNav)
    app.component('OpenApiReference', OpenApiReference)
    enhanceAppWithTabs(app)
  }
} satisfies Theme
