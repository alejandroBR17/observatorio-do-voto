import assert from 'node:assert/strict';
import {parseRss,parseWordPress,parseAtlas,parsePoderDataArticle,pollSnapshots} from '../lib/polls.ts';
const src={name:'PoderData',url:'https://www.poder360.com.br/category/poderdata/feed/',domain:'poder360.com.br'};
const item=(title,link='https://www.poder360.com.br/poderdata/example/',d='Thu, 08 Oct 2026 10:30:00 GMT')=>`<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${d}</pubDate></item>`;
const parsed=parseRss(`<rss>${item('PoderData: Flávio tem 53% e Lula 47% no 2º turno')}${item('PoderData: aprovação do governo')}${item('PoderData: Lula na eleição','https://attacker.test/evil')}${item('PoderData: Lula na eleição',undefined,'not a date')}${item('PoderData: Lula na eleição',undefined,'Wed, 08 Oct 2025 10:30:00 GMT')}</rss>`,src);
assert.equal(parsed.length,1);assert.equal(parsed[0].institute,'PoderData/Aya');assert.equal(parsed[0].kind,'publication');assert.equal(parsed[0].flavio,undefined,'headline percentage must not become voting data');
assert.equal(parseRss(item('Datafolha: Lula &amp; Flávio na eleição','javascript:alert(1)'),src).length,0);
assert.equal(parseWordPress([{link:'https://quaest.com.br/relatorios/x',title:{rendered:'Pesquisa para presidente &#8211; 03/10/2026'},date_gmt:'2026-10-04T18:39:12'},{link:'https://quaest.com.br/x',title:{rendered:'Pesquisa governador'},date_gmt:'2026-10-04T18:39:12'}],{name:'Quaest',url:'https://quaest.com.br/wp-json',domain:'quaest.com.br'}).length,1);
assert.equal(parseAtlas('<a href="/poll/brazil-national-2026-10-03">National</a><a href="/poll/brazil-parana-2026-10-03">Paraná</a>',{name:'AtlasIntel',url:'https://atlasintel.org/polls',domain:'atlasintel.org'}).length,1);
assert.equal(pollSnapshots.length,2);for(const p of pollSnapshots){assert.equal(p.flavio+p.lula,100);assert.equal(p.turn,2);assert.match(p.registration,/^BR-\d{5}\/2026$/);assert.equal(p.mode,'snapshot');}
const article={ '@type':'NewsArticle',headline:'Flávio tem 53% contra 47% de Lula no 2º turno, diz pesquisa PoderData/Aya',datePublished:'2026-10-08T07:30:00-03:00',articleBody:'Pesquisa PoderData/Aya mostra Flávio Bolsonaro à frente no 2º turno à Presidência da República. No embate com Lula, o congressista tem 53% dos votos válidos, ante 47% do petista.\n\nO levantamento, realizado de 5 a 7 de outubro, ouviu eleitores. Foram 3.000 entrevistas nas 27 unidades da Federação. A margem de erro é de 1,8 ponto percentual. O intervalo de confiança é de 95%. BR-08134/2026.'};
const html=a=>`<script type="application/ld+json">${JSON.stringify({'@graph':[a]})}</script>`;const u=pollSnapshots[1].source;const now=Date.parse('2026-10-08T23:59:00-03:00');
assert.equal(parsePoderDataArticle(html(article),u,now).flavio,53);
assert.equal(parsePoderDataArticle(html({...article,headline:article.headline.replace('2º','1º')}),u,now),null);
assert.equal(parsePoderDataArticle(html({...article,datePublished:'2026-10-09T18:00:00-03:00'}),u,now),null);
assert.equal(parsePoderDataArticle(html({...article,articleBody:article.articleBody.replace('votos válidos','votos totais')}),u,now),null);
assert.equal(parsePoderDataArticle(html({...article,articleBody:article.articleBody.replace('BR-08134/2026','')}),u,now),null);
assert.equal(parsePoderDataArticle(html({...article,articleBody:article.articleBody.replace('53%','52%')}),u,now),null);
assert.equal(parsePoderDataArticle(html({...article,articleBody:article.articleBody+' BR-08135/2026'}),u,now),null);
assert.equal(parsePoderDataArticle(html(article),'https://attacker.test/poderdata/x',now),null);
console.log('Poll parser: URLs, dates, year, presidential scope, source encoding fields and no headline percentage inference passed.');
if(process.argv.includes('--live')){
 const feed=await fetch(src.url,{signal:AbortSignal.timeout(10000)});assert.equal(feed.status,200);const items=parseRss(await feed.text(),src);assert.ok(items.length>0);console.log('PoderData feed HTTP200; discovered',items.length,'publications.');
 const r=await fetch(u,{signal:AbortSignal.timeout(8000)});assert.equal(r.status,200);const p=parsePoderDataArticle(await r.text(),u,now);assert.ok(p,'real primary article conservative adapter');assert.equal(p.registration,'BR-08134/2026');assert.equal(p.flavio,53);assert.equal(p.sample,3000);console.log('Primary PoderData JSON-LD HTTP200; numeric adapter and methodology verified.');
 const q=await fetch('https://quaest.com.br/wp-json/wp/v2/relatorios?search=presidente&per_page=10',{signal:AbortSignal.timeout(10000)});assert.equal(q.status,200);assert.ok(parseWordPress(await q.json(),{name:'Quaest',url:'https://quaest.com.br/wp-json/wp/v2/relatorios',domain:'quaest.com.br'}).length>0);console.log('Quaest public WordPress HTTP200; presidential publication discovery verified.');
 const a=await fetch('https://atlasintel.org/polls/latam-pulse',{signal:AbortSignal.timeout(10000)});assert.equal(a.status,200);assert.ok(parseAtlas(await a.text(),{name:'AtlasIntel',url:'https://atlasintel.org/polls/latam-pulse',domain:'atlasintel.org'}).length>0);console.log('AtlasIntel official Latam Pulse HTTP200; national presidential publication discovery verified.');
}
