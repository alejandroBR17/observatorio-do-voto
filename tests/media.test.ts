import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseNewsRss,newsSources,normalizeMedia} from '../lib/media';
test('news feeds accept current presidential coverage, decode titles and reject unrelated or unsafe links',()=>{
 const date=new Date().toUTCString();const xml=`<rss><item><title>Lula &amp; Flávio Bolsonaro</title><link>https://g1.globo.com/politica/test</link><pubDate>${date}</pubDate></item><item><title>Tempo hoje</title><link>https://g1.globo.com/test2</link><pubDate>${date}</pubDate></item><item><title>Lula</title><link>https://evil.example/test</link><pubDate>${date}</pubDate></item></rss>`;
 const items=parseNewsRss(xml,newsSources[0]);assert.equal(items.length,1);assert.equal(items[0].title,'Lula & Flávio Bolsonaro');
 assert.equal(parseNewsRss(xml.replaceAll(date,'Thu, 01 Jan 2026 10:00:00 GMT'),newsSources[0]).length,0);
});
test('media totals retain the press-only fields and exclude invalid outbound URLs',()=>{
 const data=normalizeMedia({data:{total_articles_imprensa:10,total_sources_imprensa:2,articles_today_imprensa:1,last_fetch_at:'2026-10-09T13:04:00',cutoff_date:'2026-03-25'}},{data:[]},{data:[{url:'https://example.com/news',title:'News'},{url:'javascript:alert(1)',title:'Bad'}]});assert.equal(data.stats.articles,10);assert.equal(data.articles.length,1);
});
