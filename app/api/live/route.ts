export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
import {env} from '@/lib/runtime';
import { live } from '@/lib/live';
import { states } from '@/lib/elections';
import { dispatchPush } from '@/lib/push';
export async function GET(req:Request){const uf=(new URL(req.url).searchParams.get('uf')||'BR').toUpperCase();if(uf!=='BR'&&!states.some(s=>s[1]===uf))return Response.json({error:'UF inválida'},{status:400});if(!env.DB)return Response.json({status:'unavailable',message:'Banco indisponível.'},{status:503});const data=await live(env.DB,uf);if(uf==='BR')await dispatchPush(env.DB);return Response.json(data,{headers:{'Cache-Control':'no-store'}});}
