import {isSameOrigin} from '@/lib/request';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
import {env} from '@/lib/runtime';
import {pushKeys,validEndpoint} from '@/lib/push';
export async function GET(){if(!env.DB)return Response.json({error:'Banco indisponível'},{status:503});const keys=await pushKeys(env.DB);return Response.json({publicKey:keys.public});}
export async function POST(req:Request){
 if(!isSameOrigin(req))return Response.json({error:'Origem inválida'},{status:403});
 if(!env.DB)return Response.json({error:'Banco indisponível'},{status:503});
 const body=await req.json().catch(()=>null) as {endpoint:string;preferences:Record<string,boolean>}|null;if(!body||typeof body.endpoint!=='string'||body.endpoint.length>2000||!validEndpoint(body.endpoint))return Response.json({error:'Serviço push não suportado.'},{status:400});
 const preferences=Object.fromEntries(['winner','mathematical','lead','margin','progress'].map(k=>[k,!!body.preferences?.[k]]));
 await env.DB.prepare('INSERT INTO subscriptions(endpoint,preferences,updated) VALUES(?,?,?) ON CONFLICT(endpoint) DO UPDATE SET preferences=excluded.preferences,updated=excluded.updated').bind(body.endpoint,JSON.stringify(preferences),Date.now()).run();return Response.json({ok:true});
}
export async function DELETE(req:Request){if(!isSameOrigin(req)||!env.DB)return Response.json({error:'Origem inválida'},{status:403});const body=await req.json().catch(()=>null) as {endpoint:string}|null;if(!body||typeof body.endpoint!=='string'||!validEndpoint(body.endpoint))return Response.json({error:'Inscrição inválida.'},{status:400});await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(body.endpoint).run();return Response.json({ok:true});}
