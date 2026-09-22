# State, scripts и infrastructure

## State

Внутренняя основа state management — Zustand с React subscriptions. SDK даёт
Vue-like `reactive`, `computed` и `defineState`, чтобы типовой UI не требовал
Zustand boilerplate. Прямые React state, Zustand и hooks остаются допустимыми.

## Scripts

Script — сущность `Trigger + Handler + Inputs + Outputs + Permissions +
Environment + Versions`. Triggers: Page Load, Component Event, Keyboard
Shortcut, Webhook, Cron, Build, Deploy, Custom. Browser scripts выполняются в
frontend. Webhook/cron/backend handler исполняются через отдельный server-side
plugin/runtime capability; static bundle их не «эмулирует».

## Infrastructure

Infrastructure model охватывает APIs, Authentication, Storage, External
Services, Environments и Custom adapters. Компонент и Script используют
logical binding, а не hardcoded URL. Visual API editor описывает base URL,
auth и endpoints; нестандартный случай реализуется custom TypeScript adapter.
