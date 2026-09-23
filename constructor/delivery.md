# Git, versions, snapshots и delivery

<img src="/diagrams/constructor-flow.svg" alt="Git, Snapshot, Build и Deployment" />

Git panel активного проекта показывает working-tree status, HEAD-to-working-tree
diff, локальные branches и последние commits. Commit запускается только явной
кнопкой с сообщением и блокируется, пока Inspector содержит несохранённый draft.
API также предоставляет clone и detached-worktree операции. Remote Git binding,
branch checkout/create, pull/push и полный conflict workflow пока не реализованы;
они остаются отдельными Git integration задачами v1.

## Четыре разных понятия

Build worker не собирает изменяемое рабочее дерево напрямую. После создания
snapshot он материализует `gitCommit` во временный detached workspace, запускает
Vite/Node build там и возвращает отдельный каталог артефактов. Поэтому изменение
файлов в открытом проекте во время сборки не может незаметно изменить результат
этого snapshot.

Snapshot revision включает сохранённые файлы working tree на момент операции.
Для этого создаётся отдельный Git commit object из временного index; branch и
обычный Git index не изменяются. Commit закрепляется под
`refs/constructor/snapshots/<commit>`, чтобы он не стал dangling после Git GC.
Перед фиксацией дерево считывается повторно: при изменении файлов во время
capture Snapshot отменяется с HTTP `409 snapshot_source_changed`, без записи в
delivery store и без оставшегося snapshot ref. Constructor API дополнительно
сериализует свои file mutations через capture. Новый Constructor project
получает bootstrap commit при создании, после которого application-level Git
Commit остаётся явным действием пользователя.

Entity version (например, `Hero v17`) относится к Component/Theme/Page и
связана с Git. Git commit — revision repository. **Snapshot** — полное
согласованное deployable состояние `project_id`, `site_id`, target `locale`,
`git_commit`, metadata, author, time и status. Snapshot identity and content
digest include project ID, exact revision, Site and locale, so snapshots from
separate projects and locale builds cannot collide. The local repository locator
is stored privately for the build worker and is not included in the HTTP
response. This locator assumes that the project stays at the same path until its
Snapshot is built; moving it before Build is a v1 limitation. **Build** —
immutable artifact именно этого Snapshot.

Build выполняется только как `Git → Snapshot → validation → generate (routes,
content, i18n, theme, assets, config) → React/Vite build → static artifact`.
Deployment связывает Environment, Snapshot и Build. Rollback выбирает прошлый
Snapshot, показывает diff/preview и после подтверждения обновляет metadata
активного Snapshot. Secrets не входят в Snapshot.

При создании Snapshot Constructor сначала закрепляет текущую рабочую revision,
затем создаёт detached Git worktree и генерирует в нём content для всех
включённых Site locales, route module и asset manifest. Набор публикуется одной
revision-checked filesystem batch-операцией; final Snapshot указывает на Git
revision уже с generated output. Ошибка locale, route, asset или Theme не
оставляет частичный generated набор в Snapshot, а исходный checkout не меняется.
Worktree и временная base ref удаляются. Theme token CSS генерируется для
выбранного Site `themeId`; metadata набора generated-файлов в Snapshot/Build ещё не
реализованы.

Local Node/Vite worker собирает immutable Git revision во временном workspace.
Установка зависимостей и build разделяют общий deadline в 15 минут; отмена HTTP
запроса передаётся worker, а дочерний process tree завершается. Worker возвращает
путь к static artifact и SHA-256 checksum дерева (относительные пути, размеры и
содержимое файлов); пустой результат и symlink/non-regular output отклоняются.
Build сохраняет checksum вместе со статусом. Клиентский `error` намеренно
санитизирован: raw stdout/stderr worker не публикуются в HTTP-ответе и пока не
доступны как build logs. CPU/memory/network isolation, retention и очистка
успешных artifacts остаются ограничениями v1.

Environments включают Development, Staging, Production и custom; отличаются
Gateway binding, domains, infrastructure references, secret references и
deployment settings.

Publish принимает только ready Snapshot и успешный Build именно этого Snapshot
и Site. Пользователь отдельно подтверждает точную пару Site/Environment.
Перед deployment Constructor сверяет локальную active revision с текущей
Gateway release revision. Для первого Constructor deployment, если release в
Gateway уже существует, пользователь явно подтверждает её как baseline; это не
автоматическое усыновление. Publish передаёт Gateway `expectedCurrentRevision`,
путь immutable static artifact как release source и idempotency key. Возвращённая
Gateway release revision сохраняется в локальной SQLite deployment history;
локальный active deployment меняется транзакционно только после успешной
Gateway operation. Drift или stale revision блокируют операцию. Rollback также
использует expected revision и записывается новым Deployment с
`action: "rollback"`, сохраняя историю предыдущих операций.
Перед Gateway-вызовом Constructor сохраняет CAS precondition и operation identity
в SQLite. После перезапуска worker повторяет publish/rollback с тем же ключом
идемпотентности; пока Gateway не подтвердит результат, deployment остаётся
`applying` и target зарезервирован. Это не позволяет считать неизвестный исход
успешным или отправлять поверх него следующую публикацию.
