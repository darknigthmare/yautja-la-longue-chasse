import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const base = new URL('../', import.meta.url);
const box = {window: {}};
vm.createContext(box);
vm.runInContext(fs.readFileSync(new URL('../v0.1.0/src/badlands-data.js', base),'utf8'),box);
box.BADLANDS_DATA = box.window.BADLANDS_DATA;
const legacySnapshot = JSON.stringify(box.BADLANDS_DATA);
for(const name of ['data','core']) vm.runInContext(fs.readFileSync(new URL(`src/${name}.js`,base),'utf8'),box);
const G = box.BADLANDS_V2, D = G.data;
const advance = (s, seconds, input={}) => {for(let i=0;i<Math.ceil(seconds/.05);i++)G.step(s,.05,input);return s;};
const play = (cid, sid) => {const s=G.create(cid,sid);G.action(s,'confirm');return s;};

test('69 scenes: 25 WY, 44 Dek; 46 inherited and 23 labelled bridges',()=>{
  assert.deepEqual(Array.from(D.campaigns,c=>c.scenes.length),[25,44]);
  const all=D.campaigns.flatMap(c=>c.scenes);
  assert.equal(all.filter(s=>s.bridge).length,23);
  assert.equal(all.filter(s=>!s.bridge).length,46);
  assert.equal(JSON.stringify(box.BADLANDS_DATA),legacySnapshot);
  assert.equal(D.provenance.originalVersionRecovered,false);
});
test('Graphs, equipment and enemy references are valid',()=>{
  for(const c of D.campaigns){assert.equal(new Set(c.scenes.map(s=>s.id)).size,c.scenes.length);
    c.scenes.forEach((s,i)=>{assert.equal(s.prev[0],c.scenes[i-1]?.id);assert.equal(s.next[0],c.scenes[i+1]?.id);assert.ok(s.gear.every(id=>D.weapons[id]));assert.ok(s.enemies.every(id=>D.enemies[id]));if(s.bridge){assert.equal(s.canonLock,false);assert.equal(s.provenance,'original-gameplay-bridge');}});
  }
});
test('Intro and outcome freeze simulation',()=>{const s=G.create('predator');const before=G.serialize(s);advance(s,10,{right:true,fire:true});assert.equal(G.serialize(s),before);});
test('Four depth planes cycle once and jump height is physical',()=>{const s=play('predator');for(let i=0;i<4;i++)G.action(s,'depth');assert.equal(s.player.depth,1);G.action(s,'jump');G.step(s,.05);assert.ok(s.player.z>0);advance(s,2);assert.equal(s.player.z,0);});
test('Cooldown prevents repeated damage in one frame',()=>{const s=play('predator');s.player.depth=s.enemies[0].depth;s.player.x=s.enemies[0].x-50;G.attack(s);const hp=s.enemies[0].hp;G.attack(s);assert.equal(s.enemies[0].hp,hp);});
test('Range and plane restrict attacks',()=>{const s=play('predator');const hp=s.enemies[0].hp;G.attack(s);assert.equal(s.enemies[0].hp,hp);s.player.x=s.enemies[0].x;s.player.depth=(s.enemies[0].depth+1)%4;s.player.cooldown=0;G.attack(s);assert.equal(s.enemies[0].hp,hp);});
test('Ranged ammunition and reload are finite',()=>{const s=play('weyland','wy_jungle_entry');const id=s.gear[s.player.selected],a=s.ammo[id];for(let i=0;i<8;i++){s.player.cooldown=0;G.attack(s);}assert.equal(a.loaded,0);s.player.cooldown=0;assert.equal(G.attack(s),false);G.action(s,'reload');assert.ok(s.player.reload>0);advance(s,1.3);assert.equal(a.loaded,8);assert.equal(a.reserve,24);});
test('Healing uses only two charges, and only a medical kit',()=>{const s=play('weyland','wy_recovery');for(let i=0;i<3;i++){s.player.hp=20;G.action(s,'heal');}assert.equal(s.player.medkits,0);assert.equal(s.player.hp,20);});
test('Puzzle order cannot be skipped',()=>{const s=play('weyland','wy_power');s.player.x=s.nodes[2].x;s.player.depth=s.nodes[2].depth;G.action(s,'interact');assert.equal(s.puzzle,0);assert.equal(s.nodes[2].taken,false);});
test('Multi-target boss does not end on the first target',()=>{const s=play('predator','pred_spike_field');const e=s.enemies[0];s.player.x=e.x-40;s.player.depth=e.depth;while(e.hp>0){s.player.cooldown=0;G.attack(s);}assert.equal(s.phase,'play');assert.ok(s.enemies[1].hp>0);});
test('Kalisk regeneration is an event, not a kill',()=>{const s=play('predator','pred_den'),e=s.enemies[0];s.player.x=e.x-40;s.player.depth=e.depth;while(s.phase==='play'){s.player.cooldown=0;G.attack(s);}assert.equal(s.event,'kalisk-regenerated');assert.equal(e.hp,e.maxHp);});
test('No companions before their story appearance',()=>{assert.equal(play('predator','pred_after_vines').companions.length,0);assert.equal(play('predator','pred_bison').companions.some(c=>c.id==='Bud'),false);assert.ok(play('predator','pred_camp').companions.some(c=>c.id==='Bud'));});
test('Boss telegraphs precede damage; phases accelerate cooldowns',()=>{const s=play('predator','pred_njohrr'),e=s.enemies[0];s.player.x=e.x-60;s.player.depth=e.depth;e.cooldown=0;G.step(s,.05);assert.ok(e.windup>0);assert.equal(s.player.hp,100);advance(s,.8);assert.ok(s.player.hp<100);});
test('Death and retry reset the whole encounter',()=>{let s=play('predator');s.player.hp=0;G.step(s,.05);assert.equal(s.phase,'dead');s=G.action(s,'retry');assert.equal(s.phase,'intro');assert.equal(s.player.hp,100);assert.equal(s.enemies[0].hp,s.enemies[0].maxHp);});
test('Progress, inventory and enemy damage survive serialization',()=>{const s=play('predator','pred_escape');s.player.x=350;s.player.depth=3;s.player.hp=61;s.enemies[0].hp=12;s.done.push('pred_capture');const restored=G.restore(G.serialize(s));assert.equal(restored.player.x,350);assert.equal(restored.player.hp,61);assert.equal(restored.enemies[0].hp,12);assert.ok(restored.done.includes('pred_capture'));});
test('Legacy migration preserves completions; rejects future/corrupt saves',()=>{const r=G.restore({campaign:'predator',scene:'pred_den',done:['pred_vines','bogus']});assert.equal(r.done.length,1);assert.ok(r.done.includes('pred_vines'));assert.equal(r.schema,2);assert.throws(()=>G.restore('{'));assert.throws(()=>G.restore({schema:99,campaign:'predator',scene:'pred_den'}));assert.throws(()=>G.create('bad'));assert.throws(()=>G.create('predator','bad'));});
test('Malformed numeric values are clamped safely',()=>{const s=play('predator');s.player.hp=Infinity;s.player.depth=100;s.player.x=-99;s.player.selected=999;const r=G.restore(s);assert.equal(r.player.hp,100);assert.equal(r.player.depth,3);assert.equal(r.player.x,30);assert.ok(r.player.selected<r.gear.length);});
test('30/60 Hz movement agrees, and outlier frames are bounded',()=>{const a=play('predator'),b=play('predator');for(let i=0;i<60;i++)G.step(a,1/60,{right:true});for(let i=0;i<30;i++)G.step(b,1/30,{right:true});assert.ok(Math.abs(a.player.x-b.player.x)<1e-8);const x=a.player.x;G.step(a,10,{right:true});assert.ok(a.player.x-x<=12.251);});
for(const c of D.campaigns)for(const spec of c.scenes)test(`Objective + exit: ${spec.id}`,()=>{
  let s=play(c.id,spec.id);
  if(['collect','interact'].includes(spec.objectiveType))for(const n of s.nodes){s.player.x=n.x;s.player.depth=n.depth;G.action(s,'interact');}
  else if(spec.objectiveType==='survive'){s.player.x=spec.width*.7;s.player.depth=3;advance(s,15.1);}
  else if(spec.objectiveType==='escort'){s.player.x=spec.width-120;s.player.depth=3;advance(s,24);}
  else {
    for(let rounds=0;s.phase==='play'&&rounds<300;rounds++){
      const e=s.enemies.find(x=>x.hp>0);assert.ok(e,'expected active target');s.player.x=e.x-70;s.player.depth=e.depth;s.player.cooldown=0;
      const id=s.gear[s.player.selected],a=s.ammo[id];
      if(G.weapon(s).kind==='ranged'&&a.loaded===0){G.action(s,'reload');s.player.x=spec.width-100;s.player.depth=3;advance(s,1.3);}
      else G.attack(s);
    }
  }
  assert.equal(s.phase,'outcome',spec.id);assert.ok(s.done.includes(spec.id));G.action(s,'confirm');assert.equal(s.phase,'exit');s.player.x=spec.width-100;s=G.action(s,'interact');if(spec.next.length)assert.equal(s.scene,spec.next[0]);else assert.equal(s.phase,'finished');assert.ok(s.done.includes(spec.id));
});

test('Completion freezes the remaining combat tick',()=>{const s=play('predator','pred_den'),e=s.enemies[0];s.player.x=e.x-40;s.player.depth=e.depth;s.player.hp=1;e.hp=e.maxHp*.43;e.windup=.01;G.step(s,.05,{fire:true});assert.equal(s.phase,'outcome');assert.equal(s.player.hp,1);});

test('Attacks respect the facing direction on the current depth plane',()=>{
  for (const facing of [-1, 1]) for (const targetAhead of [false, true]) {
    const s=play('predator');
    const target=s.enemies[0];
    s.player.depth=target.depth;
    s.player.facing=facing;
    s.player.x=target.x+(targetAhead ? -facing : facing)*50;
    const before=target.hp;
    assert.equal(G.attack(s),true);
    assert.equal(target.hp<before,targetAhead);
    assert.equal(Math.sign(s.shots[0].end-s.shots[0].x),facing);
  }
});
test('A closer enemy behind cannot shield a target in front',()=>{
  const s=play('predator','pred_spike_field'), [behind,ahead]=s.enemies;
  s.player.x=500;s.player.depth=1;s.player.facing=1;
  behind.x=470;behind.depth=1;ahead.x=560;ahead.depth=1;
  const beforeBehind=behind.hp,beforeAhead=ahead.hp;
  assert.equal(G.attack(s),true);
  assert.equal(behind.hp,beforeBehind);
  assert.ok(ahead.hp<beforeAhead);
});
