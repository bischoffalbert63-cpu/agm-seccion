// SW v25
const CACHE='agm-v25';
const BASE='/agm-seccion';
const ASSETS=[BASE+'/manifest.json',BASE+'/icon-192.png'];
const ICON=BASE+'/icon-192.png';

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
  if(e.data&&e.data.type==='CHECK_NOTIFS')checkScheduledNotifications();
  if(e.data&&e.data.type==='TEST_NOTIF'){
    self.registration.showNotification('🔔 SIGECAC INGENIEROS',{
      body:'Notificación de prueba — '+new Date().toLocaleTimeString(),
      icon:ICON,badge:ICON,vibrate:[400,200,400],tag:'test'
    });
  }
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(!url.hostname.includes('localhost')&&!url.hostname.includes('github.io'))return;
  e.respondWith(
    fetch(e.request).then(res=>{
      if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}
      return res;
    }).catch(()=>caches.match(e.request).then(c=>c||caches.match(BASE+'/index.html')))
  );
});

self.addEventListener('periodicsync',e=>{
  if(e.tag==='agm-reminders')e.waitUntil(checkScheduledNotifications());
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
      const c=cs.find(x=>x.url.includes('agm-seccion'));
      if(c)return c.focus();
      return clients.openWindow(BASE+'/');
    })
  );
});

async function checkScheduledNotifications(){
  try{
    const db=await openNotifDB();
    const notifs=await getAllNotifs(db);
    const now=Date.now();
    for(const n of notifs){
      if(n.fireAt<=now){
        await self.registration.showNotification(n.title,{
          body:n.body,icon:ICON,badge:ICON,vibrate:[300,100,300],tag:String(n.id)
        });
        await deleteNotif(db,n.id);
      }
    }
  }catch(e){}
}

function openNotifDB(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('agm-notifs',1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore('notifs',{keyPath:'id'});
    req.onsuccess=e=>res(e.target.result);req.onerror=rej;
  });
}
function getAllNotifs(db){
  return new Promise((res,rej)=>{
    const tx=db.transaction('notifs','readonly');
    const req=tx.objectStore('notifs').getAll();
    req.onsuccess=e=>res(e.target.result);req.onerror=rej;
  });
}
function deleteNotif(db,id){
  return new Promise((res,rej)=>{
    const tx=db.transaction('notifs','readwrite');
    tx.objectStore('notifs').delete(id);tx.oncomplete=res;tx.onerror=rej;
  });
}
