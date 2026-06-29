// SW v21
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE='agm-v21';
const ASSETS=['/','/index.html','/manifest.json','/icon-192.png','/escudo-inf.png','/academia_general_militar.jpg','/logo-ingenieros.jpg'];

// Firebase init en SW (necesario para FCM background)
firebase.initializeApp({
  apiKey:"AIzaSyA1KSfaNVrNsPXXGZoHHadUPcchsDBm5DE",
  authDomain:"agm-seccion.firebaseapp.com",
  projectId:"agm-seccion",
  storageBucket:"agm-seccion.firebasestorage.app",
  messagingSenderId:"1084982496386",
  appId:"1:1084982496386:web:5bc93f6f23524d91ea789b"
});
const messaging=firebase.messaging();

// FCM: mensajes en background (app cerrada)
messaging.onBackgroundMessage(payload=>{
  const {title,body,icon}=payload.notification||{};
  self.registration.showNotification(title||'SIGECAC',{
    body:body||'',
    icon:icon||'/icon-192.png',
    badge:'/icon-192.png',
    vibrate:[200,100,200],
    tag:payload.data&&payload.data.tag||'agm-notif',
    data:payload.data||{}
  });
});

// Cache
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

// Fetch: network-first con fallback a caché
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(!url.hostname.includes('localhost')&&!url.hostname.includes('github.io')&&!url.hostname.includes('githubusercontent'))return;
  e.respondWith(
    fetch(e.request).then(res=>{
      if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}
      return res;
    }).catch(()=>caches.match(e.request).then(cached=>cached||caches.match('/index.html')))
  );
});

// Periodic Background Sync: revisa recordatorios cada 15 min sin abrir la app
self.addEventListener('periodicsync',e=>{
  if(e.tag==='agm-reminders')e.waitUntil(checkScheduledNotifications());
});

// Clic en notificación: abre/enfoca la app
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
      const c=cs.find(x=>x.url.includes('agm-seccion'));
      if(c)return c.focus();
      return clients.openWindow('/agm-seccion/');
    })
  );
});

// Lee notificaciones programadas desde IndexedDB y dispara las que toca
async function checkScheduledNotifications(){
  try{
    const db=await openNotifDB();
    const notifs=await getAllNotifs(db);
    const now=Date.now();
    for(const n of notifs){
      if(n.fireAt<=now){
        await self.registration.showNotification(n.title,{
          body:n.body,icon:'/icon-192.png',badge:'/icon-192.png',
          vibrate:[200,100,200],tag:n.id,data:{id:n.id}
        });
        await deleteNotif(db,n.id);
      }
    }
  }catch(e){console.warn('checkScheduledNotifications error',e);}
}

function openNotifDB(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('agm-notifs',1);
    req.onupgradeneeded=e=>e.target.result.createObjectStore('notifs',{keyPath:'id'});
    req.onsuccess=e=>res(e.target.result);
    req.onerror=rej;
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
