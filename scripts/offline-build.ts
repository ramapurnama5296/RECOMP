import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

export async function writeServiceWorker(output: string) {
  const files = (await readdir(output, { recursive: true, withFileTypes: true }))
    .filter(item => item.isFile() && item.name !== 'sw.js' && !item.name.endsWith('.map'))
    .map(item => relative(output, resolve(item.parentPath, item.name)).replaceAll('\\', '/')).sort()
  const template = await readFile(new URL('service-worker.js', import.meta.url), 'utf8')
  const hash = createHash('sha256').update(template)
  for (const file of files) hash.update(file).update(await readFile(resolve(output, file)))
  const worker = template.replace('BUILD_ID', hash.digest('hex').slice(0, 16))
    .replace('const FILES = PRECACHE_FILES;', 'const FILES = ' + JSON.stringify(files) + ';')
  await writeFile(resolve(output, 'sw.js'), worker)
}
