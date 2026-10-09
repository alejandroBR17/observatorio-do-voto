export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
import {env} from '@/lib/runtime';
import {media} from '@/lib/media';
import {dispatchPush} from '@/lib/push';
export async function GET(){const db=env.DB;if(!db)return Response.json({status:'unavailable',message:'A cobertura de imprensa ainda não está disponível nesta hospedagem.'},{status:503});const data=await media(db);await dispatchPush(db).catch(()=>{});return Response.json(data,{headers:{'Cache-Control':'no-store'}});}
