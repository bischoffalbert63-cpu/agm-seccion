// SW v22
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE='agm-v22';
const BASE='/agm-seccion';
const ASSETS=[BASE+'/',BASE+'/index.html',BASE+'/manifest.json',BASE+'/icon-192.png',BASE+'/escudo-inf.png',BASE+'/academia_general_militar.jpg',BASE+'/logo-ingenieros.jpg'];
const ICON=BASE+'/icon-192.png';

firebase.initializeApp({
  apiKey:"AIzaSyA1KSfaNVrNsPXXGZoHHadUPcchsDBm5DE",
  authDomain:"agm-seccion.firebaseapp.com",
  projectId:"agm-seccion",
  storageBucket:"agm-seccion.firebasestorage.app",
  messagingSenderId:"1084982496386",
  appId:"1:1084982496386:web:5bc93f6f23524d91ea789b"
});
const messaging=firebase.messaging();

// FCM: mensajes cuando la app está cerrada
messaging.onBackgroundMessage(payload=>{
  const n=payload.notification||{};
  self.registration.showNotification(n.title||'SIGECAC INGENIEROS',{
    body:n.body||'',
    icon:ICON,badge:ICON,
    vibrate:[300,100,300,100,300],
    requireInteraction:false,
    data:payload.data||{}
  });
});

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
  // La app puede pedir al SW que compruebe notificaciones ahora
  if(e.data&&e.data.type==='CHECK_NOTIFS')checkScheduledNotifications();
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(!url.hostname.includes('localhost')&&!url.hostname.includes('github.io')&&!url.hostname.includes('githubusercontent'))return;
  e.respondWith(
    fetch(e.request).then(res=>{
      if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}
      return res;
    }).catch(()=>caches.match(e.request).then(cached=>cached||caches.match(BASE+'/index.html')))
  );
});

// Periodic Background Sync — Chrome Android, app instalada en pantalla de inicio
self.addEventListener('periodicsync',e=>{
  if(e.tag==='agm-reminders')e.waitUntil(checkScheduledNotifications());
});

// Clic en notificación → abre/enfoca la app
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

// Lee IndexedDB y dispara las notificaciones que ya han llegado su hora
async function checkScheduledNotifications(){
  try{
    const db=await openNotifDB();
    const notifs=await getAllNotifs(db);
    const now=Date.now();
    for(const n of notifs){
      if(n.fireAt<=now){
        await self.registration.showNotification(n.title,{
          body:n.body,
          icon:ICON,badge:ICON,
          vibrate:[300,100,300,100,300],
          tag:String(n.id),
          requireInteraction:false
          // El sonido lo pone Android automáticamente con su tono de notificación
        });
        await deleteNotif(db,n.id);
      }
    }
  }catch(err){console.warn('[SW] checkScheduledNotifications error',err);}
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
