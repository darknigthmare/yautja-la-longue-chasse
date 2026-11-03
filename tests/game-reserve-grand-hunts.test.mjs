import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV109';export * from './app/game/systems/gameReserveGrandHunt';export * from './app/game/systems/gameReserveTacticalV98';export * from './app/game/systems/gameReserveLegacyDecorData';export {defaultSave,parseSaveImport} from './app/game/save';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const valid=state=>assert.deepEqual(api.normalizeGameReserveV66(state),state);
const step=(state,input={})=>api.stepGameReserveV66(state,input);
const ticks=(state,count,input={})=>{for(let i=0;i<count;i++)state=step(state,input);return state;};
/** Geometry fixture: every adult is already down, so terrain and hazards are tested without combat. Not a combat victory. */
function quiet(id){const s=api.createGameReserveV109(113,id);for(const h of s.humans){h.status='down';h.hp=0;h.downAt=0;}valid(s);return step(s);}
const definition=id=>api.GAME_RESERVE_GRAND_CATALOGUE.find(d=>d.id===id);
const webpSize=file=>{const b=fs.readFileSync(file);const chunk=b.toString('ascii',12,16);
  if(chunk==='VP8X')return[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];if(chunk==='VP8L'){const v=b.readUInt32LE(21);return[1+(v&0x3fff),1+(v>>14&0x3fff)];}
  if(chunk==='VP8 ')return[b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];return[b.readUInt32BE(16),b.readUInt32BE(20)];};

test('four grand hunts define 12 contiguous sectors, 24 unique adults, 6 aircraft, 24 depots and 6 posts on native art',()=>{
  assert.deepEqual([...api.GAME_RESERVE_GRAND_IDS],['vharuun-grand-hunt','avar-kesh-grand-hunt','khar-duun-grand-hunt','iskhel-grand-hunt']);
  const ids=new Set();
  for(const d of api.GAME_RESERVE_GRAND_CATALOGUE){
    assert.equal(d.version,6);assert.equal(d.world.width,19200);assert.equal(d.sectors.length,12);
    d.sectors.forEach((sector,index)=>{assert.equal(sector.left,index*1600);assert.equal(sector.right,(index+1)*1600);});
    assert.equal(d.people.length,24);assert.equal(d.ships.length,6);assert.equal(d.supplies.length,24);assert.equal(d.sites.length,6);
    for(const person of d.people){assert(!ids.has(person.id),person.id);ids.add(person.id);}
    for(const site of d.sites){const platform=d.platforms.find(p=>p.y===site.y&&site.x>=p.x&&site.x<=p.x+p.w);assert(platform,site.id+' stands on a real platform');}
    const art=d.nativeArt;for(const entry of [art.background,art.ledge,art.gantry,art.cover,...art.platforms,...art.covers,...art.hazards,...art.decor])
      assert.deepEqual(webpSize('public'+entry.src),[...entry.size],entry.src);
    for(const p of d.platforms)assert(p.art>=0&&p.art<art.platforms.length);for(const c of d.cover)assert(c.art>=0&&c.art<art.covers.length);
    for(const h of d.hazards){assert(h.art>=0&&h.art<art.hazards.length);assert(h.x>=1600,'the first sector stays safe');
      for(const ship of d.ships)assert(h.x>ship.x+150||h.x+h.w<ship.x-150,'no hazard on a boarding ramp');for(const x of d.supplies)assert(h.x>x+50||h.x+h.w<x-50,'no hazard on a depot');}
    for(const c of d.cover)for(const ship of d.ships)assert(Math.abs(c.x+c.w/2-ship.x)>c.w/2+50,'no cover on a boarding ramp');
    // A transport hull is never crossed by a walkway below its roof line.
    for(const p of d.platforms)for(const ship of d.ships){const overlap=Math.min(p.x+p.w,ship.x+197)-Math.max(p.x,ship.x-195);assert(!(overlap>15&&p.y>284),`${d.id} ${p.x}/${p.y}`);}
  }
  for(const id of api.GAME_RESERVE_V109_IDS)assert(!api.GAME_RESERVE_GRAND_IDS.includes(id));
});

test('fresh V6 states are strict, conserve 48 lots, import exactly and refuse crossed identities or V7',()=>{
  for(const id of api.GAME_RESERVE_GRAND_IDS){
    const s=api.createGameReserveV109(113,id);assert.equal(s.version,6);assert.equal(s.reserveId,id);valid(s);
    assert.equal(api.gameReserveV66MaterialTotal(s),48);assert.equal(s.routeV109.siteRecords.length,6);
    const save={...api.defaultSave('2026-11-01T22:00:00.000Z'),gameReserveV66:s};
    assert.deepEqual(api.parseSaveImport(JSON.stringify(save)).save?.gameReserveV66,s);
    for(const wrong of[{...s,version:5},{...s,reserveId:'khar-duun-canyon-expedition'},{...s,supplies:s.supplies.slice(0,16)},{...s,routeV108:s.routeV109}])assert.equal(api.normalizeGameReserveV66(wrong),null);
    assert.equal(api.parseSaveImport(JSON.stringify({...save,gameReserveV66:{...s,version:7}})).failure,'future-version');
  }
  const v5=api.createGameReserveV109(113,'iskhel-ice-expedition');assert.equal(v5.version,5);assert.equal(api.normalizeGameReserveV66({...v5,version:6}),null);
});

// Real-engine route planner: candidate jumps are tried on cloned states of the actual simulation, never on a geometry shortcut.
function surface(d,s){if(s.player.y===438&&s.player.vy===0)return-1;return d.platforms.findIndex(p=>p.y===s.player.y&&s.player.x>p.x-10&&s.player.x<p.x+p.w+10);}
function walkTo(s,x){const move=x>s.player.x?1:-1;for(let i=0;i<9000&&(x-s.player.x)*move>2;i++){s=step(s,{move});assert.equal(s.status,'active');}return s;}
function tryJump(s,dir,delay){let t=step(s,{move:delay?0:dir,jump:true});if(t.player.vy>=0)return null;for(let i=0;i<90;i++){t=step(t,{move:i+1>=delay?dir:0});if(t.player.vy===0)return t;}return null;}
function reach(d,s,target){
  // Breadth-first over real landings from the current surface; positions are sampled along each surface.
  const key=t=>surface(d,t),seen=new Set([key(s)]);let frontier=[s];
  for(let depth=0;depth<14&&frontier.length;depth++){const next=[];
    for(const from of frontier){const here=surface(d,from),p=here>=0?d.platforms[here]:null;
      const goal=d.platforms[target],xs=p?[p.x+2,p.x+p.w*.25,p.x+p.w/2,p.x+p.w*.75,p.x+p.w-2]:Array.from({length:28},(_,n)=>goal.x-1200+n*60);
      for(const x of xs){const at=walkTo(from,Math.max(60,Math.min(19140,x)));if(surface(d,at)!==here&&here>=0)continue;
        for(const dir of[1,-1,0])for(const delay of dir?[0,12]:[0]){const landed=tryJump(at,dir,delay);if(!landed)continue;const k=key(landed);
          if(k===target)return landed;if(!seen.has(k)){seen.add(k);next.push(landed);}}}}
    frontier=next.sort((a,b)=>(a.player.y-b.player.y)*2+Math.abs(a.player.x-d.platforms[target].x)-Math.abs(b.player.x-d.platforms[target].x)).slice(0,8);}
  assert.fail(`${d.id}: no real route to platform ${target}`);
}
for(const id of api.GAME_RESERVE_GRAND_IDS)test(id+': all six posts are reached by real jumps, recorded by channel and reported by a walked return',()=>{
  const d=definition(id);let s=quiet(id);
  for(let index=0;index<d.sites.length;index++){const site=d.sites[index],target=d.platforms.findIndex(p=>p.y===site.y&&site.x>=p.x&&site.x<=p.x+p.w);
    // Restore vitality between legs: hazards are exercised separately; this test certifies reachability and records.
    s.player.hp=100;s=reach(d,s,target);s=walkTo(s,site.x);assert.equal(s.player.y,site.y);
    assert.deepEqual(api.gameReserveV66Interaction(s),{kind:'survey',target:index,ticks:0});
    s=ticks(s,120,{interact:true});assert.equal(s.routeV109.siteRecords[index].recordedAt,s.tick,site.id);valid(s);}
  s.player.hp=100;s=walkTo(s,115);s=ticks(s,60,{interact:true});assert.equal(s.status,'returned');
  assert.equal(s.visited.length,12);assert(s.routeV109.siteRecords.every(r=>r.recordedAt!==null));valid(s);
});

test('slow ground halves the hunter on the floor only; upper platforms stay safe',()=>{
  const d=definition('iskhel-grand-hunt'),slow=d.hazards.find(h=>h.kind==='slow');
  let s=quiet(d.id);s.player.x=slow.x+10;valid(s);const before=s.player.x;s=step(s,{move:1});assert.equal(+(s.player.x-before).toFixed(3),1.9);
  let t=quiet(d.id);t.player.x=800;// the first sector never holds a hazard
  const b2=t.player.x;t=step(t,{move:1});assert.equal(+(t.player.x-b2).toFixed(3),3.8);
  const above=d.platforms.find(p=>p.x<slow.x+slow.w&&p.x+p.w>slow.x);if(above){let u=quiet(d.id);u.player.x=Math.max(above.x+2,Math.min(above.x+above.w-6,slow.x+slow.w/2));u.player.y=above.y;valid(u);const b3=u.player.x;u=step(u,{move:1});assert.equal(u.player.y,above.y);assert.equal(+(u.player.x-b3).toFixed(3),3.8);}
});

test('harmful ground wounds the hunter on its interval and interrupts a channel like a projectile',()=>{
  const d=definition('khar-duun-grand-hunt'),harm=d.hazards.find(h=>h.kind==='harm');
  let s=quiet(d.id);s.player.x=harm.x+harm.w/2;valid(s);const hp=s.player.hp;
  for(let i=0;i<45;i++)s=step(s);assert.equal(s.player.hp,hp-4);
  // A carried channel on harmful ground: the wound frame resets it.
  const body=s.humans.find(h=>h.status==='down');body.x=s.player.x;body.secured=false;valid(s);
  while(s.tick%45!==40)s=step(s);s=ticks(s,4,{interact:true});assert.equal(s.channel.kind,'trophy');assert(s.channel.ticks>0);
  s=step(s,{interact:true});assert.equal(s.channel.kind,'none');
});

test('a tripwire alerts only nearby adults, once on entry, and only from the floor',()=>{
  const d=definition('avar-kesh-grand-hunt'),wire=d.hazards.find(h=>h.kind==='alarm');
  let s=api.createGameReserveV109(113,d.id);
  s.humans.forEach((h,i)=>{if(i===0){h.x=wire.x+wire.w+200;h.facing=-1;}else if(i===1)h.x=Math.min(19100,wire.x+wire.w+1400);});
  s.humans[0].facing=1;// facing away: no direct sight, only the flare can inform it
  s.player.x=wire.x-6;s.player.cloak=true;valid(s);s=step(s);
  for(let i=0;i<4;i++)s=step(s,{move:1});
  assert.notEqual(s.humans[0].lastSeenX,null,'adult within range learns the position');assert.equal(s.humans[1].lastSeenX,null,'distant adult learns nothing');
  const logs=s.log.filter(e=>e.message.startsWith('Piège lumineux')).length;s=ticks(s,6,{move:1});assert.equal(s.log.filter(e=>e.message.startsWith('Piège lumineux')).length,logs,'walking inside does not re-trigger');
});

test('calm adults cross harmful ground slowly and unhurt; adults in combat take the wound',()=>{
  const d=definition('khar-duun-grand-hunt'),harm=d.hazards.find(h=>h.kind==='harm');
  let s=api.createGameReserveV109(113,d.id);s.player.x=115;
  const h=s.humans[0];h.x=harm.x+harm.w/2;valid(s);s=step(s);
  for(let i=0;i<90;i++)s=step(s);assert.equal(s.humans[0].hp,70,'calm crossing');
  let t=api.createGameReserveV109(113,d.id);t.player.x=115;t.humans[0].x=harm.x+harm.w/2;t.humans[0].lastSeenX=harm.x+harm.w/2+400;t.humans[0].alertUntil=t.tick+300;valid(t);t=step(t);
  for(let i=0;i<90;i++)t=step(t);assert(t.humans[0].hp<70,'fighting crossing');valid(t);
});

for(const id of api.GAME_RESERVE_GRAND_IDS)test(id+': living teams carry 48 conserved lots, repair and depart in order, each after a walking hunter could reach it',()=>{
  let s=step(api.createGameReserveV109(113,id));
  for(let i=0;i<40000&&s.ships.some(ship=>ship.departedAt===null);i++){s=step(s);if(i%4000===0){valid(s);assert.equal(api.gameReserveV66MaterialTotal(s),48);}}
  assert(s.ships.every(ship=>ship.departedAt!==null),s.ships.map(ship=>ship.parts+'/'+ship.repair).join(' '));
  const ships=api.gameReserveV66Ships(s);
  // Walking from the extraction at 3.8 units per tick, plus at least one minute on site for each group.
  s.ships.forEach((ship,k)=>{assert(ship.departedAt>(ships[k].x-115)/3.8+3600,`${id} group ${k+1} leaves too early`);if(k)assert(ship.departedAt>s.ships[k-1].departedAt,'farther groups leave later');});
  assert.equal(s.humans.filter(h=>h.status==='escaped').length,24);assert.equal(s.humans.filter(h=>h.status==='down').length,0,'calm adults never die from hazards');valid(s);
});

test('the tactical notebook names a nearby ground hazard and V6 objectives stay derived from physical events',()=>{
  const d=definition('iskhel-grand-hunt'),slow=d.hazards.find(h=>h.kind==='slow');
  let s=quiet(d.id);s.player.x=slow.x+5;valid(s);const tactical=api.gameReserveTacticalV98(s);
  assert.equal(tactical.hazard.kind,'slow');assert.equal(tactical.hazard.underfoot,true);assert.equal(tactical.route.length,6);
  const objectives=api.gameReserveV109Objectives(s);assert.equal(objectives.mechanicGoal,3);assert.equal(objectives.interceptionGoal,2);assert.equal(objectives.completed,false);
  assert.equal(api.gameReserveV109Objectives(quiet('khar-duun-grand-hunt')).cacheGoal,4);
});

test('V1–V5 decor is render-only native art: exact files, off ramps and depots, and no checkpoint field',()=>{
  const terrains={v1:{version:1},v2:{version:2},v3:{version:3},v4:{version:4},'khar-duun-canyon-expedition':{version:5,reserveId:'khar-duun-canyon-expedition'},'iskhel-ice-expedition':{version:5,reserveId:'iskhel-ice-expedition'}};
  for(const [key,terrain] of Object.entries(terrains)){const data=api.GAME_RESERVE_LEGACY_DECOR[key];assert(data.decor.length>0,key);
    for(const entry of data.art)assert.deepEqual(webpSize('public'+entry.src),[...entry.size],entry.src);
    const ships=api.gameReserveV66Ships(terrain),supplies=api.gameReserveV66Supplies(terrain),width=api.gameReserveV66World(terrain).width;
    for(const item of data.decor){assert(item.art>=0&&item.art<data.art.length);assert(item.x>=0&&item.x+item.w<=width,key);
      if(item.layer==='support')continue;
      for(const ship of ships)assert(item.x>ship.x+200||item.x+item.w<ship.x-200,key+' ramp');for(const x of supplies)assert(item.x>x+30||item.x+item.w<x-30,key+' depot');}}
  const fresh=api.createGameReserveV66(1);assert(!JSON.stringify(fresh).includes('decor'));
});
