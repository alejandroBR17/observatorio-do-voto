import {test} from 'node:test';
import assert from 'node:assert/strict';
import {polls} from '../lib/polls';
import type {Database} from '../lib/database';

test('poll discovery works without a database, deduplicates concurrent queries and survives a database failure',async()=>{
 const original=globalThis.fetch;let requests=0;
 globalThis.fetch=async(input)=>{requests++;const url=String(input);
  if(url.includes('atlasintel'))return new Response('<a href="/poll/brazil-national-2026-10-09">National</a>');
  if(url.includes('quaest'))return Response.json([]);
  return new Response('<rss/>');
 };
 try{
  const [first,concurrent]=await Promise.all([polls(),polls()]);
  assert.equal(requests,5);assert.equal(first,concurrent);assert.equal(first.status,'ready');assert.equal(first.cacheStorage,'temporary');
  assert.equal(first.polls[0].registration,'BR-03663/2026');assert.match(first.sources.find((s:any)=>s.name==='AtlasIntel').url,/exclusive-polls/);
  const cached=await polls();assert.equal(cached.cached,true);assert.equal(requests,5);
  const broken={prepare(){throw new Error('Database unavailable');}} as Database;
  const fallback=await polls(broken);assert.equal(fallback.cacheStorage,'temporary');assert.equal(fallback.polls.length,3);assert.equal(requests,5);
 }finally{globalThis.fetch=original;}
});
