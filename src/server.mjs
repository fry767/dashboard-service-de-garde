import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.mjs';
import { PortalCollector } from './scraper.mjs';
import { PORTAL_ORIGIN, parseQuantity, registrationKey } from './extract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.resolve(process.env.DATA_DIR || path.join(root, '.local'));
const store = new Store(directory);
const collector = new PortalCollector(directory, store);
const port = Number(process.env.PORT || 3210);
const origin = `http://127.0.0.1:${port}`;
let connecting = false;
let collectorVersion = '';
async function refreshCollectorCode() {
  if (collector.busy || connecting) return;
  const files = await Promise.all(['scraper.mjs','extract.mjs'].map(name => stat(path.join(root,'src',name))));
  const version = files.map(file => file.mtimeMs).join('-');
  if (version === collectorVersion) return;
  const { PortalCollector: UpdatedCollector } = await import(`./scraper.mjs?v=${version}`);
  Object.setPrototypeOf(collector, UpdatedCollector.prototype);
  collectorVersion = version;
}

function json(response, status, data) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(data)); }
async function body(request) {
  let text = '';
  for await (const chunk of request) { text += chunk; if (text.length > 20000) throw new Error('La demande est trop volumineuse.'); }
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (request, response) => {
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(request.headers.host)) return json(response, 403, { error: 'Accès local uniquement.' });
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const url = new URL(request.url, origin);
    if (url.pathname.startsWith('/api/')) await refreshCollectorCode();
    if (request.method === 'GET' && url.pathname === '/api/history') return json(response, 200, await store.read());
    if (request.method === 'GET' && url.pathname === '/api/status') return json(response, 200, await collector.status());
    if (request.method === 'POST') {
      if (request.headers.origin !== origin && request.headers.origin !== `http://localhost:${port}`) return json(response, 403, { error: 'Ouvrez le tableau de bord local pour utiliser cette action.' });
      if (!request.headers['content-type']?.startsWith('application/json')) return json(response, 415, { error: 'Des données au format JSON sont requises.' });
      if (url.pathname === '/api/connect') {
        if (connecting || collector.busy) return json(response, 409, { error: 'Le navigateur est déjà occupé.' });
        connecting = true;
        json(response, 202, { accepted: true });
        collector.connect().catch(() => {}).finally(() => { connecting = false; });
        return;
      }
      if (url.pathname === '/api/collect') {
        if (connecting || collector.busy) return json(response, 409, { error: 'Une collecte ou une connexion est déjà en cours.' });
        json(response, 202, { accepted: true });
        collector.collect().catch(error => collector.update('error', error.message.split('\n')[0]));
        return;
      }
      if (url.pathname === '/api/inspect') return json(response, 200, await collector.inspectOpen());
      if (url.pathname === '/api/reading') {
        const value = await body(request);
        if (collector.busy) return json(response, 409, { error: 'Veuillez attendre la fin de la collecte.' });
        if (typeof value.daycare !== 'string' || !value.daycare.trim() || value.daycare.length > 200) throw new Error('Saisissez le nom du service de garde.');
        const ahead = parseQuantity(String(value.quantity || ''));
        if (!ahead) throw new Error('Saisissez un nombre ou un intervalle, par exemple 42, 11–50 ou 201+.');
        const source = new URL(value.sourceUrl || PORTAL_ORIGIN);
        if (source.origin !== PORTAL_ORIGIN) throw new Error('Le relevé doit provenir du portail des services de garde.');
        const child = String(value.child || '').trim().slice(0,100);
        const sourceKey = registrationKey(source.href, value.sourceUrl && source.pathname !== '/' ? source.href : `manual:${value.daycare.trim()}:${child}`);
        const snapshot = await store.save([{ daycare: value.daycare.trim(), child, ageGroup: '', ahead, sourceKey, sourceUrl: source.href, capturedAt: new Date().toISOString(), manual: true }], ['Ce relevé contient une seule demande. Les autres demandes n’ont pas été actualisées.']);
        return json(response, 200, snapshot);
      }
      return json(response, 404, { error: 'Action inconnue.' });
    }
    if (request.method !== 'GET') return json(response, 405, { error: 'Méthode non autorisée.' });
    const assets = { '/': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/styles.css': ['styles.css','text/css'] };
    const asset = assets[url.pathname];
    if (!asset) return json(response, 404, { error: 'Ressource introuvable.' });
    response.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    response.end(await readFile(path.join(root, 'public', asset[0])));
  } catch (error) { if (!response.headersSent) json(response, 400, { error: error.message }); else response.end(); }
});

server.listen(port, '127.0.0.1', () => console.log(`Tableau de bord des services de garde : ${origin}`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Le port ${port} est occupé. Modifiez la variable PORT ou ouvrez ${origin}.` : error.message); process.exitCode = 1; });
async function shutdown() { await collector.close().catch(() => {}); server.close(() => process.exit()); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
