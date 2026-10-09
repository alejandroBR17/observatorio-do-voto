import {isSameOrigin} from '@/lib/request';
import {experimental_upgradeWebSocket} from '@vercel/functions';
import {getDatabase} from '@/lib/database';
import {live} from '@/lib/live';
import {dispatchPush} from '@/lib/push';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(req:Request){
 if(!isSameOrigin(req))return new Response('Origem inválida',{status:403});
 if(!process.env.VERCEL)return Response.json({message:'Use Vercel dev para WebSocket. A consulta periódica permanece ativa.'},{status:426});
 const db=getDatabase();if(!db)return Response.json({error:'Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.'},{status:503});
 return experimental_upgradeWebSocket(ws=>{
  let stopped=false,busy=false,last='',timer:ReturnType<typeof setInterval>|undefined,expiry:ReturnType<typeof setTimeout>|undefined;
  const cleanup=()=>{stopped=true;clearInterval(timer);clearTimeout(expiry)};
  const send=(data:unknown)=>{if(stopped)return;try{ws.send(JSON.stringify(data))}catch{cleanup()}};
  const update=async()=>{if(stopped||busy)return;busy=true;try{const data=await live(db);const id=data.result?.id||data.status;if(id!==last&&!stopped){last=id;send({type:'live',data})}await dispatchPush(db)}catch{send({type:'warning',message:'Consulta temporariamente indisponível.'})}finally{busy=false}};
  send({type:'ready'});void update();
  timer=setInterval(()=>void update(),30000);
  expiry=setTimeout(()=>{cleanup();ws.close(1000,'Reconectar para renovar a sessão')},55000);
  ws.on('close',cleanup);ws.on('error',cleanup);
 },{maxPayload:1024});
}
