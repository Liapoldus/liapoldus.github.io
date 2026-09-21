import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import type { Plugin } from 'vite'

const sourceDirectory = resolve(process.cwd(), 'diagrams')
const outputDirectory = resolve(process.cwd(), 'public/diagrams')
const cliPath = join(
  process.cwd(),
  'node_modules/.bin',
  process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc'
)
let didInitialRender = false

function outputPath(source: string) {
  return join(outputDirectory, `${basename(source, '.mmd')}.svg`)
}

function renderDiagram(source: string) {
  execFileSync(cliPath, ['-i', source, '-o', outputPath(source), '-b', 'transparent', '-t', 'neutral'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  })
}

function renderAllDiagrams() {
  if (!existsSync(sourceDirectory)) return
  mkdirSync(outputDirectory, { recursive: true })
  for (const file of readdirSync(sourceDirectory).filter((file) => extname(file) === '.mmd')) {
    renderDiagram(join(sourceDirectory, file))
  }
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
          } else if (event === 'add' || event === 'change') {
            renderDiagram(file)
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
