import test from 'node:test';
import assert from 'node:assert/strict';
import {articleUrl,articleImage} from '../lib/article-image';
import {readWatch} from '../lib/notebook';
import {pushTestFailure} from '../lib/push-test-error';
test('test errors distinguish recoverable subscriptions from infrastructure failures without exposing provider data',()=>{
 assert.equal(pushTestFailure({statusCode:410,body:'private provider data'},'delivery').code,'expired');
 assert.equal(pushTestFailure({statusCode:403},'delivery').code,'subscription_mismatch');
 assert.equal(pushTestFailure({statusCode:429},'delivery').code,'provider_busy');
 assert.equal(pushTestFailure(new Error('private database url'),'storage').code,'storage_unavailable');
 assert.equal(JSON.stringify(pushTestFailure(new Error('private data'),'delivery')).includes('private data'),false);
});
test('article previews accept source metadata, decode entities and reject unsafe targets',()=>{
 assert.equal(articleUrl('https://g1.globo.com.attacker.test/news'),null);
 assert.equal(articleUrl('https://user:pass@g1.globo.com/news'),null);
 assert.equal(articleUrl('http://127.0.0.1/news'),null);
 assert.equal(articleUrl('https://g1.globo.com:444/news'),null);
 assert.equal(articleImage('<meta content="https://s2.glbimg.com/photo.jpg?a=1&amp;b=2" property="og:image">','https://g1.globo.com/news'),'https://s2.glbimg.com/photo.jpg?a=1&b=2');
 assert.equal(articleImage('<meta name="twitter:image" content="/photo.jpg">','https://quaest.com.br/news'),'https://quaest.com.br/photo.jpg');
 assert.equal(articleImage('<meta property="og:image" content="http://localhost/secret">','https://g1.globo.com/news'),null);
});
test('notebook preserves legacy notes and deletion without resurrecting a migrated entry',()=>{
 const legacy=readWatch({states:['SP','SP','invalid'],note:'Uma observação antiga'});
 assert.deepEqual(legacy.states,['SP']);assert.equal(legacy.entries[0].body,'Uma observação antiga');assert.equal(legacy.entries[0].updated,null);
 assert.deepEqual(readWatch({entries:[],note:'Uma observação antiga'}).entries,[]);
 const modern=readWatch({entries:[{id:'entry',title:'Título',body:'Texto',uf:'invalid',topic:'invalid',updated:'not-a-date'}]});
 assert.equal(modern.entries[0].uf,'BR');assert.equal(modern.entries[0].topic,'Observações');assert.equal(modern.entries[0].updated,null);
});
