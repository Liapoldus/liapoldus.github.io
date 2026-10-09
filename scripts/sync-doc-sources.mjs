import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { readDocsSources } from './docs-sources-manifest.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = resolve(projectRoot, '..')
const stagingRoot = join(projectRoot, '.site-src')
const checkoutRoot = join(projectRoot, '.docs-sources')
const manifest = readDocsSources(join(projectRoot, 'docs-sources.yaml'))
const remoteMode = process.argv.includes('--remote') || process.env.DOCS_SYNC_MODE === 'remote'

if (existsSync(checkoutRoot)) {
  const activeSources = new Set(manifest.sources.map((source) => source.name))
  for (const entry of readdirSync(checkoutRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !activeSources.has(entry.name)) {
      rmSync(join(checkoutRoot, entry.name), { recursive: true, force: true })
    }
  }
}

function isWithin(parent, child) {
  const pathFromParent = relative(parent, child)
  return pathFromParent === '' || (!pathFromParent.startsWith(`..${sep}`) && pathFromParent !== '..' && !isAbsolute(pathFromParent))
}

function runGit(repo, args) {
  execFileSync('git', args, { cwd: repo, stdio: 'inherit' })
}

function sourceRoot(source) {
  const local = resolve(workspaceRoot, source.workspacePath)
  if (!remoteMode && existsSync(join(local, '.git'))) return local

  const checkout = join(checkoutRoot, source.name)
  if (!existsSync(join(checkout, '.git'))) {
    mkdirSync(checkoutRoot, { recursive: true })
    execFileSync('git', ['clone', '--filter=blob:none', '--no-checkout', source.repository, checkout], {
      cwd: projectRoot,
      stdio: 'inherit'
    })
  }
  runGit(checkout, ['fetch', '--depth=1', 'origin', source.ref])
  runGit(checkout, ['checkout', '--detach', 'FETCH_HEAD'])
  return checkout
}

function copyMapping(sourceBase, mapping) {
  const from = resolve(sourceBase, mapping.from)
  const to = resolve(stagingRoot, mapping.to)
  if (!isWithin(sourceBase, from) || !isWithin(stagingRoot, to)) {
    throw new Error(`Documentation mapping escapes its root: ${mapping.from} -> ${mapping.to}`)
  }
  if (!existsSync(from)) throw new Error(`Missing documentation source: ${relative(sourceBase, from)}`)

  mkdirSync(dirname(to), { recursive: true })
  if (statSync(from).isDirectory()) {
    cpSync(from, to, { recursive: true, force: true, filter: (path) => !path.split(sep).some((part) => part === '.git' || part === 'node_modules') })
  } else {
    cpSync(from, to, { force: true })
  }
}

if (existsSync(stagingRoot)) rmSync(stagingRoot, { recursive: true, force: true })
mkdirSync(stagingRoot, { recursive: true })

for (const path of ['index.md', 'architecture', 'guidelines', 'product']) {
  copyMapping(projectRoot, { from: path, to: path })
}
copyMapping(projectRoot, { from: 'public', to: 'public' })
mkdirSync(join(stagingRoot, 'diagrams'), { recursive: true })
for (const file of readdirSync(join(projectRoot, 'diagrams')).filter((name) => name.endsWith('.mmd'))) {
  copyMapping(projectRoot, { from: join('diagrams', file), to: join('diagrams', file) })
}
for (const path of ['plugins/index.md', 'plugins/existing.md', 'plugins/captcha.md', 'plugins/identity.md']) {
  copyMapping(projectRoot, { from: path, to: path })
}

for (const source of manifest.sources) {
  const root = sourceRoot(source)
  for (const mapping of source.mappings) copyMapping(root, mapping)
  console.log(`Synced documentation from ${source.name} at ${source.ref}`)
}
