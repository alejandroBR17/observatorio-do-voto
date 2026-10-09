import {timingSafeEqual} from 'node:crypto';
import {getDatabase} from '@/lib/database';
import {live} from '@/lib/live';
import {dispatchPush} from '@/lib/push';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(req:Request){
 const expected=process.env.CRON_SECRET;
 if(!expected)return Response.json({error:'Monitor não configurado.'},{status:503});
 const actual=req.headers.get('authorization')||'',wanted='Bearer '+expected;
 if(Buffer.byteLength(actual)!==Buffer.byteLength(wanted)||!timingSafeEqual(Buffer.from(actual),Buffer.from(wanted)))return Response.json({error:'Não autorizado.'},{status:401});
 const db=getDatabase();if(!db)return Response.json({error:'Banco não configurado.'},{status:503});
 const data=await live(db);await dispatchPush(db);return Response.json({status:data.status,checkedAt:data.checkedAt},{headers:{'Cache-Control':'no-store'}});
}
