import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const base = process.env.BASE_PATH || '/'

export default withMermaid(
  defineConfig({
    title: 'Liapoldus',
    description:
      'Liapoldus — набор компонентов для публикации сайтов: gateway, плагины, документация.',
    lang: 'ru-RU',
    base,
    cleanUrls: true,

    head: [
      ['link', { rel: 'icon', href: `${base}favicon.svg`, type: 'image/svg+xml' }]
    ],

    themeConfig: {
      nav: [
        { text: 'Главная', link: '/' },
        { component: 'GatewayNav' },
        { text: 'Плагины', link: '/plugins/' }
      ],

      search: {
        provider: 'local',
        options: {
          translations: {
            button: {
              buttonText: 'Поиск',
              buttonAriaLabel: 'Поиск по документации'
            },
            modal: {
              displayDetails: 'Показать подразделы',
              noResultsText: 'Ничего не найдено',
              resetButtonTitle: 'Сбросить запрос',
              footer: {
                selectText: 'выбрать',
                selectKeyAriaLabel: 'Enter',
                navigateText: 'перейти',
                navigateKeyAriaLabel: 'Стрелки',
                closeKeyAriaLabel: 'Закрыть (Esc)'
              }
            }
          }
        }
      },

      sidebar: {
        '/gateway/': [
          {
            text: 'Gateway',
            items: [{ text: 'Обзор', link: '/gateway/' }]
          }
        ],
        '/gateway/examples/': [
          {
            text: 'Практические примеры',
            items: [
              { text: 'Обзор примеров', link: '/gateway/examples/' },
              { text: 'Простой сайт', link: '/gateway/examples/simple-site' },
              { text: 'Reverse proxy', link: '/gateway/examples/proxy' },
              { text: 'TLS и SNI', link: '/gateway/examples/tls' },
              { text: 'Формы на сайте', link: '/gateway/examples/forms' },
              { text: 'Капча на сайте', link: '/gateway/examples/captcha' }
            ]
          }
        ],
        '/gateway/configuration/': [
          {
            text: 'Configuration',
            items: [
              { text: 'gateway.yaml', link: '/gateway/configuration/' },
              { text: 'Management API', link: '/gateway/configuration/management-api' },
              { text: 'Безопасность', link: '/gateway/configuration/security' }
            ]
          }
        ],
        '/gateway/cli/': [
          {
            text: 'CLI',
            items: [{ text: 'Справочник подкоманд', link: '/gateway/cli/' }]
          }
        ],
        '/gateway/deploy/': [
          {
            text: 'Deploy',
            items: [{ text: 'Развёртывание', link: '/gateway/deploy/' }]
          }
        ],
        '/gateway/architecture/': [
          {
            text: 'Архитектура',
            items: [
              { text: 'Обзор', link: '/gateway/architecture/' },
              { text: 'Структура проектов', link: '/gateway/architecture/structure' },
              { text: 'Gateway: data/control plane', link: '/gateway/architecture/gateway' },
              { text: 'Plugin protocol', link: '/gateway/architecture/protocol' },
              { text: 'Контракт протокола', link: '/gateway/architecture/contract' },
              { text: 'Гайд: создание плагина', link: '/gateway/architecture/guide' }
            ]
          }
        ],
        '/plugins/': [
          {
            text: 'Плагины',
            items: [
              { text: 'Обзор и настройка', link: '/plugins/' },
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