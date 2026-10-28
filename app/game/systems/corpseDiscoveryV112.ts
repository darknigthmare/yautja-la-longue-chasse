/** Corpse discovery is local evidence, never knowledge of the hunter's location.
 * All distances and timings below are gameplay tuning, not franchise canon.
 * The bounded cursor amortises expensive line-of-sight queries across frames. */
export const CORPSE_DISCOVERY_V112 = Object.freeze({
  scanSeconds: .1, pairsPerScan: 32, maximumReceipts: 1024,
  maximumEvents: 128, maximumReactions: 64, maximumZones: 64,
  maximumPendingRadios: 16, radiosPerScan: 2, recipientsPerRadio: 4,
  sightRadius: 480, scentRadius: 140, radioRadius: 480,
  radioDelaySeconds: .8, reactionSeconds: 7, zoneSeconds: 30, zoneRadius: 260,
});
export type DiscoveryChannelV112 = "visual" | "scent" | "radio";
export type AnimalResponseV112 = "avoid" | "inspect" | "guard";
export interface DiscoveryPointV112 { x:number; y:number }
export interface DiscoveryActorV112 extends DiscoveryPointV112 {
  id:string; kind:"human"|"beast"|"yautja"; factionId:string;
  alive:boolean; active:boolean; boss:boolean; radio:boolean;
  animalResponse:AnimalResponseV112;
}
export interface DiscoveryCorpseV112 extends DiscoveryPointV112 {
  id:string; kind:DiscoveryActorV112["kind"]; erased:boolean; marked:boolean;
  flayed:boolean; supportId:string|null; witnesses:readonly string[];
}
export interface DiscoveryReceiptV112 {
  id:string; corpseId:string; actorId:string; channel:DiscoveryChannelV112;
  at:number; fear:number; sourceActorId:string|null;
}
export interface DiscoveryReactionV112 {
  actorId:string; corpseId:string; channel:DiscoveryChannelV112;
  response:"investigate"|AnimalResponseV112; startedAt:number; until:number;
}
export interface DiscoveryZoneV112 {
  corpseId:string; factionId:string; at:number; fear:number;
}
export interface CorpseDiscoveryStateV112 {
  version:1; runId:string; elapsed:number; nextScanAt:number; cursor:number;
  receipts:DiscoveryReceiptV112[]; events:string[]; reactions:DiscoveryReactionV112[];
  zones:DiscoveryZoneV112[];
  pendingRadios:{corpseId:string;sourceActorId:string;dueAt:number}[];
}
export interface DiscoveryInputV112 {
  now:number; corpses:readonly DiscoveryCorpseV112[]; actors:readonly DiscoveryActorV112[];
  canSee:(actor:DiscoveryActorV112,corpse:DiscoveryCorpseV112)=>boolean;
  canSmell:(actor:DiscoveryActorV112,corpse:DiscoveryCorpseV112)=>boolean;
}
export interface DiscoveryStepV112 {
  state:CorpseDiscoveryStateV112; observations:DiscoveryReceiptV112[];
  metrics:{pairs:number;sightQueries:number;scentQueries:number;radioRecipients:number};
}
const pointDistance=(a:DiscoveryPointV112,b:DiscoveryPointV112)=>Math.hypot(a.x-b.x,a.y-b.y);
const receiptId=(corpseId:string,actorId:string,channel:DiscoveryChannelV112)=>JSON.stringify([corpseId,actorId,channel]);
const corpseFear=(c:DiscoveryCorpseV112)=>c.supportId?35:c.flayed?20:c.marked?8:4;
const active=(a:DiscoveryActorV112)=>a.alive&&a.active&&!a.boss;
/** Ecology catalogue roles explicitly distinguish grazers, scavengers and guards.
 * Unclassified wildlife avoids a body; it never inherits a human terror score. */
export function animalCorpseResponseV112(role:string):AnimalResponseV112 {
  if(/herbivore|brouteur|proie|grazer/i.test(role))return "avoid";
  if(/territorial|gardien|protecteur|meute|sentinelle/i.test(role))return "guard";
  if(/prédateur|predator|chasseur|charognard|nécrophage|carnivore/i.test(role))return "inspect";
  return "avoid";
}
export function createCorpseDiscoveryV112(runId:string):CorpseDiscoveryStateV112 {
  return {version:1,runId,elapsed:0,nextScanAt:0,cursor:0,receipts:[],events:[],reactions:[],zones:[],pendingRadios:[]};
}
export function stepCorpseDiscoveryV112(previous:CorpseDiscoveryStateV112,input:DiscoveryInputV112):DiscoveryStepV112 {
  const metrics={pairs:0,sightQueries:0,scentQueries:0,radioRecipients:0};
  const observations:DiscoveryReceiptV112[]=[];
  if(!Number.isFinite(input.now)||input.now<previous.elapsed)return {state:previous,observations,metrics};
  const state:CorpseDiscoveryStateV112={...previous,elapsed:input.now,
    receipts:[...previous.receipts],events:[...previous.events],
    reactions:previous.reactions.filter(r=>r.until>input.now),
    zones:previous.zones.filter(z=>z.at+CORPSE_DISCOVERY_V112.zoneSeconds>input.now&&input.corpses.some(c=>c.id===z.corpseId&&!c.erased)),
    pendingRadios:previous.pendingRadios.filter(p=>input.corpses.some(c=>c.id===p.corpseId&&!c.erased))};
  if(input.now+1e-9<previous.nextScanAt)return {state,observations,metrics};
  state.nextScanAt=input.now+CORPSE_DISCOVERY_V112.scanSeconds;
  const known=new Set(state.receipts.map(r=>r.id));
  const addReceipt=(corpse:DiscoveryCorpseV112,actor:DiscoveryActorV112,channel:DiscoveryChannelV112,sourceActorId:string|null)=>{
    const id=receiptId(corpse.id,actor.id,channel);
    if(known.has(id)||state.receipts.length>=CORPSE_DISCOVERY_V112.maximumReceipts)return;
    known.add(id);
    const fear=actor.kind==="beast"?0:corpseFear(corpse);
    const receipt:DiscoveryReceiptV112={id,corpseId:corpse.id,actorId:actor.id,channel,at:input.now,fear,sourceActorId};
    state.receipts.push(receipt);observations.push(receipt);
    state.events.push(id);if(state.events.length>CORPSE_DISCOVERY_V112.maximumEvents)state.events.shift();
    const reaction:DiscoveryReactionV112={actorId:actor.id,corpseId:corpse.id,channel,
      response:actor.kind==="beast"?actor.animalResponse:"investigate",
      startedAt:input.now,until:input.now+CORPSE_DISCOVERY_V112.reactionSeconds};
    state.reactions=state.reactions.filter(r=>r.actorId!==actor.id);
    if(state.reactions.length<CORPSE_DISCOVERY_V112.maximumReactions)state.reactions.push(reaction);
    if(actor.kind!=="beast"&&channel==="visual"){
      const zone=state.zones.find(z=>z.corpseId===corpse.id&&z.factionId===actor.factionId);
      if(!zone&&state.zones.length<CORPSE_DISCOVERY_V112.maximumZones)
        state.zones.push({corpseId:corpse.id,factionId:actor.factionId,at:input.now,fear});
      if(actor.radio&&state.pendingRadios.length<CORPSE_DISCOVERY_V112.maximumPendingRadios)
        state.pendingRadios.push({corpseId:corpse.id,sourceActorId:actor.id,dueAt:input.now+CORPSE_DISCOVERY_V112.radioDelaySeconds});
    }
  };
  let dispatched=0;
  for(const pending of [...state.pendingRadios]){
    if(pending.dueAt>input.now||dispatched>=CORPSE_DISCOVERY_V112.radiosPerScan)continue;
    dispatched++;state.pendingRadios=state.pendingRadios.filter(p=>p!==pending);
    const source=input.actors.find(a=>a.id===pending.sourceActorId&&active(a)&&a.radio);
    const corpse=input.corpses.find(c=>c.id===pending.corpseId&&!c.erased);
    if(!source||!corpse)continue;
    const allies=input.actors.filter(a=>active(a)&&a.id!==source.id&&a.kind!=="beast"&&a.radio&&
      a.factionId===source.factionId&&pointDistance(a,source)<=CORPSE_DISCOVERY_V112.radioRadius&&
      !known.has(receiptId(corpse.id,a.id,"visual"))&&!known.has(receiptId(corpse.id,a.id,"radio")))
      .sort((a,b)=>pointDistance(a,source)-pointDistance(b,source)||a.id.localeCompare(b.id))
      .slice(0,CORPSE_DISCOVERY_V112.recipientsPerRadio);
    for(const ally of allies){metrics.radioRecipients++;addReceipt(corpse,ally,"radio",source.id);}
  }
  const corpses=input.corpses.filter(c=>!c.erased);
  const actors=input.actors.filter(active);
  const pairs=corpses.length*actors.length;
  if(!pairs)return {state:{...state,cursor:0},observations,metrics};
  const count=Math.min(pairs,CORPSE_DISCOVERY_V112.pairsPerScan);
  for(let offset=0;offset<count;offset++){
    const index=(state.cursor+offset)%pairs;
    const corpse=corpses[Math.floor(index/actors.length)],actor=actors[index%actors.length];
    metrics.pairs++;
    if(corpse.id===actor.id)continue;
    if(known.has(receiptId(corpse.id,actor.id,"visual"))||known.has(receiptId(corpse.id,actor.id,"scent")))continue;
    // Legacy staged discoveries remain accounted once; a missing V112 ledger
    // must not replay the old fear/morale/sound on resuming a V111 archive.
    if(corpse.witnesses.includes(actor.id)){
      const id=receiptId(corpse.id,actor.id,"visual");
      if(state.receipts.length<CORPSE_DISCOVERY_V112.maximumReceipts){
        state.receipts.push({id,corpseId:corpse.id,actorId:actor.id,channel:"visual",at:input.now,fear:corpseFear(corpse),sourceActorId:null});known.add(id);}
      continue;
    }
    const distance=pointDistance(corpse,actor);
    if(distance<=CORPSE_DISCOVERY_V112.sightRadius){
      metrics.sightQueries++;if(input.canSee(actor,corpse)){addReceipt(corpse,actor,"visual",null);continue;}
    }
    if(actor.kind==="beast"&&distance<=CORPSE_DISCOVERY_V112.scentRadius){
      metrics.scentQueries++;if(input.canSmell(actor,corpse))addReceipt(corpse,actor,"scent",null);
    }
  }
  state.cursor=(state.cursor+count)%pairs;
  return {state,observations,metrics};
}
export function corpseDiscoveryReactionV112(state:CorpseDiscoveryStateV112|undefined,actorId:string,now:number):DiscoveryReactionV112|null {
  return state?.reactions.find(r=>r.actorId===actorId&&r.until>now)??null;
}
export function corpseZoneFearV112(state:CorpseDiscoveryStateV112|undefined,actor:DiscoveryActorV112,
  corpses:readonly DiscoveryCorpseV112[],now:number):number {
  if(!state||actor.kind==="beast")return 0;
  let fear=0;
  for(const zone of state.zones){if(zone.factionId!==actor.factionId||!state.receipts.some(r=>r.actorId===actor.id&&r.corpseId===zone.corpseId))continue;
    const corpse=corpses.find(c=>c.id===zone.corpseId&&!c.erased);if(!corpse)continue;
    const age=Math.max(0,now-zone.at),range=pointDistance(actor,corpse);
    fear=Math.max(fear,zone.fear/100*Math.max(0,1-age/CORPSE_DISCOVERY_V112.zoneSeconds)*
      Math.max(0,1-range/CORPSE_DISCOVERY_V112.zoneRadius));}
  return fear;
}
/** Restore validates identities against real saved actors/corpses. Legacy absence
 * starts an empty ledger; it cannot materialise a corpse, witness or radio source. */
export function restoreCorpseDiscoveryV112(raw:unknown,runId:string,corpses:readonly DiscoveryCorpseV112[],
  actors:readonly DiscoveryActorV112[],elapsed:number):CorpseDiscoveryStateV112|null {
  if(!Number.isFinite(elapsed)||elapsed<0||typeof runId!=="string"||!runId.length)return null;
  if(raw===undefined)return createCorpseDiscoveryV112(runId);
  if(!raw||typeof raw!=="object")return null;
  const s=raw as CorpseDiscoveryStateV112;
  const finite=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
  if(s.version!==1||s.runId!==runId||!finite(s.elapsed)||s.elapsed>elapsed+1e-6||!finite(s.nextScanAt)||s.nextScanAt>s.elapsed+.101||
    !Number.isSafeInteger(s.cursor)||s.cursor<0||s.cursor>1_000_000||
    !Array.isArray(s.receipts)||s.receipts.length>CORPSE_DISCOVERY_V112.maximumReceipts||
    !Array.isArray(s.events)||s.events.length>CORPSE_DISCOVERY_V112.maximumEvents||
    !Array.isArray(s.reactions)||s.reactions.length>CORPSE_DISCOVERY_V112.maximumReactions||
    !Array.isArray(s.zones)||s.zones.length>CORPSE_DISCOVERY_V112.maximumZones||
    !Array.isArray(s.pendingRadios)||s.pendingRadios.length>CORPSE_DISCOVERY_V112.maximumPendingRadios)return null;
  if(s.receipts.some(r=>!r||typeof r!=="object")||s.reactions.some(r=>!r||typeof r!=="object")||
    s.zones.some(z=>!z||typeof z!=="object")||s.pendingRadios.some(p=>!p||typeof p!=="object")||
    s.events.some(id=>typeof id!=="string"))return null;
  const ids=new Set<string>();
  for(const r of s.receipts){
    if(!r||!["visual","scent","radio"].includes(r.channel)||r.id!==receiptId(r.corpseId,r.actorId,r.channel)||ids.has(r.id)||
      !finite(r.at)||r.at>s.elapsed||![0,4,8,20,35].includes(r.fear))return null;
    const c=corpses.find(c=>c.id===r.corpseId),a=actors.find(a=>a.id===r.actorId);
    if(!c||!a||a.boss||a.id===c.id||a.kind==="beast"&&r.fear!==0||a.kind!=="beast"&&r.fear===0||
      r.fear===20&&!c.flayed||r.channel==="scent"&&a.kind!=="beast")return null;
    if(r.channel==="radio"){
      const source=actors.find(a=>a.id===r.sourceActorId);
      const proof=s.receipts.find(p=>p.actorId===r.sourceActorId&&p.corpseId===r.corpseId&&p.channel==="visual");
      if(a.kind==="beast"||!source?.radio||!a.radio||source.factionId!==a.factionId||!proof||r.at+1e-6<proof.at+CORPSE_DISCOVERY_V112.radioDelaySeconds)return null;
    }else if(r.sourceActorId!==null)return null;
    ids.add(r.id);
  }
  if(new Set(s.events).size!==s.events.length||s.events.some(id=>!ids.has(id)))return null;
  const reactions=new Set<string>();
  for(const r of s.reactions){const a=actors.find(a=>a.id===r?.actorId),receipt=s.receipts.find(p=>p.actorId===r?.actorId&&p.corpseId===r?.corpseId&&p.channel===r?.channel);
    if(!r||!a||!receipt||reactions.has(r.actorId)||!finite(r.startedAt)||!finite(r.until)||r.startedAt!==receipt.at||
      Math.abs(r.until-r.startedAt-CORPSE_DISCOVERY_V112.reactionSeconds)>1e-6||
      r.response!==(a.kind==="beast"?a.animalResponse:"investigate"))return null;reactions.add(r.actorId);}
  if(new Set(s.zones.map(z=>JSON.stringify([z?.corpseId,z?.factionId]))).size!==s.zones.length||
    new Set(s.pendingRadios.map(p=>JSON.stringify([p?.corpseId,p?.sourceActorId]))).size!==s.pendingRadios.length)return null;
  for(const z of s.zones){const proof=s.receipts.find(p=>p.corpseId===z?.corpseId&&p.channel==="visual"&&p.fear===z?.fear&&p.at===z?.at&&
    actors.some(a=>a.id===p.actorId&&a.kind!=="beast"&&a.factionId===z?.factionId));
    if(!z||!proof||!finite(z.at)||z.at!==proof.at)return null;}
  for(const p of s.pendingRadios){const source=actors.find(a=>a.id===p?.sourceActorId),proof=s.receipts.find(r=>
    r.actorId===p?.sourceActorId&&r.corpseId===p?.corpseId&&r.channel==="visual");
    if(!p||!source?.radio||!proof||!finite(p.dueAt)||Math.abs(p.dueAt-proof.at-CORPSE_DISCOVERY_V112.radioDelaySeconds)>1e-6)return null;}
  return JSON.parse(JSON.stringify(s)) as CorpseDiscoveryStateV112;
}
