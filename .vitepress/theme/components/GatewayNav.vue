<script lang="ts" setup>
import { ref } from 'vue'
import { useData, withBase } from 'vitepress'

defineProps<{ screenMenu?: boolean }>()

const { page } = useData()

const sections = [
  { text: 'Практические примеры', link: '/gateway/examples/' },
  { text: 'Configuration', link: '/gateway/configuration/' },
  { text: 'CLI', link: '/gateway/cli/' },
  { text: 'Deploy', link: '/gateway/deploy/' },
  { text: 'Архитектура', link: '/gateway/architecture/' }
]

const open = ref(false)

const isGatewayActive = () =>
  page.value.relativePath === 'gateway/index.md' ||
  page.value.relativePath.startsWith('gateway/')

function isSectionActive(link: string): boolean {
  const base = link.replace(/^\//, '').replace(/\/$/, '')
  const rel = page.value.relativePath
  return rel === base || rel.startsWith(base + '/')
}

function onBlur() {
  open.value = false
}
</script>

<template>
  <!-- мобильное меню (заголовок-ссылка + список) -->
  <div v-if="screenMenu" class="GatewayScreen">
    <a
      class="head"
      :class="{ active: isGatewayActive() }"
      :href="withBase('/gateway/')"
    >Обзор Gateway</a>
    <a
      v-for="s in sections"
      :key="s.link"
      class="item"
      :class="{ active: isSectionActive(s.link) }"
      :href="withBase(s.link)"
    >{{ s.text }}</a>
  </div>

  <!-- desktop: ссылка + выпадающий список -->
  <div
    v-else
    class="GatewayNav"
    @mouseenter="open = true"
    @mouseleave="open = false"
    @focusin="open = true"
    @focusout="onBlur"
  >
    <a
      class="link"
      :class="{ active: isGatewayActive() }"
      :href="withBase('/gateway/')"
      :aria-expanded="open"
      aria-haspopup="true"
    >
      Gateway
      <span class="vpi-chevron-down chevron" />
    </a>

    <nav v-if="open" class="menu" aria-label="Разделы Gateway">
      <a
        v-for="s in sections"
        :key="s.link"
        class="menu-item"
        :class="{ active: isSectionActive(s.link) }"
        :href="withBase(s.link)"
      >{{ s.text }}</a>
    </nav>
  </div>
</template>

<style scoped>
/* ===== Desktop flyout ===== */

.GatewayNav {
  position: relative;
  display: flex;
  align-items: center;
}

.link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: var(--vp-nav-height);
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}

.link:hover,
.link.active {
  color: var(--vp-c-brand-1);
}

.chevron {
  font-size: 14px;
  opacity: 0.8;
}

.GatewayNav:hover .link {
  color: var(--vp-c-brand-1);
}

.menu {
  position: absolute;
  top: calc(var(--vp-nav-height) / 2 + 20px);
  right: 0;
  min-width: 220px;
  padding: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--vp-border-radius);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
  z-index: 40;
}

.menu-item {
  display: block;
  padding: 7px 10px;
  border-radius: var(--vp-border-radius-small);
  font-size: 14px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.menu-item:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.menu-item.active {
  color: var(--vp-c-brand-1);
}

/* ===== Mobile screen menu ===== */

.GatewayScreen {
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 8px 0 10px;
}

.head {
  display: block;
  padding: 4px 4px 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.head:hover,
.head.active {
  color: var(--vp-c-brand-1);
}

.item {
  display: block;
  padding: 5px 4px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.item:hover,
.item.active {
  color: var(--vp-c-brand-1);
}
</style>