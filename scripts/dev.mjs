// Dev server: builds, serves dist/ with live reload, rebuilds on changes.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from './build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT) || 5173;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.txt': 'text/plain' };
const clients = new Set();

const rebuild = async () => {
  try {
    await build({ dev: true });
    clients.forEach((res) => res.write('data: reload\n\n'));
    console.log(new Date().toLocaleTimeString(), 'rebuilt');
  } catch (e) {
    console.error('Build failed:', e.message);
  }
};
await build({ dev: true });

let timer;
for (const dir of ['content', 'src', 'scripts']) {
  watch(path.join(root, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 80);
  });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__reload') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(dist, path.normalize(p));
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    try {
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    }
  })
  .listen(port, () => console.log(`Dev server: http://localhost:${port}`));
