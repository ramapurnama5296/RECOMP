import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { pagesBase } from '../../scripts/pages-base.ts'

const dist = resolve('dist')
const base = pagesBase()
await stat(resolve(dist, 'index.html'))
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
}
let revision = 0

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4174')
  if (url.pathname === '/__test/release' && request.method === 'POST') {
    revision++
    response.writeHead(204).end()
    return
  }
  if (!url.pathname.startsWith(base)) {
    response.writeHead(404).end()
    return
  }
  try {
    const file = resolve(dist, decodeURIComponent(url.pathname.slice(base.length)) || 'index.html')
    if (!file.startsWith(dist + sep)) throw new Error('Outside dist')
    const content = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    if (revision && file === resolve(dist, 'sw.js')) {
      response.end(content.toString().replace(/const CACHE = PREFIX \+ '[a-f0-9]+';/, `const CACHE = PREFIX + 'test-${revision}';`))
    } else response.end(content)
  } catch {
    response.writeHead(404).end()
  }
}).listen(4174, '127.0.0.1')
