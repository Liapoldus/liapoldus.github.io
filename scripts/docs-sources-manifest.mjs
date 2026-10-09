import { readFileSync } from 'node:fs'
import { load, JSON_SCHEMA } from 'js-yaml'

function invalid(message) {
  throw new Error(`Invalid docs-source manifest: ${message}`)
}

function object(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object`)
  if (Object.keys(value).some((key) => !keys.includes(key))) invalid(`${label} has unknown fields`)
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) invalid(`${label}.${key} is required`)
  }
}

function nonemptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) invalid(`${label} must be a nonempty array`)
}

function relativePath(value, label) {
  if (typeof value !== 'string' || !value.trim() || /[\\\x00-\x1f]/.test(value) ||
      value.startsWith('/') || /^[A-Za-z]:/.test(value) ||
      value.split('/').some((part) => !part || part === '.' || part === '..')) {
    invalid(`${label} must be a relative path without traversal`)
  }
}

export function parseDocsSources(text) {
  // JSON scalar rules keep revisions and paths free of implicit YAML date types.
  const manifest = load(text, { schema: JSON_SCHEMA })
  object(manifest, ['version', 'sources'], 'manifest')
  if (manifest.version !== 1) invalid('version must be 1')
  nonemptyArray(manifest.sources, 'sources')
  const names = new Set()
  for (const [index, source] of manifest.sources.entries()) {
    const label = `sources[${index}]`
    object(source, ['name', 'repository', 'ref', 'workspacePath', 'mappings'], label)
    if (typeof source.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(source.name)) {
      invalid(`${label}.name must be a safe checkout name`)
    }
    if (names.has(source.name)) invalid(`duplicate source name: ${source.name}`)
    names.add(source.name)
    let repository
    try { repository = new URL(source.repository) } catch { invalid(`${label}.repository must be an HTTPS URL`) }
    if (typeof source.repository !== 'string' || repository.protocol !== 'https:' ||
        !repository.hostname || repository.username || repository.password) {
      invalid(`${label}.repository must be an HTTPS URL without credentials`)
    }
    if (typeof source.ref !== 'string' || !/^[a-fA-F0-9]{40}$/.test(source.ref)) {
      invalid(`${label}.ref must be a pinned full commit SHA`)
    }
    relativePath(source.workspacePath, `${label}.workspacePath`)
    nonemptyArray(source.mappings, `${label}.mappings`)
    for (const [mappingIndex, mapping] of source.mappings.entries()) {
      const mappingLabel = `${label}.mappings[${mappingIndex}]`
      object(mapping, ['from', 'to'], mappingLabel)
      relativePath(mapping.from, `${mappingLabel}.from`)
      relativePath(mapping.to, `${mappingLabel}.to`)
    }
  }
  return manifest
}

export function readDocsSources(path) {
  return parseDocsSources(readFileSync(path, 'utf8'))
}
