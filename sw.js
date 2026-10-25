const C="wd19";
const OLD=["wd1","wd2","wd3","wd4","wd5","wd6","wd7","wd8","wd9","wd10","wd11","wd12","wd13","wd14","wd15","wd16","wd17","wd18"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html"])).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.pathname.startsWith("/api"))return;
  e.respondWith(
    fetch(e.request).then(r=>{
      const k=r.clone();
      caches.open(C).then(c=>c.put(e.request,k));
      return r;
    }).catch(()=>caches.match(e.request))
  );
});
self.addEventListener("push",e=>{
  let data={title:"Моя тренировка",body:"Время отдыха закончилось",url:"/"};
  try{data={...data,...(e.data?e.data.json():{})}}catch(_){if(e.data)data.body=e.data.text()}
  e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"./icon-192.png",badge:"./icon-192.png",tag:data.tag||"workout",renotify:true,silent:false,requireInteraction:true,data:{url:data.url}}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list)if("focus" in c)return c.focus();
    return clients.openWindow(e.notification.data?.url||"/");
  }));
});
