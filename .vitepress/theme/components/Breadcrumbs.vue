<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useData, withBase } from 'vitepress'

interface Crumb {
  text: string
  link?: string
}

const { page, theme } = useData()

const sectionRoots = ref<string[]>([])

const crumbs = computed<Crumb[]>(() => {
  const rel = page.value.relativePath
  if (!rel || rel === 'index.html') return []
  const clean = normalize(rel)
  const trail = resolve(clean, theme.value.sidebar as unknown)
  return [{ text: 'Главная', link: '/' }, ...(trail ?? [{ text: page.value.title }])]
})

function normalize(rel: string): string {
  let p = '/' + rel.replace(/\.(md|html)$/, '')
  if (p.endsWith('/index')) return p.slice(0, -6)
  if (p.endsWith('/')) return p.slice(0, -1)
  return p
}

function resolve(pagePath: string, sidebar: unknown): Crumb[] | null {
  sectionRoots.value = []
  if (Array.isArray(sidebar)) return findGroups(pagePath, sidebar)

  if (sidebar && typeof sidebar === 'object') {
    const entries = Object.entries(sidebar as Record<string, unknown>)
      .filter(([prefix]) => pagePath.startsWith(prefix))
      .sort((a, b) => b[0].length - a[0].length)
    if (entries.length === 0) return null
    sectionRoots.value = entries.map(([k]) => '/' + k.replace(/^\/+|\/+$/g, ''))
    if (Array.isArray(entries[0][1])) return findGroups(pagePath, entries[0][1] as any[])
  }
  return null
}

function findGroups(pagePath: string, groups: any[]): Crumb[] | null {
  for (const group of groups) {
    const found = walk(group, pagePath, [])
    if (found) return found
  }
  return null
}

function walk(group: any, pagePath: string, acc: Crumb[]): Crumb[] | null {
  const prefix: Crumb[] = group?.text ? [...acc, { text: group.text }] : acc

  for (const item of group?.items ?? []) {
    if (!item) continue
    if (normalize(item.link) === normalize(pagePath)) return [...prefix, { text: item.text }]
    if (item.items) {
      const sub = walk(item, pagePath, prefix)
      if (sub) return sub
    }
  }
  return null
}

const currentPath = computed(() => {
  const rel = page.value.relativePath
  if (!rel) return ''
  return normalize(rel)
})

const back = computed(() => {
  const furthest = sectionRoots.value.find((r) => r && r !== currentPath.value)
  if (furthest) return { text: '', link: furthest }
  const trail = crumbs.value
  for (let i = trail.length - 2; i >= 0; i--) {
    if (trail[i].link) return trail[i]
  }
  return null
})
</script>

<template>
  <nav v-if="crumbs.length" class="Breadcrumbs" aria-label="Хлебные крошки">
    <a v-if="back?.link" class="back" :href="withBase(back.link)">← Назад</a>

    <ol class="trail">
      <li v-for="(crumb, i) in crumbs" :key="i" class="crumb">
        <template v-if="crumb.link && i < crumbs.length - 1">
          <a class="link" :href="withBase(crumb.link)">{{ crumb.text }}</a>
          <span class="sep" aria-hidden="true">/</span>
        </template>
        <span v-else class="current" aria-current="page">{{ crumb.text }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.Breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--vp-border-radius-small);
  color: var(--vp-c-text-2);
  white-space: nowrap;
  transition: color 0.25s, border-color 0.25s;
}

.back:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.trail {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.crumb {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.link {
  color: var(--vp-c-text-2);
  transition: color 0.25s;
}

.link:hover {
  color: var(--vp-c-brand-1);
}

.sep {
  color: var(--vp-c-text-3);
  margin: 0 4px;
}

.current {
  color: var(--vp-c-text-1);
  font-weight: 500;
}
</style>