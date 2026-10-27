const C="wd25";
const OLD=["wd1","wd2","wd3","wd4","wd5","wd6","wd7","wd8","wd9","wd10","wd11","wd12","wd13","wd14","wd15","wd16","wd17","wd18","wd19","wd20","wd21","wd22","wd23","wd24"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","circles/abs-circle.png","circles/antitrainer-back-extension-circle.png","circles/antitrainer-dips-circle.png","circles/antitrainer-hammer-curl-circle.png","circles/antitrainer-scott-curl-circle.png","circles/antitrainer-smith-shoulder-press-circle.png","circles/barbell-bench-press-circle.png","circles/barbell-curl-circle.png","circles/bench-smith-circle.png","circles/cable-seated-row-circle.png","circles/cable-triceps-pushdown-handle-circle.png","circles/calf-machine-circle.png","circles/calf-raises-circle.png","circles/dumbbell-curl-circle.png","circles/dumbbell-lateral-raise-circle.png","circles/dumbbell-shrugs-circle.png","circles/glute-hack-squat-corrected-circle.png","circles/hack-squat-circle.png","circles/hammer-chest-press-circle.png","circles/horizontal-hammer-row-circle.png","circles/incline-dumbbell-curl-circle.png","circles/incline-dumbbell-row-circle.png","circles/leg-extension-circle.png","circles/machine-chest-fly-circle.png","circles/missing-assisted-pullup-circle.png","circles/missing-bent-barbell-row-circle.png","circles/missing-calf-leg-press-circle.png","circles/missing-face-pull-circle.png","circles/missing-french-press-circle.png","circles/missing-glute-bridge-circle.png","circles/missing-high-narrow-leg-press-circle.png","circles/missing-lat-pulldown-circle.png","circles/missing-leg-press-circle.png","circles/missing-lying-leg-curl-circle.png","circles/missing-narrow-pushup-circle.png","circles/missing-single-leg-press-circle.png","circles/missing-smith-squat-circle.png","circles/missing-wide-horizontal-row-circle.png","circles/one-arm-hammer-row-circle.png","circles/overhead-cable-triceps-extension-circle.png","circles/overhead-triceps-extension-circle.png","circles/pec-deck-fly-circle.png","circles/pull-ups-circle.png","circles/rear-delt-pec-deck-circle.png","circles/reverse-pec-deck-circle.png","circles/romanian-deadlift-circle.png","circles/seated-dumbbell-press-circle.png","circles/seated-leg-curl-circle.png","circles/smith-30-degree-press-circle.png","circles/smith-incline-bench-circle.png","circles/t-bar-row-circle.png","circles/two-arm-horizontal-row-circle.png","circles/unique-barbell-high-pull-circle.png","circles/unique-glute-bridge-circle.png","circles/unique-glute-hack-circle.png","circles/unique-hack-squat-circle.png","circles/unique-hammer-chest-circle.png","circles/unique-hammer-row-circle.png","circles/unique-lateral-raise-circle.png","circles/unique-lateral-standing-circle.png","circles/unique-machine-fly-circle.png","circles/unique-parallel-pullup-circle.png","circles/unique-scott-bench-circle.png","circles/unique-seated-barbell-press-circle.png","circles/unique-seated-leg-curl-variant-a-circle.png","circles/unique-seated-leg-curl-variant-b-circle.png","circles/unique-shrug-circle.png","circles/unique-smith-incline-circle.png","circles/unique-standing-barbell-curl-circle.png","circles/unique-triceps-block-circle.png","circles/unique-triceps-rope-circle.png","circles/unique-triceps-straight-handle-circle.png","circles/unique-two-arm-row-circle.png","circles/unique-upright-row-circle.png","circles/unique-vertical-pulldown-circle.png","circles/unique-wide-grip-bench-circle.png","circles/unique-wide-leg-press-circle.png","circles/wide-grip-dumbbell-row-circle.png"])).then(()=>self.skipWaiting()));
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
