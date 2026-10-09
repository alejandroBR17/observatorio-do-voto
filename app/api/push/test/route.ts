import {getDatabase} from '@/lib/database';
import {isSameOrigin} from '@/lib/request';
import {validEndpoint,eventId,sendPush} from '@/lib/push';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export async function POST(req:Request){
 if(!isSameOrigin(req))return Response.json({error:'Origem inválida'},{status:403});const body=await req.json().catch(()=>null);if(typeof body?.endpoint!=='string'||!validEndpoint(body.endpoint))return Response.json({error:'Inscrição inválida'},{status:400});
 try{const db=getDatabase();if(!db)throw Error();const row=await db.prepare('SELECT value FROM subscription_keys WHERE endpoint=?').bind(body.endpoint).first<{value:string}>();if(!row)return Response.json({error:'Ative ou atualize sua inscrição antes de testar.'},{status:400});
 const lease=await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET updated=excluded.updated WHERE cache.updated<?').bind(eventId('test',body.endpoint),'',Date.now(),Date.now()-60000).run();if(!lease.meta.changes)return Response.json({error:'Aguarde um minuto antes de testar novamente.'},{status:429});
 await sendPush(db,JSON.parse(row.value),{id:'test:'+Date.now(),types:[],title:'Teste de notificação',body:'Seu aparelho recebeu o teste do Observatório do Voto. Os avisos reais seguem as categorias que você escolheu.',url:'/?tab=alerts'});return Response.json({ok:true});
 }catch{return Response.json({error:'Não foi possível enviar o teste. Atualize sua inscrição e tente novamente.'},{status:503});}
}
