import type {Database} from './database';
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function pushKeys(db:Database){
 const existing=await db.prepare('SELECT value FROM cache WHERE key=?').bind('pushkeys').first<{value:string}>();if(existing)return JSON.parse(existing.value);
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const data={public:b64(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),private:await crypto.subtle.exportKey('jwk',pair.privateKey)};
 await db.prepare('INSERT OR IGNORE INTO cache(key,value,updated) VALUES(?,?,?)').bind('pushkeys',JSON.stringify(data),Date.now()).run();
 return JSON.parse((await db.prepare('SELECT value FROM cache WHERE key=?').bind('pushkeys').first<{value:string}>())!.value);
}
export function validEndpoint(endpoint:string){try{const u=new URL(endpoint);return u.protocol==='https:'&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','wns2-bl2p.notify.windows.com'].some(h=>u.hostname===h)&&!u.username&&!u.password&&!u.port;}catch{return false;}}
export async function dispatchPush(db:Database){
 const row=await db.prepare('SELECT value,updated FROM cache WHERE key=?').bind('event').first<{value:string;updated:number}>();if(!row)return;
 const event=JSON.parse(row.value);const claim=await db.prepare('INSERT OR IGNORE INTO cache(key,value,updated) VALUES(?,?,?)').bind(`sent:${event.result.id}`,row.value,Date.now()).run();if(!claim.meta.changes)return;
 const keys=await pushKeys(db);const privateKey=await crypto.subtle.importKey('jwk',keys.private,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const subs=await db.prepare('SELECT endpoint,preferences FROM subscriptions LIMIT 500').all<{endpoint:string;preferences:string}>();
 await Promise.allSettled(subs.results.map(async sub=>{
 const prefs=JSON.parse(sub.preferences);if(!prefs[event.event]||!validEndpoint(sub.endpoint))return;
 const head=b64(new TextEncoder().encode(JSON.stringify({typ:'JWT',alg:'ES256'})));const body=b64(new TextEncoder().encode(JSON.stringify({aud:new URL(sub.endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,sub:process.env.PUSH_SUBJECT||process.env.SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:'https://localhost')})));
 const unsigned=`${head}.${body}`;const signature=b64(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},privateKey,new TextEncoder().encode(unsigned))));
 const response=await fetch(sub.endpoint,{method:'POST',headers:{Authorization:`vapid t=${unsigned}.${signature}, k=${keys.public}`,TTL:'60',Urgency:'high'},signal:AbortSignal.timeout(10000)});
 if(response.status===404||response.status===410)await db.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(sub.endpoint).run();
 }));
}
