export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
import {env} from '@/lib/runtime';
import {media} from '@/lib/media';
export async function GET(){if(!env.DB)return Response.json({status:'unavailable',message:'A cobertura de imprensa ainda não está disponível nesta hospedagem.'},{status:503});return Response.json(await media(env.DB),{headers:{'Cache-Control':'no-store'}});}
