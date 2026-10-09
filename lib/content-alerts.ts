import type {Database} from './database';
import {queuePush,eventId} from './push';
export async function queueContentAlerts(db:Database,current:any,previous:any,kind:'polls'|'coverage'){
 if(!previous)return; // Establish a baseline; never alert for the initial historical import.
 const items=kind==='polls'?current.publications:current.articles,old=kind==='polls'?previous.publications:previous.articles;
 const known=new Set([...(old||[]).map((p:any)=>p.url),...(kind==='polls'?previous.polls||[]:[]).map((p:any)=>p.source)]);
 const fresh=(items||[]).filter((p:any)=>!known.has(p.url)&&p.publishedAt&&Date.parse(p.publishedAt)>Date.now()-86400000&&Date.parse(p.publishedAt)<=Date.now()+300000);
 if(!fresh.length)return;
 await queuePush(db,{id:eventId(kind,fresh.map((p:any)=>p.url).sort().join('|')),types:[kind],title:kind==='polls'?'Novas publicações sobre pesquisas':'Novas notícias sobre a eleição',body:fresh.length===1?fresh[0].title:`${fresh.length} publicações novas. ${fresh[0].title}`,url:kind==='polls'?'/?tab=polls':'/?tab=social'});
}
