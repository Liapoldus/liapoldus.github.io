import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { dump } from 'js-yaml'
import { parseDocsSources, readDocsSources } from './docs-sources-manifest.mjs'

const valid = `version: 1
sources:
  - name: example
    repository: https://github.com/Liapoldus/example.git
    ref: '0123456789012345678901234567890123456789'
    workspacePath: plugins/example
    mappings:
      - from: docs/site/example.md
        to: plugins/example.md
`

test('YAML parser preserves manifest shape and scalar strings', () => {
  assert.deepEqual(parseDocsSources(valid), {
    version: 1,
    sources: [{
      name: 'example',
      repository: 'https://github.com/Liapoldus/example.git',
      ref: '0123456789012345678901234567890123456789',
      workspacePath: 'plugins/example',
      mappings: [{ from: 'docs/site/example.md', to: 'plugins/example.md' }]
    }]
  })
})

test('root YAML manifest contains only full pinned source revisions', () => {
  const manifest = readDocsSources(new URL('../docs-sources.yaml', import.meta.url))
  assert.equal(manifest.version, 1)
  assert.ok(manifest.sources.length > 0)
  for (const source of manifest.sources) {
    assert.match(source.ref, /^[a-fA-F0-9]{40}$/)
    assert.ok(source.mappings.length > 0)
  }
})

test('file reader reads YAML and reports a missing manifest', () => {
  const directory = mkdtempSync(join(tmpdir(), 'docs-manifest-'))
  try {
    const path = join(directory, 'sources.yaml')
    writeFileSync(path, valid)
    assert.deepEqual(readDocsSources(path), parseDocsSources(valid))
    assert.throws(() => readDocsSources(join(directory, 'missing.yaml')), { code: 'ENOENT' })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

for (const [name, text] of [
  ['empty YAML', ''],
  ['null YAML', 'null'],
  ['scalar root', 'manifest'],
  ['array root', '[]'],
  ['broken YAML', 'sources: ['],
  ['duplicate YAML keys', 'version: 1\nversion: 1\nsources: []'],
  ['multiple YAML documents', `${valid}\n---\n${valid}`]
]) {
  test(`rejects ${name}`, () => assert.throws(() => parseDocsSources(text)))
}

for (const [name, mutate] of [
  ['unsupported version', (m) => { m.version = 2 }],
  ['string version', (m) => { m.version = '1' }],
  ['unknown root field', (m) => { m.extra = true }],
  ['missing sources', (m) => { delete m.sources }],
  ['non-array sources', (m) => { m.sources = {} }],
  ['empty sources', (m) => { m.sources = [] }],
  ['non-object source', (m) => { m.sources = [null] }],
  ['duplicate source name', (m) => { m.sources.push(structuredClone(m.sources[0])) }],
  ['unsafe source name', (m) => { m.sources[0].name = '../example' }],
  ['unknown source field', (m) => { m.sources[0].extra = true }],
  ['missing revision', (m) => { delete m.sources[0].ref }],
  ['floating revision', (m) => { m.sources[0].ref = 'main' }],
  ['short revision', (m) => { m.sources[0].ref = '0123456' }],
  ['numeric revision', (m) => { m.sources[0].ref = 1234567890 }],
  ['invalid SHA characters', (m) => { m.sources[0].ref = 'g'.repeat(40) }],
  ['invalid repository', (m) => { m.sources[0].repository = 'example' }],
  ['non-HTTPS repository', (m) => { m.sources[0].repository = 'http://example.com/repo.git' }],
  ['repository credentials', (m) => { m.sources[0].repository = 'https://user:secret@example.com/repo.git' }],
  ['workspace traversal', (m) => { m.sources[0].workspacePath = '../example' }],
  ['absolute workspace', (m) => { m.sources[0].workspacePath = '/example' }],
  ['non-array mappings', (m) => { m.sources[0].mappings = {} }],
  ['empty mappings', (m) => { m.sources[0].mappings = [] }],
  ['non-object mapping', (m) => { m.sources[0].mappings = [null] }],
  ['unknown mapping field', (m) => { m.sources[0].mappings[0].extra = true }],
  ['missing mapping target', (m) => { delete m.sources[0].mappings[0].to }],
  ['mapping traversal', (m) => { m.sources[0].mappings[0].from = 'docs/../../example' }],
  ['absolute mapping', (m) => { m.sources[0].mappings[0].to = '/example' }],
  ['Windows absolute mapping', (m) => { m.sources[0].mappings[0].to = 'C:/example' }],
  ['backslash mapping', (m) => { m.sources[0].mappings[0].to = 'docs\\example' }],
  ['empty mapping path', (m) => { m.sources[0].mappings[0].to = '' }],
  ['non-string mapping path', (m) => { m.sources[0].mappings[0].to = 42 }]
]) {
  test(`rejects ${name}`, () => {
    const manifest = parseDocsSources(valid)
    mutate(manifest)
    assert.throws(() => parseDocsSources(dump(manifest)), /Invalid docs-source manifest:/)
  })
}
