const OFFLINE='observatorio-offline-v2';
self.addEventListener('install',event=>event.waitUntil(caches.open(OFFLINE).then(c=>c.addAll(['/offline.html','/app-icon.svg'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));});
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data;try{data=event.data?event.data.json():await (await fetch('/api/events',{cache:'no-store'})).json();}catch{data={message:'Abra o Observatório para consultar a atualização.'};}
 const labels={winner:'Resultado confirmado pelo TSE',mathematical:'Vantagem numericamente irreversível',lead:'Mudança na liderança',margin:'Mudança na vantagem',progress:'Atualização da apuração'};
 await self.registration.showNotification(data.title||labels[data.event]||'Observatório • Eleições',{body:data.body||data.victory?.message||data.message||'Novos dados oficiais disponíveis.',icon:'/app-icon-192.png',badge:'/app-icon-192.png',tag:data.id||data.result?.id||'election-update',data:{url:data.url?.startsWith('/?')?data.url:'/?tab=live'}});
 if(data.id?.startsWith('test:')){try{const sub=await self.registration.pushManager.getSubscription();if(sub)await fetch('/api/push/receipt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint,id:data.id})});}catch{}}
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow(event.notification.data?.url||'/'));});
