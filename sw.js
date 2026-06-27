// SW v19
const CACHE='agm-v19';
const ASSETS=['/','/index.html','/manifest.json','/icon-192.png','/escudo-inf.png','/academia_general_militar.jpg','/logo-ingenieros.jpg'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // No interceptar Firebase ni CDN externos
  if(!url.hostname.includes('localhost')&&!url.hostname.includes('github.io')&&!url.hostname.includes('githubusercontent'))return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const network=fetch(e.request).then(res=>{
        if(res.ok){caches.open(CACHE).then(c=>c.put(e.request,res.clone()));}
        return res;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});
