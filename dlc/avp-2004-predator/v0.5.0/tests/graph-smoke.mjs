import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const c=JSON.parse(fs.readFileSync(path.join(root,'src/campaign.json'),'utf8'));
const rooms=JSON.parse(fs.readFileSync(path.join(root,'src/rooms.json'),'utf8'));
const rm=new Map(rooms.map(r=>[r.id,r]));
for(const r of rooms) for(const to of r.links||[]){assert(rm.has(to),`${r.id}->${to}`);assert((rm.get(to).links||[]).includes(r.id),`non-reciprocal ${r.id}<->${to}`)}
const flat=c.chapters.flatMap(ch=>ch.beats.map(b=>({chapter:ch.id,...b})));
for(let i=0;i<flat.length-1;i++){const a=flat[i],b=flat[i+1];if(a.room===b.room)continue;assert((rm.get(a.room).links||[]).includes(b.room),`story gap ${a.chapter}:${a.id} ${a.room}->${b.room}`)}
console.log('GRAPH_SMOKE_OK',{rooms:rooms.length,edges:rooms.reduce((n,r)=>n+(r.links||[]).length,0)/2,storyTransitions:flat.length-1});
