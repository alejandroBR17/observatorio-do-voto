import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {createDatabase} from '../lib/database';
test('portable database persists cache, counts lease changes and prevents duplicate claims',async()=>{
 const client=createClient({url:'file::memory:'});const db=createDatabase(client);
 await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?)').bind('result','{"votes":123}',10).run();
 assert.deepEqual(await db.prepare('SELECT value,updated FROM cache WHERE key=?').bind('result').first(),{value:'{"votes":123}',updated:10});
 const sql='INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?';
 const claims=await Promise.all([db.prepare(sql).bind('lease','',100,90).run(),db.prepare(sql).bind('lease','',100,90).run()]);
 assert.equal(claims.reduce((n,r)=>n+r.meta.changes,0),1);
 const first=await db.prepare('INSERT OR IGNORE INTO cache(key,value,updated) VALUES(?,?,?)').bind('sent:1','event',100).run();
 const second=await db.prepare('INSERT OR IGNORE INTO cache(key,value,updated) VALUES(?,?,?)').bind('sent:1','event',100).run();
 assert.equal(first.meta.changes,1);assert.equal(second.meta.changes,0);
 await db.prepare('INSERT INTO subscriptions(endpoint,preferences,updated) VALUES(?,?,?)').bind('https://example.com','{}',1).run();
 assert.equal((await db.prepare('SELECT endpoint FROM subscriptions').all()).results.length,1);
 client.close();
});
