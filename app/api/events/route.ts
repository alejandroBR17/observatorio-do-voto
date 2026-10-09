export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
import {env} from '@/lib/runtime';
export async function GET(){const row=await env.DB?.prepare('SELECT value FROM cache WHERE key=?').bind('event').first<{value:string}>();return Response.json(row?JSON.parse(row.value):{message:'Nenhuma atualização eleitoral disponível.'},{headers:{'Cache-Control':'no-store'}});}
