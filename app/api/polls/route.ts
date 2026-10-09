export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
import {env} from '@/lib/runtime';
import { polls } from '@/lib/polls';
export async function GET(){let db;try{db=env.DB;}catch{}return Response.json(await polls(db),{headers:{'Cache-Control':'no-store'}});}
