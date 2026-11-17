import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'src',n),'utf8'));
const c=read('campaign.json'),r=read('rooms.json'),e=read('encounters.json'),s=read('secondary.json'),x=read('codex.json');
assert.equal(c.version,'0.5.0');
assert.equal(c.chapters.length,20);
assert.equal(c.beatCount,106);
assert.equal(c.chapters.reduce((n,z)=>n+z.beats.length,0),106);
assert.equal(r.length,95);
assert.equal(s.length,34);
assert.equal(x.length,27);
assert.equal(c.rules.deletedScenesInCampaign,false);
assert.equal(c.rules.perBeatActorOverride,true);
assert.equal(c.rules.lexCompanionSystem,true);
assert.equal(c.rules.scarUnmaskedState,true);
const ids=new Set(r.map(z=>z.id)),keys=new Set();
for(const ch of c.chapters) for(const b of ch.beats){
  assert(ids.has(b.room),b.room);
  const k=ch.id+':'+b.id; assert(!keys.has(k),k); keys.add(k);
}
for(const t of s){assert(ids.has(t.room),t.room);assert.equal(t.canonSafe,true)}
for(const f of ['quinn_duel','quinn_fall','quinn_finished','stafford_net','stafford_executed','weyland_honor','weyland_flame','weyland_killed','chopper_death','celtic_death','scar_trophy_cut','scar_blooded','scar_unmasked','plasma_recovered','nuke_armed','queen_shuriken','queen_combistick','queen_wristblade_launch','scar_fatal','queen_drowned','predalien_emergence'])
  assert(c.chapters.some(ch=>ch.beats.some(b=>(b.flags||[]).includes(f))),f);
assert(e.quinn&&e.stafford&&e.weyland_hostile&&e.queen);
assert(x.some(z=>z.id==='quinn_sequence'));
assert(x.some(z=>z.id==='wrist_blade_projectile_v05'));
assert(read('weapons.json').wrist_blade_projectile);
execFileSync(process.execPath,['--check',path.join(root,'src/game.js')],{stdio:'inherit'});
const st=fs.readFileSync(path.join(root,'AVP_PREDATOR_STANDALONE_V0_5.html'),'utf8');
assert(st.includes('window.__AVP_TEST__'));
assert(!st.includes('src="src/game.js"'));
console.log('VERIFY_OK',{beats:c.beatCount,rooms:r.length,traces:s.length,codex:x.length});
