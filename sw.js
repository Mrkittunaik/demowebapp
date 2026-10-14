/* Freshly service worker: cache-first app shell, stale-while-revalidate for the rest */
const V='freshly-v7',SHELL=['./','index.html','css/style.css','css/glass.css','js/data.js','js/icons.js','js/location.js','js/app.js','images/cat-vegetables.jpg','images/cat-fruits.jpg','images/cat-dairy.jpg','images/cat-staples.jpg','images/cat-snacks.jpg','images/cat-beverages.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return; /* map tiles / APIs go straight to network */
  e.respondWith(caches.open(V).then(c=>c.match(r).then(hit=>{
    const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}).catch(()=>hit);
    return hit||net})))});
