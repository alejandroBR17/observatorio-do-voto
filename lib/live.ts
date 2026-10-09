import type {Database} from './database';
import { normalize, victory } from './elections';
import {resultAlertTypes,voteGap} from './alerts';
import {queuePush,eventId} from './push';
const BASE='https://resultados.tse.jus.br/oficial';
export async function live(db:Database,uf='BR'){
 const key=`live:${uf}`;const old=await db.prepare('SELECT value, updated FROM cache WHERE key=?').bind(key).first<{value:string;updated:number}>();
 const oldPayload=old?JSON.parse(old.value):null;
 const interval=oldPayload?.status==='unavailable'?60000:30000;
 if(old&&Date.now()-old.updated<interval)return oldPayload;
 const lease=await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?').bind(`lease:${uf}`,'',Date.now(),Date.now()-25000).run();
 if(!lease.meta.changes)return oldPayload?{...oldPayload,stale:true}:{status:'loading',message:'Consultando a fonte oficial.'};
 let payload:any;
 try{
 const response=await fetch(`${BASE}/comum/config/ele-c.json`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Configuração oficial indisponível.');
 const config=await response.json() as any;
 const pleito=config.pl.find((p:any)=>p.c==='ele2026'&&p.dt==='25/10/2026');
 const election=pleito?.e?.find((e:any)=>e.abr?.some((a:any)=>a.cp?.some((c:any)=>String(c.cd)==='1')));
 const first=config.pl.find((p:any)=>p.c==='ele2026'&&p.dt==='04/10/2026')?.e?.find((e:any)=>e.abr?.some((a:any)=>a.cp?.some((c:any)=>String(c.cd)==='1')));
 const code=election?.cd||first?.cdt2;
 if(!code)throw new Error('Código do segundo turno ainda não publicado.');
 if(Date.now()<Date.parse('2026-10-25T17:00:00-03:00'))payload={status:'waiting',message:'O segundo turno acontece em 25/10. Divulgação a partir do encerramento da votação, às 17h de Brasília.',code};
 else {
 const source=`${BASE}/ele2026/${code}/dados/${uf.toLowerCase()}/${uf.toLowerCase()}-c0001-e${String(code).padStart(6,'0')}-u.json`;
 const res=await fetch(source,{signal:AbortSignal.timeout(12000)});
 if(!res.ok)throw new Error(`TSE respondeu ${res.status}; a divulgação pode não ter começado.`);
 const result=normalize(await res.json(),source);
 if(result.turn!==2)throw new Error('Turno incompatível.');
 payload={status:'live',result,victory:victory(result)};
 }
 }catch(e){payload={status:'unavailable',message:e instanceof Error?e.message:'Fonte indisponível',lastGood:old?JSON.parse(old.value).result:undefined};}
 payload.checkedAt=new Date().toISOString();
 await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated').bind(key,JSON.stringify(payload),Date.now()).run();
 if(payload.result&&(!old||JSON.parse(old.value).result?.id!==payload.result.id)&&uf==='BR'){
 const prior=old?JSON.parse(old.value).result:null;const current=payload.result;
 const previousVictory=prior?victory(prior).kind:null;
 const baseline=await db.prepare('SELECT value FROM cache WHERE key=?').bind('alert:margin').first<{value:string}>();
 const types=resultAlertTypes(current,prior,payload.victory.kind,previousVictory,baseline?Number(baseline.value):prior?voteGap(prior):voteGap(current));
 if(!baseline||types.includes('margin'))await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated').bind('alert:margin',String(voteGap(current)),Date.now()).run();
 const labels={winner:'Resultado confirmado pelo TSE',mathematical:'Vantagem numericamente irreversível',lead:'Mudança de liderança',margin:'Mudança na vantagem',progress:'Atualização da apuração',polls:'Nova pesquisa',coverage:'Noticiário'};
 const title=labels[types[0]],body=types.includes('winner')||types.includes('mathematical')?payload.victory.message:current.candidates.slice(0,2).map((c:any)=>`${c.name}: ${c.percent.toLocaleString('pt-BR',{maximumFractionDigits:2})}%`).join(' · ')+` · ${current.counted.toLocaleString('pt-BR')}% apurado`;
 await queuePush(db,{id:eventId('live',current.id),types,title,body,url:'/?tab=live',urgent:types.some(t=>['winner','mathematical','lead'].includes(t))});
 await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated').bind('event',JSON.stringify({event:types[0],result:current,victory:payload.victory}),Date.now()).run();
 }
 return payload;
}
