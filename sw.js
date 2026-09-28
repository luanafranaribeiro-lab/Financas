/* Financas — deixa o app abrir sem internet.
   A página é buscada na internet primeiro (pra pegar as atualizações);
   se não tiver conexão, usa a última cópia guardada no celular. */
const CACHE = 'financas-v1';
const BASE = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const guardar = (req, res) => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.hostname.endsWith('supabase.co')) return; // dados sempre pela internet (o app guarda a cópia dele)

  // a página do app: internet primeiro, cópia se estiver sem conexão
  if (req.mode === 'navigate' || u.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(r => guardar(req, r))
        .catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  // biblioteca e fontes: cópia primeiro (não mudam)
  if (u.hostname === 'cdn.jsdelivr.net' || u.hostname.endsWith('googleapis.com') || u.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => guardar(req, r))));
  }
});
