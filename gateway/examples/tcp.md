# TCP relay

TCP relay в v1 обслуживает Caddy-L4 внутри отдельного Caddy plugin. Это не Core listener и не Go `net` fallback; конкретные settings берутся из schema Caddy plugin.

См. [транспорты](../configuration/transports) и [матрицу acceptance](../configuration/acceptance).
