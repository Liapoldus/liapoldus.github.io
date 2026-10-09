import { defineConfig } from 'vitepress'
import { tabsMarkdownPlugin } from 'vitepress-plugin-tabs'
import { diagramsPlugin } from './plugins/diagrams.mts'
import { openApiSpecPlugin } from './plugins/openapi-spec.mts'

const base = process.env.BASE_PATH || '/'

export default defineConfig({
    title: 'Liapoldus',
  description:
      'Целевая документация Liapoldus — платформы публикации публичных сайтов.',
    srcDir: '.site-src',
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
        { component: 'CoreNav' },
        { text: 'Studio', link: '/studio/' },
        { text: 'CLI', link: '/cli/' },
        { text: 'Плагины', link: '/plugins/' },
        {
          text: 'Библиотеки',
          items: [
            { text: 'Plugin SDK', link: '/plugin-sdk/' },
            { text: 'pluginprotocol', link: '/pluginprotocol/' }
          ]
        },
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
        '/core/': [
          {
            text: 'Оператор',
            items: [
              { text: 'Core: обзор', link: '/core/' },
              { text: 'Настройка Core', link: '/core/configuration/' },
              { text: 'Практические сценарии', link: '/core/examples/' },
              { text: 'Развёртывание', link: '/core/deploy/' }
            ]
          }
        ],
        '/studio/': [
          {
            text: 'Liapoldus Studio',
            items: [
              { text: 'Обзор', link: '/studio/' },
              { text: 'Продуктовая модель', link: '/studio/product-model' },
              { text: 'Проект и дерево файлов', link: '/studio/project-and-files' },
              { text: 'Git и управление версиями', link: '/studio/version-control' },
              { text: 'Core workspace', link: '/studio/core-workspace' },
              { text: 'Операции и диагностика', link: '/studio/operations' },
              { text: 'Studio plugins и marketplace', link: '/studio/studio-plugins' },
              { text: 'Безопасность и режимы', link: '/studio/security-and-modes' },
              { text: 'Roadmap и решения', link: '/studio/roadmap' }
            ]
          }
        ],
        '/cli/': [
          {
            text: 'Liapoldus CLI',
            items: [
              { text: 'Обзор', link: '/cli/' },
              { text: 'Архитектура и границы', link: '/cli/architecture' },
              { text: 'Project и config bundle', link: '/cli/project-and-bundle' },
              { text: 'Команды', link: '/cli/commands' },
              { text: 'Core API contract', link: '/cli/core-api' },
              { text: 'Targets и несколько Core', link: '/cli/targets' },
              { text: 'GitHub CI и approval', link: '/cli/ci-and-approval' },
              { text: 'Миграция из Core CLI', link: '/cli/migration-from-core-cli' },
              { text: 'Roadmap', link: '/cli/roadmap' }
            ]
          }
        ],
        '/core/examples/': [
          {
            text: 'Практические примеры',
            items: [
              { text: 'Обзор примеров', link: '/core/examples/' },
              { text: 'Простой сайт', link: '/core/examples/simple-site' },
              { text: 'Reverse proxy', link: '/core/examples/proxy' },
              { text: 'TLS и доступ к Management API', link: '/core/examples/tls' },
              { text: 'Формы на сайте', link: '/core/examples/forms' }
            ]
          }
        ],
        '/core/configuration/': [
          {
            text: 'Оператор · конфигурация',
            items: [
              { text: 'Обзор и быстрый старт', link: '/core/configuration/' },
              { text: 'Bootstrap core.yaml', link: '/core/configuration/bootstrap' },
              { text: 'Полная схема bootstrap', link: '/core/configuration/core-schema' },
              { text: 'Traffic settings plugin', link: '/core/configuration/http-runtime' },
              { text: 'HTTP-транспорты v1', link: '/core/configuration/transports' },
              { text: 'Upstream и балансировка', link: '/core/configuration/upstreams' },
              { text: 'TLS, auth и WAF', link: '/core/configuration/security' },
              { text: 'HTTP runtime', link: '/core/configuration/http-runtime' },
              { text: 'Reload и конфликты', link: '/core/configuration/tls-reload' },
              { text: 'Каталог ошибок', link: '/core/configuration/errors' },
              { text: 'Acceptance matrix', link: '/core/configuration/acceptance' },
              { text: 'Секреты и переменные', link: '/core/configuration/secrets' }
            ]
          }
        ],
        '/core/deploy/': [
          {
            text: 'Оператор · развёртывание',
            items: [
              { text: 'Развёртывание', link: '/core/deploy/' },
              { text: 'Backup, restore и upgrade', link: '/core/deploy/backup-restore' },
              { text: 'Логи и наблюдаемость', link: '/core/deploy/observability' }
            ]
          }
        ],
        '/core/api/': [
          {
            text: 'Оператор · Core API',
            items: [
              { text: 'Обзор', link: '/core/api/' },
              { text: 'Аутентификация', link: '/core/api/authentication' },
              { text: 'Настройки plugins', link: '/core/api/config' },
              { text: 'Ресурсы и операции', link: '/core/api/operations' },
              { text: 'Audit и operations', link: '/core/api/audit' },
              { text: 'OpenAPI', link: '/core/api/openapi' }
            ]
          }
        ],
        '/core/architecture/': [
          {
            text: 'Реализатор · архитектура',
            items: [
              { text: 'Обзор', link: '/core/architecture/' },
              { text: 'План миграции Core v1', link: '/core/architecture/v1-migration-roadmap' },
              { text: 'Границы и решения', link: '/core/architecture/target' },
              { text: 'Control plane и группы', link: '/core/architecture/control-plane' },
              { text: 'Компоненты runtime', link: '/core/architecture/core' },
              { text: 'Blueprint реализации', link: '/core/architecture/implementation' },
              { text: 'Кодовая архитектура', link: '/core/architecture/structure' },
              { text: 'Plugin protocol', link: '/core/architecture/protocol' },
              { text: 'Cookie-контракт', link: '/core/architecture/cookies' },
              { text: 'Режимы подключения plugin', link: '/core/architecture/plugin-deployment' },
              { text: 'Гайд: создание плагина', link: '/core/architecture/guide' }
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
              { text: 'Server plugin', link: '/plugins/server' },
              { text: 'Admin UI contract', link: '/plugins/admin-ui-contract' },
              { text: 'Admin pages', link: '/plugins/admin-pages' },
              { text: 'Разработка плагина', link: '/plugins/development' },
              { text: 'Существующие плагины', link: '/plugins/existing' },
              { text: 'forms-db', link: '/plugins/forms-db' }
            ]
          },
          {
            text: 'Отложено до v2',
            items: [
              { text: 'Domain plugin', link: '/plugins/domain' },
              { text: 'Runtime plugin', link: '/plugins/runtime' },
              { text: 'Identity plugin', link: '/plugins/identity' },
              { text: 'CAPTCHA plugin', link: '/plugins/captcha' }
            ]
          }
        ],
        '/plugin-sdk/': [
          {
            text: 'Plugin SDK',
            items: [
              { text: 'Обзор', link: '/plugin-sdk/' },
              { text: 'Разработка plugins', link: '/plugins/development' },
              { text: 'Plugin runtime', link: '/plugins/architecture' },
              { text: 'Manifest и capabilities', link: '/plugins/manifest' },
              { text: 'Admin Pages', link: '/plugins/admin-pages' },
              { text: 'Admin UI contract', link: '/plugins/admin-ui-contract' }
            ]
          }
        ],
        '/pluginprotocol/': [
          {
            text: 'pluginprotocol',
            items: [
              { text: 'Обзор', link: '/pluginprotocol/' },
              { text: 'Руководство потребителя', link: '/pluginprotocol/docs/consumer-guide' },
              { text: 'Миграция', link: '/pluginprotocol/docs/migration' },
              { text: 'Changelog', link: '/pluginprotocol/CHANGELOG' }
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
        message: 'Liapoldus — Core control plane и расширяемая plugin-система.'
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
