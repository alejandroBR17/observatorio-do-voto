import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validEndpoint,pushKeys} from '../lib/push';
import {createDatabase} from '../lib/database';
import {createClient} from '@libsql/client';

test('push accepts platform providers and rejects lookalike domains and unsafe endpoints',()=>{
 for(const url of ['https://fcm.googleapis.com/fcm/send/test','https://updates.push.services.mozilla.com/wpush/v2/test','https://web.push.apple.com/test','https://region.push.apple.com/test','https://wns2-am3p.notify.windows.com/test'])assert.equal(validEndpoint(url),true,url);
 for(const url of ['http://web.push.apple.com/test','https://push.apple.com.evil.example/test','https://evilpush.apple.com/test','https://127.0.0.1/test','https://user:password@web.push.apple.com/test','https://web.push.apple.com:8080/test','invalid'])assert.equal(validEndpoint(url),false,url);
});
test('VAPID keys stay stable across concurrent registration requests',async()=>{
 const client=createClient({url:'file::memory:'});try{const db=createDatabase(client);const [a,b]=await Promise.all([pushKeys(db),pushKeys(db)]);assert.equal(a.public,b.public);assert.equal(a.public.length,87);assert.deepEqual(a.private,b.private);}finally{client.close();}
});
