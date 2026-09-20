---
layout: home

hero:
  name: Liapoldus
  text: Независимый L7-gateway для публичных сайтов
  tagline: >-
    Раздача сайтов из registry, TLS/HTTP/2, редиректы и внешние плагины —
    единый бинарник без собственной базы данных.
  actions:
    - theme: brand
      text: Документация Gateway
      link: /gateway/
    - theme: alt
      text: Практические примеры
      link: /gateway/examples/

features:
  - title: Gateway
    details: >-
      Конфигурация gateway.yaml, server-блоки, TLS/SNI, reload, management API,
      CLI и развёртывание.
    link: /gateway/
    linkText: Разделы документации
  - title: Плагины
    details: >-
      forms-db, captcha — внешние процессы, которые gateway запускает и вызывает
      по liapoldus plugin protocol.
    link: /plugins/
    linkText: Существующие плагины
  - title: Практические примеры
    details: >-
      Полные сценарии: статический сайт, reverse proxy, TLS/SNI, формы и капча
      на сайте.
    link: /gateway/examples/
    linkText: Смотреть примеры
---

## Компоненты

| Компонент | Назначение | Зависимости |
| --- | --- | --- |
| **gateway** | публичный рантайм, раздача сайтов, плагины | без БД; читает файлы конфигов и registry |
| **plugins** | отдельные binary: формы, капча и другие | TCP loopback + protobuf протокол |

Gateway — обязательная часть; plugins подключаются по мере необходимости.
Каждый компонент — отдельный бинарник со своим протоколом и контрактом.