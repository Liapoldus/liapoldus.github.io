import { defineConfig } from 'vitepress'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'
import { diagramsPlugin } from './plugins/diagrams.mts'
import { openApiSpecPlugin } from './plugins/openapi-spec.mts'

const base = process.env.BASE_PATH || '/'

export default defineConfig({
    title: 'Liapoldus',
    description:
      'Целевая документация Liapoldus — платформы публикации публичных сайтов.',
    lang: 'ru-RU',
    base,
    cleanUrls: true,
    ignoreDeadLinks: [/^\/spec\//],

    markdown: {
      config(md) {
        md.use(tabsMarkdownPlugin)
      }
    },

    head: [
      ['link', { rel: 'icon', href: `${base}favicon.svg`, type: 'image/svg+xml' }]
    ],

    themeConfig: {
      nav: [
        { text: 'Главная', link: '/' },
        { text: 'О продукте', link: '/product/' },
        { component: 'GatewayNav' },
        { text: 'Архитектура', link: '/gateway/architecture/' },
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
        '/product/': [
          {
            text: 'О продукте',
            items: [
              { text: 'Обзор', link: '/product/' },
              { text: 'Пользователи и UX', link: '/product/user-experience' }
            ]
          }
        ],
        '/gateway/': [
          {
            text: 'Начало работы',
            items: [
              { text: 'Gateway: обзор', link: '/gateway/' },
              { text: 'Первый сайт', link: '/gateway/configuration/' },
              { text: 'Практические сценарии', link: '/gateway/examples/' },
              { text: 'Развёртывание', link: '/gateway/deploy/' }
            ]
          }
        ],
        '/gateway/examples/': [
          {
            text: 'Практические примеры',
            items: [
              { text: 'Обзор примеров', link: '/gateway/examples/' },
              { text: 'Простой сайт', link: '/gateway/examples/simple-site' },
              { text: 'Reverse proxy', link: '/gateway/examples/proxy' },
              { text: 'TLS, OIDC и WAF', link: '/gateway/examples/tls' },
              { text: 'TCP passthrough', link: '/gateway/examples/tcp' },
              { text: 'UDP и P2P relay', link: '/gateway/examples/udp-p2p' },
              { text: 'Формы на сайте', link: '/gateway/examples/forms' },
              { text: 'Капча на сайте', link: '/gateway/examples/captcha' }
            ]
          }
        ],
        '/gateway/configuration/': [
          {
            text: 'Конфигурация',
            items: [
              { text: 'Обзор и быстрый старт', link: '/gateway/configuration/' },
              { text: 'Полная схема gateway.yaml', link: '/gateway/configuration/gateway-schema' },
              { text: 'Корневая схема', link: '/gateway/configuration/root-schema' },
              { text: 'Маршруты и условия', link: '/gateway/configuration/server-blocks' },
              { text: 'TCP, UDP и P2P', link: '/gateway/configuration/transports' },
              { text: 'Upstream и балансировка', link: '/gateway/configuration/upstreams' },
              { text: 'TLS, auth и WAF', link: '/gateway/configuration/security' },
              { text: 'Конфиг сайта', link: '/gateway/configuration/site-config' },
              { text: 'HTTP runtime', link: '/gateway/configuration/http-runtime' },
              { text: 'Reload и конфликты', link: '/gateway/configuration/tls-reload' },
              { text: 'Management API', link: '/gateway/configuration/management-api' },
              { text: 'Наблюдаемость', link: '/gateway/configuration/observability' },
              { text: 'Каталог ошибок', link: '/gateway/configuration/errors' },
              { text: 'Acceptance matrix', link: '/gateway/configuration/acceptance' },
              { text: 'Секреты и переменные', link: '/gateway/configuration/secrets' }
            ]
          }
        ],
        '/gateway/cli/': [
          {
            text: 'CLI и операции',
            items: [
              { text: 'Обзор', link: '/gateway/cli/' },
              { text: 'serve', link: '/gateway/cli/serve' },
              { text: 'Версии и откат', link: '/gateway/cli/versions' },
              { text: 'Диагностика', link: '/gateway/cli/inspect' },
              { text: 'accounts', link: '/gateway/cli/accounts' }
            ]
          }
        ],
        '/gateway/deploy/': [
          {
            text: 'Развёртывание',
            items: [{ text: 'Развёртывание', link: '/gateway/deploy/' }]
          }
        ],
        '/gateway/architecture/': [
          {
            text: 'Архитектура',
            items: [
              { text: 'Обзор', link: '/gateway/architecture/' },
              { text: 'Границы и решения', link: '/gateway/architecture/target' },
              { text: 'Компоненты runtime', link: '/gateway/architecture/gateway' },
              { text: 'Кодовая архитектура', link: '/gateway/architecture/structure' },
              { text: 'Plugin protocol', link: '/gateway/architecture/protocol' },
              { text: 'Гайд: создание плагина', link: '/gateway/architecture/guide' }
            ]
          }
        ],
        '/plugins/': [
          {
            text: 'Плагины',
            items: [
              { text: 'Обзор и настройка', link: '/plugins/' },
              { text: 'tls-issuer', link: '/plugins/tls-issuer' },
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

    vite: {
      resolve: {
        alias: {}
      },
      plugins: [
        diagramsPlugin(),
        openApiSpecPlugin(),
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
