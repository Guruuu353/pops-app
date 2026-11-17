const V='pops-__V__',TILES='pops-tiles-v1';
const SHELL=['/','/app.js','/styles.css','/logo.png','/logo-sm.png','/manifest.webmanifest','/icon-192.png','/icon-512.png'];
const LIBS=['https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js','https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js','https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.umd.js'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(V);await c.addAll(SHELL);await Promise.all(LIBS.map(u=>fetch(u,{mode:'cors'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})));self.skipWaiting();})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V&&k!==TILES)await caches.delete(k);await self.clients.claim();})());});
const isTile=u=>/server\.arcgisonline\.com|tile\.openstreetmap\.org/.test(u.hostname);
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(isTile(u)){e.respondWith((async()=>{const c=await caches.open(TILES);const hit=await c.match(r.url);if(hit)return hit;try{const n=await fetch(r.url,{mode:'cors'});if(n.ok)c.put(r.url,n.clone());return n;}catch(x){return new Response('',{status:504});}})());return;}
 if(u.origin===location.origin&&u.pathname.startsWith('/api/'))return;   // records are never cached
 if(r.mode==='navigate'){e.respondWith(fetch(r).catch(()=>caches.match('/')));return;}
 if(u.origin===location.origin||LIBS.includes(r.url)||/fonts\.(googleapis|gstatic)\.com/.test(u.hostname)){e.respondWith((async()=>{const c=await caches.open(V);const hit=await c.match(r);const net=fetch(r).then(n=>{if(n.ok||n.type==='opaque')c.put(r,n.clone());return n;}).catch(()=>hit);return hit||net;})());}
});
