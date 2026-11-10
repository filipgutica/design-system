// Serves site/ under /design-system/, as GitHub Pages does, so a link that leaves the folder 404s.
//   node tests/site/serve.mjs <port>
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const site = fileURLToPath(new URL('../../site/', import.meta.url))
const types = { '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.md': 'text/markdown', '.woff2': 'font/woff2' }
const prefix = '/design-system/'

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const file = path.startsWith(prefix) ? normalize(path.slice(prefix.length) || 'index.html') : null
  try {
    if (!file || file.startsWith('..')) throw new Error('outside site/')
    const body = await readFile(`${site}${file.endsWith('/') ? `${file}index.html` : file}`)
    response.writeHead(200, { 'content-type': `${types[extname(file)] ?? 'application/octet-stream'}; charset=utf-8` }).end(body)
  } catch {
    response.writeHead(404).end('Not found')
  }
}).listen(Number(process.argv[2]), '127.0.0.1')
