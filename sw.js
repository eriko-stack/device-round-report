const CACHE='device-round-v5-direct-pdf';
const FILES=['./','./index.html','./style.css','./model.js','./app.js','./pdf-local.js','./manifest.webmanifest','./icon.svg'];
const URLS=FILES.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'}))))
    .then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('device-round-')&&key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!URLS.includes(url.href))return;
  event.respondWith(fetch(new Request(event.request,{cache:'no-cache'})).then(response=>{
    if(!response.ok)throw Error('offline');
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
    return response;
  }).catch(async()=>{
    const cached=await caches.open(CACHE).then(cache=>cache.match(event.request));
    if(cached)return cached;
    return new Response('オフラインです。オンラインで一度開いてください。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }));
});
