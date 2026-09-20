import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import GatewayNav from './components/GatewayNav.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('GatewayNav', GatewayNav)
  }
} satisfies Theme