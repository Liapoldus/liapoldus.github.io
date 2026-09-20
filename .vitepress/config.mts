import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const base = process.env.BASE_PATH || '/'

export default withMermaid(
  defineConfig({
    title: 'Liapoldus Gateway',
    description:
      'Документация Liapoldus gateway: настройка, CLI, развёртывание, архитектура и плагины.',
    lang: 'ru-RU',
    base,
    cleanUrls: true,

    head: [
      ['link', { rel: 'icon', href: `${base}favicon.svg`, type: 'image/svg+xml' }]
    ],

    themeConfig: {
      nav: [
        { text: 'Главная', link: '/' },
        { text: 'Configuration', link: '/configuration/' },
        { text: 'CLI', link: '/cli/' },
        { text: 'Deploy', link: '/deploy/' },
        { text: 'Архитектура', link: '/architecture/' },
        { text: 'Плагины', link: '/plugins/' }
      ],

      sidebar: {
        '/configuration/': [
          {
            text: 'Configuration',
            items: [
              { text: 'gateway.yaml', link: '/configuration/' },
              { text: 'Management API', link: '/configuration/management-api' },
              { text: 'Безопасность', link: '/configuration/security' }
            ]
          }
        ],
        '/cli/': [
          {
            text: 'CLI',
            items: [{ text: 'Справочник подкоманд', link: '/cli/' }]
          }
        ],
        '/deploy/': [
          {
            text: 'Deploy',
            items: [{ text: 'Развёртывание', link: '/deploy/' }]
          }
        ],
        '/architecture/': [
          {
            text: 'Архитектура',
            items: [
              { text: 'Обзор', link: '/architecture/' },
              { text: 'Структура проектов', link: '/architecture/structure' },
              { text: 'Gateway: data/control plane', link: '/architecture/gateway' },
              { text: 'Plugin protocol', link: '/architecture/protocol' }
            ]
          }
        ],
        '/plugins/': [
          {
            text: 'Плагины',
            items: [
              { text: 'Обзор и настройка', link: '/plugins/' },
              { text: 'Контракт протокола', link: '/plugins/contract' },
              { text: 'Гайд: создание плагина', link: '/plugins/guide' },
              { text: 'forms-db', link: '/plugins/forms-db' },
              { text: 'captcha', link: '/plugins/captcha' }
            ]
          }
        ],
        '/': []
      },

      outline: {
        level: [2, 3],
        label: 'На этой странице'
      },

      socialLinks: [],
      footer: {
        message: 'Liapoldus — независимый L7 gateway.'
      }
    },

    mermaid: {
      theme: 'neutral'
    },

    vite: {
      resolve: {
        alias: {}
      },
      plugins: [
        {
          name: 'fastdom-shim',
          enforce: 'pre',
          resolveId(source) {
            const target = new URL('./shim/fastdom.mjs', import.meta.url).pathname
            const targetProm = new URL('./shim/fastdom-promised.mjs', import.meta.url).pathname
            if (source === 'fastdom') return target
            if (
              source === 'fastdom/extensions/fastdom-promised' ||
              source === 'fastdom/extensions/fastdom-promised.js'
            ) {
              return targetProm
            }
            return null
          }
        }
      ]
    }
  })
)