export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
import {env} from '@/lib/runtime';
import { polls } from '@/lib/polls';
export async function GET(){if(!env.DB)return Response.json({status:'unavailable',message:'Banco indisponível.'},{status:503});return Response.json(await polls(env.DB),{headers:{'Cache-Control':'no-store'}});}
