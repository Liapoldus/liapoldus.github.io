# Plugin Admin UI contract

Плагин публикует versioned declarative Admin Surface; Constructor не вшивает
его UI, а Gateway не принимает plugin-owned HTTP handler. Полная жизненная
модель, fixed internal API, cache, security и ownership находятся на
[Plugin Admin Pages](/plugins/admin-pages).

Поддерживаемые базовые fields: `string`, `number`, `boolean`, `select`,
`multiselect`, `secret`, `file`, `directory`, `duration`, `size`, `code`,
`keyValue`, `array`, `object`. `secret` — reference/write-only field, его
значение никогда не возвращается UI.

Канон source contract расположен в
[`pluginprotocol/contracts/admin-ui/v1`](https://github.com/Liapoldus/pluginprotocol/tree/main/contracts/admin-ui/v1).
Это требуемое расширение Gateway API, указанное в
[API boundaries](/architecture/api-boundaries); endpoint не является
неофициальным direct-plugin URL.
