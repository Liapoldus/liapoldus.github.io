# State, scripts и infrastructure

## State

Внутренняя основа state management — Zustand с React subscriptions. SDK даёт
Vue-like `reactive`, `computed` и `defineState`, чтобы типовой UI не требовал
Zustand boilerplate. Прямые React state, Zustand и hooks остаются допустимыми.

State declaration живёт в `src/state/<id>.ts`; он не сериализуется в Content и
не копируется в Constructor DB. `reactive` работает только с serializable
client state. Side effect живёт в `action`/Script, получает abort signal и не
исполняется в React render. Preview создаёт isolated store per session.

## Scripts

Script — сущность `Trigger + Handler + Inputs + Outputs + Permissions +
Environment + Versions`. Triggers: Page Load, Component Event, Keyboard
Shortcut, Webhook, Cron, Build, Deploy, Custom. Browser scripts выполняются в
frontend. Webhook/cron/backend handler исполняются через отдельный server-side
plugin/runtime capability; static bundle их не «эмулирует».

Script имеет stable ID, typed input/output schema, permission set, allowed
environment list, timeout and retry policy. Browser Script не получает secret:
он вызывает Infrastructure binding, который authorizes server-side. Cron и
webhook получают idempotency key и audit record у runtime capability.

## Infrastructure

Infrastructure model охватывает APIs, Authentication, Storage, External
Services, Environments и Custom adapters. Компонент и Script используют
logical binding, а не hardcoded URL. Visual API editor описывает base URL,
auth и endpoints; нестандартный случай реализуется custom TypeScript adapter.

Binding имеет stable ID и environment overlay. Overlay меняет base URL или
secret reference, но не endpoint contract. Generator создаёт typed client в
`src/generated`; developer adapter реализует только declared hooks.
