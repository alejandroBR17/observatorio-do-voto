import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import webpush from 'web-push';
import {createDatabase} from '../lib/database';
import {queuePush,dispatchPush,validSubscription} from '../lib/push';
import {resultAlertTypes,alertPreferences} from '../lib/alerts';
import {queueContentAlerts} from '../lib/content-alerts';
import type {Result} from '../lib/elections';
const result=(gap:number):Result=>({candidates:[{number:'22',percent:50+gap/2,votes:100, name:'Flávio'},{number:'13',percent:50-gap/2,votes:99,name:'Lula'}].sort((a,b)=>b.percent-a.percent)} as Result);
test('victory, lead and cumulative margin alerts coexist; no repeat victory on subsequent results',()=>{
 const prior=result(-0.4),current=result(0.6);
 assert.deepEqual(resultAlertTypes(current,prior,'official','partial'),['winner','lead','margin','progress']);
 assert.deepEqual(resultAlertTypes(current,current,'official','official'),['progress']);
 assert.ok(resultAlertTypes(result(1.1),result(0.9),'partial','partial',0.5).includes('margin'));
 assert.ok(!resultAlertTypes(result(0.99),result(0.9),'partial','partial',0.5).includes('margin'));
 assert.equal(alertPreferences({coverage:true,lead:false}).coverage,true);assert.equal(alertPreferences({lead:false}).lead,false);
});
test('push queue retries transient failures, matches any chosen category, suppresses duplicates and deletes expired subscriptions',async()=>{
 const client=createClient({url:'file::memory:'}),db=createDatabase(client),key=webpush.generateVAPIDKeys().publicKey;
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:key,auth:Buffer.alloc(16,1).toString('base64url')}};assert.equal(validSubscription(subscription),true);assert.equal(validSubscription({...subscription,keys:{...subscription.keys,auth:'bad'}}),false);
 try{
 await db.prepare('INSERT INTO subscriptions(endpoint,preferences,updated) VALUES(?,?,?)').bind(subscription.endpoint,JSON.stringify({winner:false,lead:true,progress:false}),0).run();
 await db.prepare('INSERT INTO subscription_keys(endpoint,value,created) VALUES(?,?,?)').bind(subscription.endpoint,JSON.stringify(subscription),0).run();
 const event={id:'live:test',types:['winner','lead'] as ('winner'|'lead')[],title:'Test',body:'Test',url:'/?tab=live'};
 await queuePush(db,event);await queuePush(db,event);let sent=0;
 await dispatchPush(db,async()=>{sent++;throw {statusCode:503};});assert.equal(sent,1);
 assert.equal((await db.prepare('SELECT status FROM push_deliveries').first<{status:string}>())?.status,'retry');
 await db.prepare('UPDATE push_deliveries SET updated=0').run();await dispatchPush(db,async()=>{sent++;return {} as any});assert.equal(sent,2);
 await dispatchPush(db,async()=>{sent++;return {} as any});assert.equal(sent,2);
 await queuePush(db,{...event,id:'expired'});await dispatchPush(db,async()=>{throw {statusCode:410};});assert.equal((await db.prepare('SELECT endpoint FROM subscriptions').all()).results.length,0);
 }finally{client.close();}
});
test('content alerts establish a baseline and only notify for fresh unseen publications',async()=>{
 const client=createClient({url:'file::memory:'}),db=createDatabase(client);try{
 const publication={url:'https://example.com/new',title:'A new publication',publishedAt:new Date().toISOString()};
 const current={publications:[publication],polls:[]};await queueContentAlerts(db,current,null,'polls');assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length,0);
 await queueContentAlerts(db,current,{publications:[],polls:[]},'polls');await queueContentAlerts(db,current,{publications:[],polls:[]},'polls');assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length,1);
 await queueContentAlerts(db,{publications:[{...publication,url:'https://example.com/old',publishedAt:'2026-01-01'}]},{publications:[]},'polls');assert.equal((await db.prepare('SELECT id FROM push_events').all()).results.length,1);
 }finally{client.close();}
});
