const OFFLINE='observatorio-offline-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(OFFLINE).then(c=>c.addAll(['/offline.html','/app-icon.svg']))));
self.addEventListener('activate',event=>event.waitUntil(clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));});
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data;try{data=await (await fetch('/api/events',{cache:'no-store'})).json();}catch{data={message:'Abra o Observatório para consultar a atualização.'};}
 const labels={winner:'Resultado confirmado pelo TSE',mathematical:'Vantagem numericamente irreversível',lead:'Mudança na liderança',margin:'Mudança na vantagem',progress:'Atualização da apuração'};
 await self.registration.showNotification(labels[data.event]||'Observatório • Eleições',{body:data.victory?.message||data.message||'Novos dados oficiais disponíveis.',icon:'/app-icon-192.png',badge:'/app-icon-192.png',tag:data.result?.id||'election-update',data:{url:'/?tab=live'}});
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.openWindow(event.notification.data?.url||'/'));});
