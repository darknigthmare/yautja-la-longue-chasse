import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { resolve } from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const html=await readFile(resolve(root,'JOUER_AVPR_WOLF_V07.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
class CL{add(){}remove(){}toggle(){}contains(){return false}}
class Img{constructor(){this.complete=false;this.naturalWidth=0;this.decoding='async';this.src=''}}
const noop=()=>{};const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:noop,set:()=>true});
function element(id=''){return{id,textContent:'',innerHTML:'',style:{},disabled:false,dataset:{},classList:new CL(),onclick:null,title:'',querySelector(){return element()},querySelectorAll(){return[]},getContext(){return ctx},focus(){},appendChild(){},addEventListener(){},setAttribute(){}}}
function boot(search='?test=1'){
  const es=new Map(),get=id=>{if(!es.has(id))es.set(id,element(id));return es.get(id)};
  const document={getElementById:get,querySelectorAll(){return[]},createElement(){return element()},body:element('body')};
  const store=new Map();
  const sb={console,document,Image:Img,location:{search,reload:noop},performance:{now:()=>0},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:()=>1,clearTimeout:noop,URLSearchParams,Math,JSON,Date,addEventListener:noop,removeEventListener:noop,globalThis:null};
  sb.globalThis=sb;vm.createContext(sb);for(const s of scripts)vm.runInContext(s,sb,{timeout:5000});return{api:sb.__AVPR_WOLF_TEST__,store,sb};
}
const results=[];const ok=(name,cond,detail='')=>{if(!cond)throw new Error(name+' FAILED '+detail);results.push(name)};
{
 const {api:a}=boot('?test=1&cut=cinema&room=crash_perimeter');a.transition('wreck_biomask');ok('cinema_skips_unrated',a.room().id==='wreck_trace',a.room().id);
}
{
 const {api:a}=boot('?test=1&room=store_conversion');a.game().player.x=700;a.interact();ok('pistol_built',a.state().flags.pistolBuilt===true);ok('casters_converted',a.state().flags.castersGone===true);ok('pistol_selected',a.state().weapon==='pistol');
}
{
 const {api:a}=boot('?test=1&room=pool_cleanup');const ev=a.game().evidence[0];a.game().player.lane=ev.lane;a.game().player.x=ev.x;a.cleaner();ok('cleaner_marks_evidence',ev.cleaned===true);ok('cleaner_counts_evidence',a.state().completedEvidence===1);
}
{
 const {api:a}=boot('?test=1&room=hospital_three');a.state().flags.pistolBuilt=true;ok('hospital_starts_with_two_pistol_targets',a.game().enemies.length===2);for(const e of a.game().enemies)e.alive=false;a.updateAction(.016);ok('hospital_stage_two',a.game().scriptStage===1);const e=a.game().enemies[0];a.game().player.lane=e.lane;a.game().player.x=e.x-20;a.cleaner();ok('hospital_cleaner_kill',e.alive===false);a.updateAction(.016);ok('hospital_sequence_complete',a.game().objectiveDone===true);
}
{
 const {api:a}=boot('?test=1&room=elevator_fall');a.state().flags.pistolBuilt=true;a.state().weapon='pistol';for(const e of a.game().enemies)e.alive=false;a.updateAction(.016);ok('pistol_lost_after_fall',a.state().flags.pistolLost===true);ok('fallback_to_blades',a.state().weapon==='blades');
}
{
 const {api:a}=boot('?test=1&room=roof_duel');const b=a.game().enemies.find(e=>e.type==='predalien');b.hp=b.maxHp*.6;a.updateBoss(.016);ok('boss_gauntlet_damage',a.state().flags.gauntletDamaged===true);a.chooseWeapon(7);ok('damaged_gauntlet_unavailable',a.state().weapon!=='gauntlet');b.hp=b.maxHp*.4;a.updateBoss(.016);ok('boss_voluntary_mask_remove',a.state().flags.maskRemoved===true);ok('boss_gear_shed',a.state().flags.duelGearShed===true);ok('boss_melee_lock',a.state().weapon==='blades');b.hp=b.maxHp*.18;a.updateBoss(.016);ok('boss_inner_jaw_ripped',a.state().flags.innerJawRipped===true);b.hp=25;a.updateBoss(.016);ok('boss_final_grapple_starts',a.game().grapple?.active===true);for(let i=0;i<8&&a.game().grapple?.active;i++){a.grappleAction('F');a.grappleAction('E')}ok('boss_mutual_stalemate',a.state().flags.stalemate===true);ok('boss_tail_fatality_flag',a.state().flags.fatalTail===true);ok('boss_dead_after_grapple',b.alive===false);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');const p=a.game().player,e=a.game().enemies[0];p.lane=e.lane;e.x=p.x+55;const health=a.game().health;a.parry();a.damagePlayer(14,'xeno',e);ok('parry_blocks_damage',a.game().health===health);ok('parry_stuns_attacker',e.stun>=.8);ok('parry_counter_recorded',a.state().combat.parries===1);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');const p=a.game().player,energy=a.state().energy;a.dodge();ok('dodge_consumes_energy',a.state().energy===energy-8);ok('dodge_grants_invulnerability',p.invuln>=.3);ok('dodge_recorded',a.state().combat.dodges===1);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');const e=a.game().enemies[0];e.hp=1;a.hitEnemy(e,20,'dual');ok('xeno_death_creates_acid_pool',a.game().acidPools.length===1);for(const x of a.game().enemies)x.alive=false;const p=a.game().player,acid=a.game().acidPools[0];p.lane=acid.lane;p.x=acid.x-p.w/2;p.onGround=true;p.invuln=0;const health=a.game().health;a.update(.016);ok('acid_pool_damages_grounded_wolf',a.game().health<health);ok('acid_contact_recorded',a.state().combat.acidHits>=1);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');a.scan();ok('tracking_pulse_works_outside_scan_room',a.game().trackPulse>0);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');const p=a.game().player,e=a.game().enemies[0];for(const other of a.game().enemies)if(other!==e)other.alive=false;p.lane=e.lane;p.x=150;p.onGround=true;p.invuln=0;e.x=215;e.pounceTime=.2;e.attack=0;const health=a.game().health;a.update(.016);ok('xeno_pounce_can_damage',a.game().health<health);
}
{
 const {api:a,store}=boot('?test=1&room=homeworld_signal');store.delete('tantalus.avpr.wolf.v07');store.set('tantalus.avpr.wolf.v06',JSON.stringify({version:'0.6.0-candidate.1',started:true,unrated:true,room:'pool_cleanup',visited:['pool_cleanup'],energy:72,health:81,weapon:'blades',vision:0,cloak:false,completedEvidence:2,flags:{},inventory:{shuriken:5,mines:6,fluid:12,med:2},retries:1}));const migrated=a.load();ok('save_v06_migrates_to_v07',migrated?.version==='0.7.0-candidate.1');ok('migration_preserves_room',migrated?.room==='pool_cleanup');ok('migration_preserves_combat_stats',migrated?.combat?.parries===0);
}

{
 const {api:a}=boot('?test=1&room=forest_buddy');ok('forest_has_no_live_facehuggers',a.game().enemies.length===0);ok('forest_cleanup_four_evidence',a.game().evidence.length===4);
}
{
 const {api:a}=boot('?test=1&room=pool_fight');ok('pool_combistick_locked',a.state().weapon==='combistick');a.chooseWeapon(0);ok('pool_weapon_cannot_change',a.state().weapon==='combistick');
}
{
 const {api:a}=boot('?test=1&room=sewer_breakout');a.game().player.x=2200;a.state().weapon='gauntlet';a.attack();ok('power_punch_breakout_flag',a.state().flags.streetBreakout===true);ok('power_punch_completes_room',a.game().objectiveDone===true);
}
{
 const {api:a}=boot('?test=1&room=store_battle');ok('store_starts_with_two_looters',a.game().enemies.length===2&&a.game().enemies.every(e=>e.type==='human_looter'));for(const e of a.game().enemies)e.alive=false;a.updateAction(.016);ok('store_spawns_five_xenos',a.game().scriptStage===1&&a.game().enemies.length===5&&a.game().enemies.every(e=>e.type==='xeno'));for(const e of a.game().enemies)e.alive=false;a.updateAction(.016);ok('store_damages_caster',a.state().flags.casterDamaged===true);ok('store_sequence_completes',a.game().objectiveDone===true);
}
{
 const c=boot('?test=1&room=sewer_traps&difficulty=canon').api,n=boot('?test=1&room=sewer_traps&difficulty=nightmare').api;ok('difficulty_canon_selected',c.state().difficulty==='canon');ok('difficulty_nightmare_selected',n.state().difficulty==='nightmare');ok('nightmare_enemy_health_scaled',n.game().enemies[0].maxHp>c.game().enemies[0].maxHp);ok('nightmare_enemy_damage_scaled',n.game().enemies[0].damage>c.game().enemies[0].damage);
}
{
 const {api:a}=boot('?test=1&room=pool_cleanup');const before=a.state().hunt.score,ev=a.game().evidence[0];a.game().player.lane=ev.lane;a.game().player.x=ev.x;a.cleaner();ok('cleanup_awards_honor',a.state().hunt.score>before);ok('cleanup_counter_updates',a.state().hunt.cleanups===1);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');const e=a.game().enemies[0],before=a.state().hunt.score;e.hp=1;a.hitEnemy(e,50,'dual');ok('xeno_kill_awards_honor',a.state().hunt.score>before);ok('xeno_kill_counter_updates',a.state().hunt.kills===1);
}
{
 const {api:a}=boot('?test=1&room=homeworld_signal');a.game().roomDamage=0;a.complete();ok('perfect_room_counted',a.state().hunt.perfectRooms===1);ok('perfect_room_id_recorded',a.state().hunt.perfectRoomIds.includes('homeworld_signal'));ok('room_clear_awards_honor',a.state().hunt.score>0);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');const cp=a.state().checkpoint;a.state().inventory.mines=0;a.game().health=0;a.retryCheckpoint(false);ok('checkpoint_restores_room',a.state().room===cp.room);ok('checkpoint_restores_inventory',a.state().inventory.mines===cp.inventory.mines);ok('checkpoint_increments_retries',a.state().retries===1);
}
{
 const {api:a}=boot('?test=1&room=roof_wave');ok('roof_has_single_canonical_xeno',a.game().enemies.length===1&&a.game().enemies[0].type==='xeno');
}
{
 const {api:a}=boot('?test=1&room=maternity_hive');ok('maternity_is_scan_not_invented_fight',a.game().enemies.length===0);a.game().player.x=720;a.scan();ok('maternity_scan_completes',a.game().objectiveDone===true);
}
{
 const {api:a}=boot('?test=1&room=store_battle');const h=a.game().enemies[0];a.state().cloak=true;h.hp=1;a.hitEnemy(h,20,'blades');ok('human_looter_kill_counted_separately',a.state().hunt.humanKills===1);ok('human_kill_not_counted_as_xeno',a.state().hunt.kills===0);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');ok('rank_starts_D',a.huntRank()==='D');a.award(8000,'test');ok('rank_reaches_S',a.huntRank()==='S');
}

{
 const {api:a}=boot('?test=1&room=homeworld_signal');const first=a.award(100,'tracking'),second=a.award(100,'tracking');ok('hunter_chain_increments',a.state().hunt.chain===2);ok('hunter_chain_best_recorded',a.state().hunt.bestChain===2);ok('hunter_chain_multiplier_applies',second>first,`${first}/${second}`);a.update(7);ok('hunter_chain_expires',a.state().hunt.chain===0&&a.state().hunt.chainTimer===0);
}
{
 const {api:a}=boot('?test=1&room=homeworld_signal');a.award(100,'tracking');a.damagePlayer(6,'impact');ok('damage_breaks_hunter_chain',a.state().hunt.chain===0);ok('damage_adds_trauma',a.state().injury.trauma>0);
}
{
 const {api:a}=boot('?test=1&room=homeworld_signal');a.damagePlayer(8,'acide');ok('acid_damage_tracks_burden',a.state().injury.acid>=8);ok('acid_damage_tracks_trauma',a.state().injury.trauma>0);
}
{
 const {api:a}=boot('?test=1&room=tree_medicomp');a.state().flags.wounded=true;a.state().injury={trauma:72,acid:12,canonical:true};a.keys().add('KeyH');a.updateAction(2.3);ok('medicomp_clears_trauma',a.state().injury.trauma===0);ok('medicomp_clears_acid_burden',a.state().injury.acid===0);ok('medicomp_clears_canonical_wound',a.state().injury.canonical===false&&a.state().flags.healed===true);
}
{
 const {api:a}=boot('?test=1&room=power_heat');for(const e of a.game().enemies)e.alive=false;a.updateAction(.016);ok('power_plant_sets_canonical_wound',a.state().injury.canonical===true);ok('power_plant_sets_major_trauma',a.state().injury.trauma>=55);
}
{
 const {api:a}=boot('?test=1&room=homeworld_gear');a.state().injury.trauma=70;a.keys().add('KeyD');a.update(.1);ok('trauma_reduces_mobility',a.game().player.vx<300&&a.game().player.vx>200,a.game().player.vx);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');const p=a.game().player,e=a.game().enemies[0];e.lane=p.lane;e.x=p.x+500;e.role='hunter';a.state().cloak=true;a.hitEnemy(e,1,'dual');const before=e.x;a.update(.1);ok('hit_creates_alert_memory',e.alert>0);ok('alert_memory_defeats_immediate_cloak_reset',e.x<before,`${before}->${e.x}`);
}
{
 const {api:a}=boot('?test=1&room=sewer_traps');const p=a.game().player,e=a.game().enemies[1];e.lane=p.lane;e.x=p.x+250;e.role='flankUp';e.flankCd=0;const before=e.lane;a.update(.016);ok('xeno_pack_flanks_between_lanes',e.lane!==before,`${before}->${e.lane}`);ok('flank_counter_updates',a.state().combat.flanksFaced>=1);
}
{
 const {api:a}=boot('?test=1&room=roof_duel');const b=a.game().enemies.find(e=>e.type==='predalien');b.specialCd=0;b.hp=b.maxHp;a.updateBoss(.016);ok('boss_special_telegraph_starts',b.telegraph>0);ok('boss_special_identified',b.specialKind==='rush');const p=a.game().player;p.lane=b.lane;p.x=b.x-60;p.invuln=1;const health=a.game().health;b.telegraph=.01;a.updateBoss(.02);ok('boss_telegraph_can_be_evaded',a.game().health===health);ok('boss_evade_counter_updates',a.state().combat.bossSpecialsEvaded>=1);
}
{
 const {api:a}=boot('?test=1&room=homeworld_signal');const cp=JSON.parse(JSON.stringify(a.state().checkpoint));a.state().injury.trauma=88;a.state().hunt.chain=4;a.retryCheckpoint(false);ok('checkpoint_restores_injury_state',a.state().injury.trauma===(cp.injury?.trauma||0));ok('checkpoint_restores_chain_state',a.state().hunt.chain===(cp.hunt?.chain||0));
}
{
 const {api:a}=boot('?test=1&room=homeworld_launch');a.transition('craft_transit');ok('chapter_transition_creates_debrief',a.game().chapterDebrief?.chapter===0);ok('chapter_debrief_has_rank',typeof a.game().chapterDebrief?.rank==='string');
}
{
 const {api:a,sb}=boot('?test=1&room=homeworld_signal');a.award(100,'tracking');a.update(.016);ok('chain_metric_updates_ui',sb.document.getElementById('chainText').textContent==='1×',sb.document.getElementById('chainText').textContent);
}

console.log(JSON.stringify({ok:true,total:results.length,tests:results},null,2));
