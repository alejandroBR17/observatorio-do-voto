import type {Database} from './database';
const BASE='https://eleicoes2026.sapienslabs.com.br/api/v1';
export function normalizeMedia(stats:any,candidates:any,articles:any){
 if(!['total_articles_imprensa','total_sources_imprensa','articles_today_imprensa'].every(k=>Number.isSafeInteger(stats?.data?.[k])&&stats.data[k]>=0)||!Array.isArray(candidates?.data)||!Array.isArray(articles?.data))throw new Error('Formato da fonte incompatível.');
 const safeUrl=(s:string)=>{try{return new URL(s).protocol==='https:'?s:null;}catch{return null;}};
 return {stats:{articles:stats.data.total_articles_imprensa,sources:stats.data.total_sources_imprensa,today:stats.data.articles_today_imprensa,updated:stats.data.last_fetch_at,cutoff:stats.data.cutoff_date},candidates:candidates.data.filter((c:any)=>['lula-silva','flavio-bolsonaro'].includes(c.slug)&&Number.isSafeInteger(c.kpis?.articles)&&c.kpis.articles>=0).map((c:any)=>({slug:c.slug,name:c.name,articles:c.kpis.articles})),articles:articles.data.filter((a:any)=>safeUrl(a.url)&&typeof a.title==='string').slice(0,16).map((a:any)=>({id:a.id,title:a.title.slice(0,240),url:a.url,source:a.source||a.source_canonical,publishedAt:a.published_at}))};
}
export async function media(db:Database){
 const key='media:v1';const old=await db.prepare('SELECT value,updated FROM cache WHERE key=?').bind(key).first<{value:string;updated:number}>();
 if(old&&Date.now()-old.updated<600000)return JSON.parse(old.value);
 const lease=await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?').bind('lease:media','',Date.now(),Date.now()-25000).run();
 if(!lease.meta.changes)return old?JSON.parse(old.value):{status:'loading',message:'Consultando a cobertura de imprensa.'};
 let payload:any;
 try{const data=await Promise.all(['stats','candidates','articles?page_size=16'].map(async p=>{const r=await fetch(`${BASE}/${p}`,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(`Fonte respondeu ${r.status}`);return r.json();}));payload={status:'live',...normalizeMedia(...data as [any,any,any]),checkedAt:new Date().toISOString(),source:BASE,attribution:'SapiensLabs — Eleições 2026 — CC BY 4.0'};}
 catch{payload=old?{...JSON.parse(old.value),status:'stale',message:'A fonte não respondeu. Exibindo a última coleta recebida.'}:{status:'unavailable',message:'A fonte de cobertura está temporariamente indisponível.',checkedAt:new Date().toISOString()};}
 await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated').bind(key,JSON.stringify(payload),Date.now()).run();return payload;
}
