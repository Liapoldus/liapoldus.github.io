# Версии plugins и releases сайтов

В supervised profile Core устанавливает plugin releases из TUF-подписанного
каталога по `publisher/name/version`. Он хранит package в локальном immutable
release directory и активную версию; переход на предыдущую установленную
версию выполняется только после проверки package/protocol compatibility.
Произвольные URLs и неподписанные binaries не принимаются.

В external profile binary versions и rollbacks выполняет Docker/Kubernetes или
operator. Core не устанавливает и не перезапускает удалённые процессы; он
показывает observed Manifest/release digest и desired/applied config generation.

Site releases принадлежат Caddy plugin, а не Core registry. Plugin хранит
immutable artifact releases и pointers `current/previous` на своём persistent
filesystem и меняет их через собственную Admin Surface. API details — в
[plugin configuration](../api/config) и
[целевой архитектуре](../architecture/target).
