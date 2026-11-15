import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { writeServiceWorker } from '../scripts/offline-build.ts'
import { pagesBase } from '../scripts/pages-base.ts'

test('manifest includes correctly sized local icons and the HTML references the configured Pages base', async () => {
  const publicPath = new URL('../public/', import.meta.url)
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', publicPath), 'utf8'))
  assert.equal(manifest.name, 'RECOMP')
  assert.equal(manifest.start_url, './')
  assert.equal(manifest.scope, './')
  assert.equal(manifest.display, 'standalone')
  assert.ok(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable'))
  for (const icon of [...manifest.icons, { src: 'icons/apple-touch.png', sizes: '180x180' }]) {
    const png = await readFile(new URL(icon.src, publicPath))
    assert.equal(png.toString('ascii', 12, 16), 'IHDR')
    assert.equal(png.readUInt32BE(16) + 'x' + png.readUInt32BE(20), icon.sizes)
  }
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(html, /viewport-fit=cover/)
  assert.match(html, /%BASE_URL%manifest\.webmanifest/)
  assert.match(html, /%BASE_URL%icons\/apple-touch\.png/)
})

test('Pages uses the repository name with its original capitalization', () => {
  assert.equal(pagesBase('example/RECOMP'), '/RECOMP/')
  assert.equal(pagesBase('example/recomp'), '/recomp/')
  assert.equal(pagesBase(''), '/recomp/')
})

test('build generates a versioned worker that precaches the scoped shell and updates only its own cache', async () => {
  const output = await mkdtemp(join(tmpdir(), 'recomp-release-'))
  try {
    await mkdir(join(output, 'assets'))
    await writeFile(join(output, 'index.html'), 'shell')
    await writeFile(join(output, 'assets', 'app.js'), 'app')
    await writeServiceWorker(output)
    const workerPath = join(output, 'sw.js')
    const first = await readFile(workerPath, 'utf8')
    await writeServiceWorker(output)
    assert.equal(await readFile(workerPath, 'utf8'), first)
    await writeFile(join(output, 'assets', 'app.js'), 'updated app')
    await writeServiceWorker(output)
    const worker = await readFile(workerPath, 'utf8')
    assert.notEqual(first, worker)

    const scope = 'https://example.test/recomp/'
    const prefix = 'recomp-shell:' + scope + ':'
    const functions = new Map<string, (event: WorkerEvent) => void>()
    const cached = new Set<string>()
    const removed: string[] = []
    let claimed = false
    let activated = false
    const cacheKey = prefix + worker.match(/const CACHE = PREFIX \+ '([a-f0-9]+)'/)?.[1]
    const cache = {
      addAll: async (items: Request[]) => { for (const item of items) cached.add(item.url) },
      match: async (item: string | Request) => cached.has(typeof item === 'string' ? item : item.url) ? 'cached' : undefined,
    }
    runInNewContext(worker, {
      URL, Request,
      self: {
        registration: { scope },
        addEventListener: (name: string, listener: (event: WorkerEvent) => void) => functions.set(name, listener),
        skipWaiting: async () => { activated = true },
        clients: { claim: async () => { claimed = true } },
      },
      caches: {
        open: async (key: string) => { assert.equal(key, cacheKey); return cache },
        keys: async () => [prefix + 'old', cacheKey, 'another-app'],
        delete: async (key: string) => { removed.push(key) },
      },
      fetch: async () => { throw new Error('Offline') },
    })
    await dispatch('install')
    assert.deepEqual([...cached].sort(), [scope + 'assets/app.js', scope + 'index.html'])
    await dispatch('message', { data: 'ACTIVATE_UPDATE' })
    await dispatch('activate')
    assert.equal(activated, true)
    assert.equal(claimed, true)
    assert.deepEqual(removed, [prefix + 'old'])
    assert.equal(await dispatch('fetch', { request: { url: scope, method: 'GET', mode: 'navigate' } }), 'cached')
    assert.equal(await dispatch('fetch', { request: { url: scope + 'assets/app.js', method: 'GET', mode: 'same-origin' } }), 'cached')
    assert.equal(await dispatch('fetch', { request: { url: 'https://example.test/other/', method: 'GET', mode: 'navigate' } }), undefined)

    function dispatch(name: string, options: Pick<WorkerEvent, 'request' | 'data'> = {}) {
      let pending: Promise<unknown> | undefined
      const capture = (value: Promise<unknown>) => { pending = value }
      functions.get(name)!({ ...options, waitUntil: capture, respondWith: capture })
      return pending
    }
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

interface WorkerEvent {
  request?: { url: string; method: string; mode: string }
  data?: string
  waitUntil: (value: Promise<unknown>) => void
  respondWith: (value: Promise<unknown>) => void
}
