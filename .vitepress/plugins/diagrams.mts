import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, extname, join, resolve } from 'node:path'
import type { Plugin } from 'vite'

const sourceDirectory = resolve(process.cwd(), '.site-src/diagrams')
const outputDirectory = resolve(process.cwd(), '.site-src/public/diagrams')
const trackedOutputDirectory = resolve(process.cwd(), 'public/diagrams')
const sourceHashesPath = resolve(process.cwd(), '.vitepress/diagram-source-hashes.json')
const puppeteerConfig = join(process.cwd(), '.vitepress/plugins/puppeteer-config.json')
const cliPath = join(
  process.cwd(),
  'node_modules/.bin',
  process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc'
)
let didInitialRender = false

function outputPath(source: string) {
  return join(outputDirectory, `${basename(source, '.mmd')}.svg`)
}

function trackedOutputPath(source: string) {
  return join(trackedOutputDirectory, `${basename(source, '.mmd')}.svg`)
}

function sourceHash(source: string) {
  return createHash('sha256').update(readFileSync(source)).digest('hex')
}

function readSourceHashes(): Record<string, string> {
  if (!existsSync(sourceHashesPath)) return {}
  return JSON.parse(readFileSync(sourceHashesPath, 'utf8')) as Record<string, string>
}

function writeSourceHashes(hashes: Record<string, string>) {
  writeFileSync(sourceHashesPath, `${JSON.stringify(hashes, null, 2)}\n`)
}

function renderDiagram(source: string) {
  execFileSync(
    cliPath,
    ['-i', source, '-o', outputPath(source), '-b', 'transparent', '-t', 'neutral', '-p', puppeteerConfig],
    {
      cwd: process.cwd(),
      stdio: 'inherit'
    }
  )
  mkdirSync(trackedOutputDirectory, { recursive: true })
  cpSync(outputPath(source), trackedOutputPath(source))
}

function renderAllDiagrams() {
  if (!existsSync(sourceDirectory)) return
  mkdirSync(outputDirectory, { recursive: true })
  mkdirSync(trackedOutputDirectory, { recursive: true })
  const hashes = readSourceHashes()
  for (const file of readdirSync(sourceDirectory).filter((file) => extname(file) === '.mmd')) {
    const source = join(sourceDirectory, file)
    const hash = sourceHash(source)
    const output = outputPath(source)
    const trackedOutput = trackedOutputPath(source)
    if (hashes[file] === hash && existsSync(trackedOutput)) {
      cpSync(trackedOutput, output)
      continue
    }
    // В CI (GitHub Actions) headless-браузер недоступен: не роняем сборку,
    // а используем уже закоммиченные SVG в public/diagrams.
    try {
      renderDiagram(source)
      hashes[file] = hash
    } catch (error) {
      if (!existsSync(output)) throw error
      console.warn(
        `[liapoldus-static-diagrams] Не удалось перегенерировать схему ${file};` +
          ` используется существующий ${output}: ${String(error)}`
      )
    }
  }
  writeSourceHashes(hashes)
}

/** Renders Mermaid sources before VitePress serves or builds static Markdown assets. */
export function diagramsPlugin(): Plugin {
  return {
    name: 'liapoldus-static-diagrams',
    buildStart() {
      if (didInitialRender) return
      renderAllDiagrams()
      didInitialRender = true
    },
    configureServer(server) {
      server.watcher.add(sourceDirectory)
      server.watcher.on('all', (event, file) => {
        if (!file.startsWith(sourceDirectory) || extname(file) !== '.mmd') return

        try {
          if (event === 'unlink') {
            rmSync(outputPath(file), { force: true })
            rmSync(trackedOutputPath(file), { force: true })
            const hashes = readSourceHashes()
            delete hashes[basename(file)]
            writeSourceHashes(hashes)
          } else if (event === 'add' || event === 'change') {
            renderDiagram(file)
            const hashes = readSourceHashes()
            hashes[basename(file)] = sourceHash(file)
            writeSourceHashes(hashes)
          } else {
            return
          }
          server.ws.send({ type: 'full-reload' })
        } catch (error) {
          server.config.logger.error(`Не удалось сгенерировать схему ${file}: ${String(error)}`)
        }
      })
    }
  }
}
