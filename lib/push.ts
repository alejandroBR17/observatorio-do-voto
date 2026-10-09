import type {Database} from './database';
import webpush from 'web-push';
import {createHash} from 'node:crypto';
import {alertPreferences,type AlertType} from './alerts';
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function pushKeys(db:Database){
 const existing=await db.prepare('SELECT value FROM cache WHERE key=?').bind('pushkeys').first<{value:string}>();if(existing)return JSON.parse(existing.value);
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const data={public:b64(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),private:await crypto.subtle.exportKey('jwk',pair.privateKey)};
 await db.prepare('INSERT OR IGNORE INTO cache(key,value,updated) VALUES(?,?,?)').bind('pushkeys',JSON.stringify(data),Date.now()).run();
 return JSON.parse((await db.prepare('SELECT value FROM cache WHERE key=?').bind('pushkeys').first<{value:string}>())!.value);
}
export function validEndpoint(endpoint:string){try{const u=new URL(endpoint);const trusted=u.hostname==='fcm.googleapis.com'||['push.apple.com','push.services.mozilla.com','notify.windows.com'].some(h=>u.hostname.endsWith('.'+h));return u.protocol==='https:'&&trusted&&!u.username&&!u.password&&!u.port;}catch{return false;}}
export function validSubscription(value:unknown):value is webpush.PushSubscription{
 const s=value as webpush.PushSubscription|undefined;
 if(!s||typeof s.endpoint!=='string'||s.endpoint.length>2000||!validEndpoint(s.endpoint)||typeof s.keys?.auth!=='string'||typeof s.keys?.p256dh!=='string')return false;
 try{const auth=Buffer.from(s.keys.auth,'base64url'),key=Buffer.from(s.keys.p256dh,'base64url');return /^[A-Za-z0-9_-]+={0,2}$/.test(s.keys.auth)&&/^[A-Za-z0-9_-]+={0,2}$/.test(s.keys.p256dh)&&auth.length===16&&key.length===65&&key[0]===4;}catch{return false;}
}
export type PushEvent={id:string;types:AlertType[];title:string;body:string;url:string;urgent?:boolean};
export const eventId=(prefix:string,value:string)=>prefix+':'+createHash('sha256').update(value).digest('hex');
export async function queuePush(db:Database,event:PushEvent){await db.prepare('INSERT OR IGNORE INTO push_events(id,value,created) VALUES(?,?,?)').bind(event.id,JSON.stringify(event),Date.now()).run();}
export async function sendPush(db:Database,subscription:webpush.PushSubscription,event:PushEvent){
 if(!validSubscription(subscription))throw Error('Invalid subscription');const keys=await pushKeys(db);
 return webpush.sendNotification(subscription,JSON.stringify({id:event.id,title:event.title,body:event.body,url:event.url}),{vapidDetails:{subject:process.env.PUSH_SUBJECT||process.env.SITE_URL||'https://observatorio-voto.vercel.app',publicKey:keys.public,privateKey:keys.private.d},TTL:3600,urgency:event.urgent?'high':'normal',timeout:10000});
}
export async function dispatchPush(db:Database,send=sendPush){
 const now=Date.now(),lease=await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?').bind('lease:push','',now,now-60000).run();if(!lease.meta.changes)return;
 try{
 const events=await db.prepare("SELECT e.id,e.value,e.created FROM push_events e WHERE e.created>? AND EXISTS(SELECT 1 FROM subscriptions s JOIN subscription_keys k ON k.endpoint=s.endpoint LEFT JOIN push_deliveries d ON d.endpoint=s.endpoint AND d.event_id=e.id WHERE k.created<=e.created AND (d.event_id IS NULL OR (d.status='retry' AND d.updated<? AND d.attempts<3))) ORDER BY json_extract(e.value,'$.urgent') DESC,e.created DESC LIMIT 10").bind(now-86400000,now-60000).all<{id:string;value:string;created:number}>();
 let budget=100;
 for(const row of events.results){if(!budget)break;const event=JSON.parse(row.value) as PushEvent;
 const subs=await db.prepare("SELECT s.endpoint,s.preferences,k.value FROM subscriptions s JOIN subscription_keys k ON k.endpoint=s.endpoint LEFT JOIN push_deliveries d ON d.endpoint=s.endpoint AND d.event_id=? WHERE k.created<=? AND (d.event_id IS NULL OR (d.status='retry' AND d.updated<? AND d.attempts<3)) ORDER BY s.endpoint LIMIT ?").bind(row.id,row.created,now-60000,budget).all<{endpoint:string;preferences:string;value:string}>();
 budget-=subs.results.length;
 for(let start=0;start<subs.results.length;start+=20)await Promise.allSettled(subs.results.slice(start,start+20).map(async sub=>{
 const prefs=alertPreferences(JSON.parse(sub.preferences)),wanted=event.types.some(t=>prefs[t]);let status='skipped';
 if(wanted){try{await send(db,JSON.parse(sub.value),event);status='sent';}catch(e){const code=(e as {statusCode?:number}).statusCode;if(code===404||code===410){await db.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(sub.endpoint).run();await db.prepare('DELETE FROM subscription_keys WHERE endpoint=?').bind(sub.endpoint).run();status='expired';}else status='retry';}}
 await db.prepare('INSERT INTO push_deliveries(event_id,endpoint,status,updated,attempts) VALUES(?,?,?,?,1) ON CONFLICT(event_id,endpoint) DO UPDATE SET status=excluded.status,updated=excluded.updated,attempts=push_deliveries.attempts+1').bind(row.id,sub.endpoint,status,Date.now()).run();
 }));
 }
 await db.prepare('DELETE FROM push_deliveries WHERE updated<?').bind(now-172800000).run();await db.prepare('DELETE FROM push_events WHERE created<?').bind(now-172800000).run();
 }finally{await db.prepare('UPDATE cache SET updated=0 WHERE key=? AND updated=?').bind('lease:push',now).run();}
}
