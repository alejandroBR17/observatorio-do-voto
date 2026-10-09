import {getDatabase} from '@/lib/database';
import {isSameOrigin} from '@/lib/request';
import {validEndpoint,eventId} from '@/lib/push';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(!isSameOrigin(req))return Response.json({error:'Origem inválida'},{status:403});const body=await req.json().catch(()=>null);
 if(typeof body?.endpoint!=='string'||!validEndpoint(body.endpoint)||typeof body.id!=='string'||!/^test:[0-9a-f-]{36}$/.test(body.id))return Response.json({error:'Recibo inválido'},{status:400});
 try{const db=getDatabase();if(!db)throw Error();const issued=await db.prepare('SELECT value,updated FROM cache WHERE key=?').bind(eventId('test',body.endpoint)).first<{value:string;updated:number}>();if(!issued||issued.value!==body.id||Date.now()-issued.updated>120000)return Response.json({error:'Teste expirado'},{status:400});
 await db.prepare('INSERT INTO cache(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated').bind(eventId('test-receipt',body.endpoint),body.id,Date.now()).run();return Response.json({ok:true});
 }catch{return Response.json({error:'Recibo indisponível'},{status:503});}
}
