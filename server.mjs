// Server lokal tanpa dependency. Root dapat dipilih untuk audit robots/sitemap.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';

const base = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const chosen = args.find(a => a.startsWith('--root='))?.slice(7) ?? '.';
if (!['.', 'starter', 'solusi'].includes(chosen)) throw new Error('Root harus ., starter, atau solusi.');
const root = path.resolve(base, chosen);
const port = Number(args.find(a => a.startsWith('--port='))?.slice(7) ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port tidak valid.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); return res.end('URL tidak valid'); }
    if (pathname.includes('\\') || pathname.includes('\0')) { res.writeHead(400); return res.end('URL tidak valid'); }
    let target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Akses ditolak'); }
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    const type = types[path.extname(target)];
    if (!type) { res.writeHead(403); return res.end('Jenis file tidak disajikan'); }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    res.writeHead(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500);
    res.end('Halaman tidak tersedia');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/ (root ${chosen})`));
