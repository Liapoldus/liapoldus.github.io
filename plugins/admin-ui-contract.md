# Plugin Admin UI contract

Constructor не вшивает UI конкретного plugin. Плагин публикует versioned Admin
UI schema через его control contract; Gateway остаётся proxy/authorizer этого
обмена. Schema описывает sections, fields, validation, actions, status,
metrics, logs и health.

Поддерживаемые базовые fields: `string`, `number`, `boolean`, `select`,
`multiselect`, `secret`, `file`, `directory`, `duration`, `size`, `code`,
`keyValue`, `array`, `object`. `secret` — reference/write-only field, его
значение никогда не возвращается UI.

Конкретный endpoint пока не вводится: существующий Gateway API не описывает
этот contract. Это явный [API gap](/architecture/api-boundaries), а не
неофициальный URL.
