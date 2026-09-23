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
        { text: 'Обзор', link: '/product/' },
        { text: 'Архитектура', link: '/architecture/' },
        { text: 'Code Guidelines', link: '/guidelines/' },
        { component: 'GatewayNav' },
        { text: 'Плагины', link: '/plugins/' },
        { text: 'Constructor', link: '/constructor/' }
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
        '/architecture/': [
          {
            text: 'Архитектура экосистемы',
            items: [
              { text: 'Обзор', link: '/architecture/' },
              { text: 'Границы и инварианты', link: '/architecture/boundaries' },
              { text: 'API-границы', link: '/architecture/api-boundaries' },
              { text: 'Глоссарий', link: '/architecture/glossary' }
            ]
          }
        ],
        '/guidelines/': [
          {
            text: 'Code Guidelines',
            items: [
              { text: 'Обзор', link: '/guidelines/' },
              { text: 'Структура проектов', link: '/guidelines/project-structure' },
              { text: 'Именование', link: '/guidelines/naming' },
              { text: 'Форматирование', link: '/guidelines/formatting' },
              { text: 'Архитектурные правила', link: '/guidelines/architecture-rules' },
              { text: 'Обработка ошибок', link: '/guidelines/errors' },
              { text: 'Логирование', link: '/guidelines/logging' },
              { text: 'Конфигурация', link: '/guidelines/configuration' },
              { text: 'API Guidelines', link: '/guidelines/api-guidelines' },
              { text: 'Git', link: '/guidelines/git' },
              { text: 'Тестирование', link: '/guidelines/testing' },
              { text: 'Документация', link: '/guidelines/documentation' }
            ]
          }
        ],
        '/gateway/': [
          {
            text: 'Оператор',
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
            text: 'Оператор · конфигурация',
            items: [
              { text: 'Обзор и быстрый старт', link: '/gateway/configuration/' },
              { text: 'Язык gateway.yaml', link: '/gateway/configuration/yaml-reference' },
              { text: 'Полная схема gateway.yaml', link: '/gateway/configuration/gateway-schema' },
              { text: 'Корневая схема', link: '/gateway/configuration/root-schema' },
              { text: 'Маршруты и условия', link: '/gateway/configuration/server-blocks' },
              { text: 'TCP, UDP и P2P', link: '/gateway/configuration/transports' },
              { text: 'Upstream и балансировка', link: '/gateway/configuration/upstreams' },
              { text: 'TLS, auth и WAF', link: '/gateway/configuration/security' },
              { text: 'Конфиг сайта', link: '/gateway/configuration/site-config' },
              { text: 'HTTP runtime', link: '/gateway/configuration/http-runtime' },
              { text: 'Reload и конфликты', link: '/gateway/configuration/tls-reload' },
              { text: 'Каталог ошибок', link: '/gateway/configuration/errors' },
              { text: 'Acceptance matrix', link: '/gateway/configuration/acceptance' },
              { text: 'Секреты и переменные', link: '/gateway/configuration/secrets' }
            ]
          }
        ],
        '/gateway/cli/': [
          {
            text: 'Оператор · CLI',
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
            text: 'Оператор · развёртывание',
            items: [
              { text: 'Развёртывание', link: '/gateway/deploy/' },
              { text: 'Логи и наблюдаемость', link: '/gateway/deploy/observability' }
            ]
          }
        ],
        '/gateway/api/': [
          {
            text: 'Оператор · Gateway API',
            items: [
              { text: 'Обзор', link: '/gateway/api/' },
              { text: 'Аутентификация', link: '/gateway/api/authentication' },
              { text: 'Ресурсы и операции', link: '/gateway/api/operations' },
              { text: 'Config API', link: '/gateway/api/config' },
              { text: 'Sites API', link: '/gateway/api/sites' },
              { text: 'Audit и operations', link: '/gateway/api/audit' },
              { text: 'OpenAPI', link: '/gateway/api/openapi' }
            ]
          }
        ],
        '/gateway/architecture/': [
          {
            text: 'Реализатор · архитектура',
            items: [
              { text: 'Обзор', link: '/gateway/architecture/' },
              { text: 'Границы и решения', link: '/gateway/architecture/target' },
              { text: 'Компоненты runtime', link: '/gateway/architecture/gateway' },
              { text: 'Blueprint реализации', link: '/gateway/architecture/implementation' },
              { text: 'Кодовая архитектура', link: '/gateway/architecture/structure' },
              { text: 'Plugin protocol', link: '/gateway/architecture/protocol' },
              { text: 'Cookie-контракт', link: '/gateway/architecture/cookies' },
              { text: 'Режимы подключения plugin', link: '/gateway/architecture/plugin-deployment' },
              { text: 'Гайд: создание плагина', link: '/gateway/architecture/guide' }
            ]
          }
        ],
        '/plugins/': [
          {
            text: 'Plugins',
            items: [
              { text: 'Обзор и настройка', link: '/plugins/' },
              { text: 'Архитектура и lifecycle', link: '/plugins/architecture' },
              { text: 'Manifest и capabilities', link: '/plugins/manifest' },
              { text: 'Identity plugin', link: '/plugins/identity' },
              { text: 'Admin UI contract', link: '/plugins/admin-ui-contract' },
              { text: 'Admin pages', link: '/plugins/admin-pages' },
              { text: 'Разработка плагина', link: '/plugins/development' },
              { text: 'Существующие плагины', link: '/plugins/existing' },
              { text: 'tls-issuer', link: '/plugins/tls-issuer' },
              { text: 'forms-db', link: '/plugins/forms-db' },
              { text: 'captcha', link: '/plugins/captcha' }
            ]
          }
        ],
        '/constructor/': [
          {
            text: 'Constructor',
            items: [
              { text: 'Обзор', link: '/constructor/' },
              { text: 'Концепции и модель проекта', link: '/constructor/concepts' },
              { text: 'Reference stack', link: '/constructor/reference-stack' },
              { text: 'Архитектура', link: '/constructor/architecture' },
              { text: 'Git project format', link: '/constructor/project-format' },
              { text: 'Development Mode и IDE', link: '/constructor/development' },
              { text: 'Site Management Mode', link: '/constructor/site-management' },
              { text: 'Components, primitives и SDK', link: '/constructor/components' },
              { text: 'React SDK v1', link: '/constructor/sdk-v1' },
              { text: 'State, scripts и infrastructure', link: '/constructor/application-model' },
              { text: 'Routing и network canvas', link: '/constructor/routing' },
              { text: 'Assets, themes и localization', link: '/constructor/content-assets' },
              { text: 'Git, versions, snapshots и delivery', link: '/constructor/delivery' },
              { text: 'Gateway и plugins', link: '/constructor/integrations' },
              { text: 'Sites, auth и deployment', link: '/constructor/governance' },
              { text: 'API и contracts', link: '/constructor/api' },
              { text: 'Данные и ERD', link: '/constructor/data-model' },
              { text: 'State machines', link: '/constructor/state-machines' },
              { text: 'Validation, preview и UX', link: '/constructor/experience' }
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
