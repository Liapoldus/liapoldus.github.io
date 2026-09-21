import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { load } from 'js-yaml'
import type { Plugin } from 'vite'

const virtualModuleId = 'virtual:management-openapi'
const resolvedVirtualModuleId = `\0${virtualModuleId}`
const sourceFile = resolve(process.cwd(), 'public/spec/management.openapi.yaml')

/** Exposes the canonical OpenAPI YAML to the small in-app reference component. */
export function openApiSpecPlugin(): Plugin {
  return {
    name: 'liapoldus-openapi-spec',
    resolveId(id) {
      return id === virtualModuleId ? resolvedVirtualModuleId : undefined
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) return undefined
      const spec = load(readFileSync(sourceFile, 'utf8'))
      return `export default ${JSON.stringify(spec)}`
    },
    configureServer(server) {
      server.watcher.add(sourceFile)
      server.watcher.on('change', (file) => {
        if (file !== sourceFile) return
        const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      })
    }
  }
}
