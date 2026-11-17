import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { resolve } from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const html=await readFile(resolve(root,'JOUER_AVPR_WOLF_V07.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
class CL{add(){}remove(){}toggle(){}contains(){return false}}
class Img{constructor(){this.complete=false;this.naturalWidth=0;this.decoding='async';this.src=''}}
const noop=()=>{};const gradient={addColorStop(){}};const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:noop,set:()=>true});
function el(id=''){return{id,textContent:'',innerHTML:'',style:{},disabled:false,dataset:{},classList:new CL(),onclick:null,title:'',querySelector(){return el()},querySelectorAll(){return[]},getContext(){return ctx},focus(){},appendChild(){},addEventListener(){},setAttribute(){}}}
function boot(cut){const es=new Map(),get=id=>{if(!es.has(id))es.set(id,el(id));return es.get(id)};const document={getElementById:get,querySelectorAll(){return[]},createElement(){return el()},body:el('body')};const store=new Map();const sb={console,document,Image:Img,location:{search:`?test=1&cut=${cut}`,reload:noop},performance:{now:()=>0},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:(fn)=>{if(typeof fn==='function')fn();return 1},clearTimeout:noop,URLSearchParams,Math,JSON,Date,addEventListener:noop,removeEventListener:noop,globalThis:null};sb.globalThis=sb;vm.createContext(sb);for(const s of scripts)vm.runInContext(s,sb,{timeout:5000});return sb.__AVPR_WOLF_TEST__}
function cleanAll(a){for(const ev of a.game().evidence){a.game().player.lane=ev.lane;a.game().player.x=ev.x;a.cleaner()}a.updateAction(.016)}
function killAll(a){for(const e of a.game().enemies)e.alive=false;a.updateAction(.016)}
function step(a){const r=a.room(),g=a.game();switch(r.action){
 case'interact':case'loadout':case'unrated_interact':case'capture_bait':case'convert_pistol':g.player.x=720;a.interact();break;
 case'human_script':g.player.x=720;a.interact();if(a.room().id===r.id&&g.evidence?.length){cleanAll(a)}break;
 case'exit':g.player.x=2250;a.updateAction(.016);break;
 case'power_punch_exit':g.player.x=2200;a.state().weapon='gauntlet';a.attack();break;
 case'scan':g.player.x=720;a.scan();break;
 case'cleanup':cleanAll(a);break;
 case'fight':killAll(a);break;
 case'fight_cleanup':for(const e of g.enemies)e.alive=false;cleanAll(a);break;
 case'mine_ambush':g.minesPlaced=r.requiredMines||2;killAll(a);break;
 case'predalien_retreat':{const p=g.enemies.find(e=>e.type==='predalien_shadow');if(p)p.hp=1;for(const e of g.enemies)if(e.type==='xeno')e.alive=false;a.updateAction(.016);break}
 case'power_interference':killAll(a);break;
 case'script':g.roomClock=3;a.updateAction(.016);break;
 case'medicomp':a.state().flags.wounded=true;a.state().injury={trauma:60,acid:8,canonical:true};g.player.vx=0;a.keys().add('KeyH');a.updateAction(2.3);a.keys().delete('KeyH');break;
 case'store_battle':killAll(a);if(a.room().id==='store_battle'&&g.scriptStage===1)killAll(a);break;
 case'hospital_three':for(const e of g.enemies)e.alive=false;a.updateAction(.016);if(a.room().id==='hospital_three'&&g.scriptStage===1){const e=g.enemies[0];g.player.lane=e.lane;g.player.x=e.x-10;a.cleaner();a.updateAction(.016)}break;
 case'shuriken_crossfire':killAll(a);break;
 case'elevator_fall':killAll(a);break;
 case'boss':{const b=g.enemies.find(e=>e.type==='predalien');b.hp=b.maxHp*.6;a.updateBoss(.016);b.hp=b.maxHp*.4;a.updateBoss(.016);b.hp=b.maxHp*.18;a.updateBoss(.016);b.hp=25;a.updateBoss(.016);for(let i=0;i<8&&g.grapple?.active;i++){a.grappleAction('F');a.grappleAction('E')}break}
 case'finale':g.roomClock=3;a.updateAction(.016);break;
 case'epilogue':g.roomClock=2;a.updateAction(.016);break;
 default:throw new Error(`Action inconnue ${r.action} @ ${r.id}`)
}}
function run(cut){const a=boot(cut);const trace=[];for(let guard=0;guard<90&&!a.state().ended;guard++){const before=a.room().id;trace.push(before);step(a);const after=a.room().id;if(before===after&&!a.state().ended&&!a.game().objectiveDone)throw new Error(`Bloqué ${cut} @ ${before}`)}if(!a.state().ended)throw new Error(`Route ${cut} non terminée @ ${a.room().id}`);const expected=cut==='cinema'?45:47;if(a.state().visited.length!==expected)throw new Error(`Visited ${cut}: ${a.state().visited.length} != ${expected}`);if(a.state().syncBeats!==a.state().totalBeats)throw new Error(`Sync ${cut}: ${a.state().syncBeats}/${a.state().totalBeats}`);return{cut,visited:a.state().visited.length,totalBeats:a.state().totalBeats,sync:a.state().syncBeats,evidence:`${a.state().completedEvidence}/${a.state().totalEvidence}`,score:a.state().hunt.score,rank:a.huntRank(),ended:a.state().ended,finalRoom:a.room().id,bestChain:a.state().hunt.bestChain||0,injury:a.state().injury,trace}}
const cinema=run('cinema'),unrated=run('unrated');
console.log(JSON.stringify({ok:true,routes:[cinema,unrated]},null,2));
