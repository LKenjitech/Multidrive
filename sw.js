// Mude o número da versão sempre que atualizar os arquivos, para o celular pegar a novidade.
const V = 'multidrive-v7';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const THREE = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(CORE);
    // guarda o 3D para funcionar sem internet (se estiver sem rede agora, guarda no primeiro acesso com internet)
    await Promise.all(THREE.map((u) => fetch(u, { mode: 'cors' }).then((r) => r.ok && c.put(u, r)).catch(() => {})));
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mine = url.origin === location.origin;
  if (!mine && url.hostname !== 'cdn.jsdelivr.net') return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    if (mine && !url.pathname.endsWith('.glb')) {
      // arquivos do app: tenta a internet primeiro (sempre pega a versão nova) e usa o guardado se estiver sem rede
      try {
        const r = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(no, 4000))]);
        if (r && r.ok) c.put(req, r.clone());
        return r;
      } catch (_) {
        const hit = await c.match(req, { ignoreSearch: true });
        return hit || (req.mode === 'navigate' ? await c.match('./index.html') : null) || Response.error();
      }
    }
    // modelo 3D e biblioteca 3D: usa o guardado primeiro
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r; } catch (_) { return Response.error(); }
  })());
});
