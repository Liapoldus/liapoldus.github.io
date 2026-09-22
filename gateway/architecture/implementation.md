# Blueprint реализации

Эта спецификация позволяет создать совместимый Gateway на любом языке. Она
нормирует observable behavior, а не packages, classes или framework.

## Process boundaries

| Boundary | Владелец | Контракт |
| --- | --- | --- |
| Public sockets | Gateway | HTTP(S), TCP, UDP, TLS и limits |
| Runtime snapshot | Gateway | immutable compiled graph, atomic replace |
| Static source | Gateway | release pointer или read-only directory root |
| Upstream | external service | TCP/UDP/HTTP traffic after policy decision |
| Plugin | separate process | loopback framed IPC, declared capability and grants |
| Control plane | Gateway | CLI and Management API → application operations |

## Обязательные state machines

`config`: collect → resolve → validate → prepare → active. Любой failure
оставляет старый `active` без изменения sockets и traffic.

`release`: stage → validate → rename immutable revision → switch `previous` →
switch `current` → prune old previous → audit. Directory source не проходит эту
машину.

`plugin`: spawned → handshake → ready → unhealthy → restarting/stopped.
Handshake, grants, cancellation и streams определяет
[versioned Plugin protocol](/gateway/architecture/protocol). Исходные `.proto`
и identity contracts находятся в
[`github.com/Liapoldus/pluginprotocol`](https://github.com/Liapoldus/pluginprotocol).

`request`: accept → normalize → match → auth → WAF → rate limit → rewrite →
terminal → transforms → response. Канонический порядок —
<a href="/spec/http-runtime.json" target="_blank" rel="noopener">http-runtime.json</a>.

## Concurrency и failures

Reader получает только active snapshot; reload готовит новый вне request path и
после atomic swap освобождает старый только после drain. Publish сериализуется
по release slug. Plugin call имеет deadline, bounded buffer и RSS limit.
Exporter failure не меняет response; policy, TLS, plugin и upstream failure
всегда преобразуются в typed Problem Details.

## Trust boundaries

Client не управляет source path, upstream headers, identity, grants или
secrets. Plugin не получает public socket, filesystem path или raw secret.
Удалённый management client проходит TLS client authentication и Bearer
authorization. Полный security contract —
<a href="/spec/security-runtime.json" target="_blank" rel="noopener">security-runtime.json</a>.
