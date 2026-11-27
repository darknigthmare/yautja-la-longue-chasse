import type { SaveGame } from '../types';
import { SOLO_V70_DEPTH_POSTS_M017, SOLO_V70_PURGE_M017,
  soloV70DepthPostM017, soloV70DepthAppuisM017, soloV70PurgeRemainingM017 } from './firstHuntSoloV70DepthsM017';
import { normalizeSoloV69Campaign, soloV69MatchesSave, templeRankKeepsEarlierTrialV174 } from './campaignSoloV69';
import { normalizeSoloV90Campaign, soloV90AtTempleHandoffM017 } from './campaignSoloV90Progress';
import { createSoloV70State, normalizeSoloV70State, SOLO_V70_PHASES, SOLO_V70_SIGNS, SOLO_V70_ENERGY_VAULT, SOLO_V70_LOAN_RACK, SOLO_V70_QUARANTINE_THRESHOLD,
  SOLO_V70_DEPTHS_M017, soloV70DepthPlatesReadyM017, soloV70HuntTargetM017, SOLO_V70_BELVEDERE, SOLO_V70_RECONNECTION, SOLO_V70_NEF_RELAY_M017, soloV70NefDeploymentM017, soloV70NefPlatesReadyM017, soloV70BelvederePlatesReady, soloV70Receipts, soloV70CampaignPortal, soloV70CanTravel,
  soloV70TrioPresent, soloV70TrioObservation, type SoloV70State, type SoloV70Receipt } from './firstHuntSoloV70';
export interface SoloV70Campaign { version:1;status:'active'|'completed';checkpoint:SoloV70State;receipts:SoloV70Receipt[];startedAt:string;completedAt:string|null }
export type SoloV70Save=SaveGame&{soloV70?:SoloV70Campaign|null};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const iso=(v:unknown):v is string=>typeof v==='string'&&v.length<=128&&Number.isFinite(Date.parse(v));
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function normalizeSoloV70Campaign(v:unknown):SoloV70Campaign|null{if(!record(v)||v.version!==1||!['active','completed'].includes(String(v.status))||!iso(v.startedAt))return null;const checkpoint=normalizeSoloV70State(v.checkpoint);if(!checkpoint||!Array.isArray(v.receipts)||!same(v.receipts,soloV70Receipts(checkpoint)))return null;const complete=checkpoint.phase==='complete';if((v.status==='completed')!==complete||(complete?!iso(v.completedAt)||Date.parse(v.completedAt)<Date.parse(v.startedAt):v.completedAt!==null))return null;return {version:1,status:v.status as SoloV70Campaign['status'],checkpoint,receipts:soloV70Receipts(checkpoint),startedAt:v.startedAt,completedAt:v.completedAt as string|null};}
function prerequisites(v: unknown, completed = false): v is SoloV70Save {
 if (!record(v) || !soloV69MatchesSave(v) || normalizeSoloV69Campaign(v.soloV69)?.status !== 'completed') return false;
 const { prologue, createdAt } = v as unknown as SoloV70Save;
 if (!templeRankKeepsEarlierTrialV174(prologue!.chronicle, completed)) return false;
 if (!prologue?.templeTriadFirstM017) return true;
 const formation = normalizeSoloV90Campaign(v.soloV90);
 return !!formation && formation.ownerCreatedAt === createdAt &&
   (completed ? formation.checkpoint.milestones['roles-positioned'] !== undefined : soloV90AtTempleHandoffM017(formation));
}
const journey=(v:Record<string,unknown>)=>record(v.homeworldRegionV68)&&v.homeworldRegionV68.status!=='at-city'||record(v.homeworldPassageV67)&&v.homeworldPassageV67.status!=='at-city'||record(v.gameReserveV66)&&v.gameReserveV66.status==='active';
export function soloV70MatchesSave(v:unknown){if(!record(v))return false;if(v.soloV70===undefined||v.soloV70===null)return true;const progress=normalizeSoloV70Campaign(v.soloV70);return !!progress&&(!progress.checkpoint.depthsM017||record(v.prologue)&&v.prologue.templeTriadFirstM017===true)&&prerequisites(v, progress.status==='completed')&&!(progress.status==='active'&&journey(v));}
export const canStartSoloV70=(v:unknown)=>record(v)&&prerequisites(v)&&soloV70MatchesSave(v)&&!journey(v);
export function startSoloV70Campaign(save:SoloV70Save,now=new Date().toISOString()):SoloV70Save|null{if(!canStartSoloV70(save)||!iso(now))return null;return save.soloV70?save:{...save,soloV70:{version:1,status:'active',checkpoint:createSoloV70State(save.prologue?.templeTriadFirstM017 === true ? 15 : 9),receipts:[],startedAt:now,completedAt:null}};}
function advance(save:SoloV70Save,raw:SoloV70State,incoming:readonly SoloV70Receipt[],now:string):SoloV70Save|null{
 const before=normalizeSoloV70Campaign(save.soloV70),next=normalizeSoloV70State(raw);if(!before||!next||!canStartSoloV70(save)||!iso(now)||Date.parse(now)<Date.parse(before.startedAt))return null;
 const old=before.checkpoint,delta=next.tick-old.tick,op=SOLO_V70_PHASES.indexOf(old.phase),np=SOLO_V70_PHASES.indexOf(next.phase),receipts=soloV70Receipts(next),fresh=receipts.slice(before.receipts.length);
 if(delta<0||np<op||np>op+1||next.phaseStartedAt<old.phaseStartedAt||next.walked<old.walked||next.walked-old.walked>delta*3.5+.1||next.signs<old.signs||next.signs>old.signs+1||next.signals<old.signals||next.signals-old.signals>delta||next.configuration<old.configuration||next.configuration>old.configuration+1||next.liftTicks<old.liftTicks||next.liftTicks-old.liftTicks>Math.max(1,delta)||next.attempts<old.attempts||next.attempts>old.attempts+1||next.drone.hits<old.drone.hits||next.drone.hits>old.drone.hits+1||next.doorCrossings<old.doorCrossings||next.doorCrossings>old.doorCrossings+1||old.visited.some((x,i)=>x&&!next.visited[i])||before.receipts.some((r,i)=>!same(r,receipts[i]))||fresh.length>1||fresh.some(r=>!incoming.some(i=>same(i,r)))||incoming.some(i=>!receipts.some(r=>same(i,r)))||new Set(incoming.map(i=>i.id)).size!==incoming.length||before.status==='completed'&&!same(old,next))return null;
 const { descent } = SOLO_V70_DEPTHS_M017;
 const hunt = soloV70HuntTargetM017(next);
 const near=(room:number,x:number,y=430,t=40)=>next.room===room&&Math.abs(next.player.x-x)<t&&Math.abs(next.player.y-y)<.01;
 if (old.reconnectionVariant !== next.reconnectionVariant) return null;
 if (old.reconnectionVariant && next.phase === 'configuration' && next.scan > 0 &&
     next.scan > (old.phase === 'configuration' ? old.scan : 0) + delta) return null;
 if (old.reconnectionVariant && fresh[0]?.id === 'second-configuration' &&
     (old.phase !== 'configuration' || old.room !== SOLO_V70_RECONNECTION.room ||
       next.player.vx !== 0 || old.scan + delta < SOLO_V70_RECONNECTION.holdTicks)) return null;
 const previousAdmission = old.riteAdmission, admission = next.riteAdmission;
 if (Boolean(previousAdmission) !== Boolean(admission)) return null;
 if (previousAdmission && admission) {
   if (previousAdmission.sealedEnergy) {
     if (!same(previousAdmission.sealedEnergy, admission.sealedEnergy)) return null;
   } else if (admission.sealedEnergy && (old.phase !== 'arsenal' || old.room !== SOLO_V70_ENERGY_VAULT.room ||
     next.phase !== 'arsenal' || !near(SOLO_V70_ENERGY_VAULT.room, SOLO_V70_ENERGY_VAULT.x) || next.player.vx !== 0 ||
     old.scan + delta < SOLO_V70_ENERGY_VAULT.holdTicks || next.scan !== 0 ||
     !same(admission.sealedEnergy, soloV70TrioObservation(next, 1)))) return null;
   if (fresh[0]?.id === 'arsenal-opened' && (!previousAdmission.sealedEnergy ||
     !near(SOLO_V70_LOAN_RACK.room, SOLO_V70_LOAN_RACK.x) || next.player.vx !== 0 || !soloV70TrioPresent(next))) return null;
   if (previousAdmission.threshold) {
     if (!same(previousAdmission.threshold, admission.threshold)) return null;
   } else if (admission.threshold && (old.phase !== 'quarantine' || old.room !== SOLO_V70_QUARANTINE_THRESHOLD.room ||
     fresh[0]?.id !== 'quarantine-valves' || old.valveTimer <= delta || old.scan + delta < 45 ||
     !near(SOLO_V70_QUARANTINE_THRESHOLD.room, SOLO_V70_QUARANTINE_THRESHOLD.x) || next.player.vx !== 0 ||
     !same(admission.threshold, soloV70TrioObservation(next, 2)))) return null;
 }
 const oldDepths = old.depthsM017, nextDepths = next.depthsM017;
 const startedRelay = !oldDepths?.relay && !!nextDepths?.relay;
 const previousExtension = oldDepths?.extension, nextExtension = nextDepths?.extension;
 const pendingPost = previousExtension && soloV70DepthPostM017(old.room);
 if (Boolean(previousExtension) !== Boolean(nextExtension)) return null;
 if (previousExtension && nextExtension) {
   const { purgeStartedAt } = nextExtension;
   if (purgeStartedAt !== previousExtension.purgeStartedAt &&
       (pendingPost?.id !== 'vent-purge' || nextExtension.observations['vent-purge'] || soloV70PurgeRemainingM017(next) !== SOLO_V70_PURGE_M017.duration ||
        !near(pendingPost.room, SOLO_V70_PURGE_M017.x, SOLO_V70_PURGE_M017.y, 38) ||
        previousExtension.purgeStartedAt !== null && next.tick - previousExtension.purgeStartedAt < SOLO_V70_PURGE_M017.duration ||
        old.phase !== 'return' || next.player.vx !== 0 || old.scan + delta < SOLO_V70_PURGE_M017.holdTicks ||
        next.scan !== 0 || purgeStartedAt !== next.tick)) return null;
   for (const post of SOLO_V70_DEPTH_POSTS_M017) {
     const prior = previousExtension.observations[post.id], recorded = nextExtension.observations[post.id];
     if (prior) {
       if (!same(prior, recorded)) return null;
     } else if (recorded) {
       const party = post.plates
         ? old.companionMode === 'plates' && soloV70DepthAppuisM017(next.companions.map(c => c.x), post.plates)
         : soloV70TrioPresent(next);
       if (!party || old.phase !== 'return' || old.room !== post.room || !near(post.room, post.x, post.y, 38) ||
           next.player.vx !== 0 || old.scan + delta < post.holdTicks || next.scan !== 0 || next.companionMode !== 'follow' ||
           post.id === 'vent-purge' && (!previousExtension.purgeStartedAt || next.tick - previousExtension.purgeStartedAt >= SOLO_V70_PURGE_M017.duration) ||
           !same(recorded, soloV70TrioObservation(next, 3))) return null;
     }
   }
 }
 if (Boolean(oldDepths) !== Boolean(nextDepths)) return null;
 if (oldDepths && nextDepths) {
   if (next.room >= descent.room && next.scan > (old.room === next.room ? old.scan : 0) + delta) return null;
   if (oldDepths.relay) {
     if (!same(oldDepths.relay, nextDepths.relay)) return null;
   } else if (nextDepths.relay && (old.phase !== 'return' || old.room !== descent.room || old.companionMode !== 'plates' ||
     !near(descent.room, descent.x, descent.y, 38) || next.player.vx !== 0 || old.scan + delta < descent.holdTicks ||
     next.scan !== 0 || next.companionMode !== 'follow' || !soloV70DepthPlatesReadyM017(next.companions.map(c => c.x)) ||
     !same(nextDepths.relay, soloV70TrioObservation(next, 3)))) return null;
   if (oldDepths.huntThreshold) {
     if (!same(oldDepths.huntThreshold, nextDepths.huntThreshold)) return null;
   } else if (nextDepths.huntThreshold && (!oldDepths.relay ||
     previousExtension && !previousExtension.observations['vent-purge'] || old.phase !== 'return' || old.room !== hunt.room ||
     !near(hunt.room, hunt.x, 430, 38) || next.player.vx !== 0 || old.scan + delta < hunt.holdTicks || next.scan !== 0 ||
     !soloV70TrioPresent(next) || !same(nextDepths.huntThreshold, soloV70TrioObservation(next, 3)))) return null;
 }
 if (old.belvedereLever) {
   if (!same(old.belvedereLever, next.belvedereLever)) return null;
 } else if (next.belvedereLever) {
   const { room, leverX, holdTicks } = SOLO_V70_BELVEDERE;
   if (old.phase !== 'belvedere' || next.phase !== 'belvedere' || old.room !== room ||
       old.companionMode !== 'plates' || next.companionMode !== 'follow' || next.player.vx !== 0 ||
       !near(room, leverX) || old.scan + delta < holdTicks || next.scan !== 0 ||
       !soloV70BelvederePlatesReady(next.companions.map(c => c.x)) ||
       !same(next.belvedereLever, soloV70TrioObservation(next, 1))) return null;
 }
 if (fresh[0]?.id === 'belvedere-serviced' && next.belvedereLever &&
     (!old.belvedereLever || !soloV70TrioPresent(next))) return null;
 if (old.nefRelayM017) {
   if (!same(old.nefRelayM017, next.nefRelayM017)) return null;
 } else if (next.nefRelayM017) {
   const { room, leverX, upperY, holdTicks } = SOLO_V70_NEF_RELAY_M017;
   if (old.phase !== 'separation' || next.phase !== 'separation' || old.room !== room ||
       old.companionMode !== 'plates' || next.companionMode !== 'follow' || next.player.vx !== 0 ||
       !near(room, leverX, upperY, 38) || old.scan + delta < holdTicks || next.scan !== 0 ||
       soloV70NefDeploymentM017(next) !== null || !soloV70NefPlatesReadyM017(next) ||
       next.nefRelayM017.tick !== next.tick ||
       next.nefRelayM017.x !== next.player.x) return null;
 }
 if (fresh[0]?.id === 'triad-rejoined' && next.nefRelayM017 &&
     (!old.nefRelayM017 || !soloV70TrioPresent(next) || next.player.vx !== 0)) return null;
 if(next.room!==old.room){const side=next.room>old.room?'right':'left',exit=soloV70CampaignPortal(old,old.room,side),entry=soloV70CampaignPortal(next,next.room,side==='right'?'left':'right');if(!soloV70CanTravel(oldDepths ? {...old,tick:next.tick} : old,next.room)||
   oldDepths&&Math.max(old.room,next.room)>=descent.room&&old.companions.some(c=>Math.abs(c.x-exit.x)>delta*2.9+227)||next.doorCrossings!==old.doorCrossings+1||next.lastDoor?.from!==old.room||next.lastDoor.to!==next.room||next.lastDoor.tick!==next.tick||next.roomEnteredAt!==next.tick||Math.abs(old.player.x-exit.x)>delta*3.5+42||!near(next.room,entry.x,entry.y,1)||next.player.vx!==0||next.player.vy!==0)return null;}
 else if(next.doorCrossings!==old.doorCrossings||!same(next.lastDoor,old.lastDoor)||next.attempts===old.attempts&&Math.abs(next.player.x-old.player.x)>delta*3.5+.1)return null;
 if(next.visited.some((x,i)=>x!==(old.visited[i]||i===next.room))||next.room===old.room&&next.companions.some((c,i)=>Math.abs(c.x-old.companions[i].x)>delta*2.9+.1))return null;
 if(next.signs>old.signs){const p=SOLO_V70_SIGNS[old.signs];if(old.phase!=='signs'||!p||!near(2,p.x,p.y)||next.scan!==0)return null;}
 const belvedereSignal = old.phase === 'belvedere' && old.room === SOLO_V70_BELVEDERE.room && !old.belvedereLever &&
   (next.signals > old.signals || Boolean(next.belvedereLever));
 const depthSignal = old.phase === 'return' && old.room === descent.room && oldDepths && !oldDepths.relay &&
   (next.signals > old.signals || startedRelay);
 const postSignal = old.phase === 'return' && pendingPost?.plates && !previousExtension?.observations[pendingPost.id] &&
   (next.signals > old.signals || !!nextExtension?.observations[pendingPost.id]);
 if(next.companionMode!==old.companionMode&&!['oath','separation'].includes(old.phase)&&!belvedereSignal&&!depthSignal&&!postSignal&&!fresh.length)return null;
 if(old.liftTicks===0&&next.liftTicks>0&&(old.phase!=='counterweight'||!near(5,540)))return null;
 if(next.valveTimer>Math.max(0,old.valveTimer-delta)&&(old.phase!=='quarantine'||!near(8,200)||next.valveTimer!==600))return null;
 const retry=next.attempts===old.attempts+1;if(retry){if(old.failedAt===null||next.tick-old.failedAt<90||old.health!==0||next.failedAt!==null||next.health!==6||!near(old.room,125)||next.acid.ttl!==0||next.drone.hits!==old.drone.hits||next.drone.hp!==(old.phase==='drone'?5:old.drone.hp))return null;}
 else if(next.health>old.health||next.drone.hp>old.drone.hp||next.health<old.health-1||next.drone.hp<old.drone.hp-1)return null;
 if(next.drone.hp<old.drone.hp&&(old.phase!=='drone'||next.room!==8||Math.abs(next.player.x-next.drone.x)>=100||next.player.y<=330||next.attackTimer!==18||next.attackCooldown!==45||next.drone.hits!==old.drone.hits+1))return null;
 if(next.configuration!==old.configuration&&!fresh.length)return null;
 if(fresh.length){const id=fresh[0].id;const endpoints:Partial<Record<SoloV70Receipt['id'],[number,number,number]>>={'briefed':[0,160,430],'upper-entry':[0,900,270],'triad-oath':[1,520,430],'signs-read':[2,850,360],'arsenal-opened':[3,820,430],'belvedere-serviced':[SOLO_V70_BELVEDERE.room,SOLO_V70_BELVEDERE.exitX,next.belvedereLever?SOLO_V70_BELVEDERE.lowerY:SOLO_V70_BELVEDERE.upperY],'counterweight-aligned':[5,950,300],'human-truce':[6,740,430],'second-configuration':[7,300,430],'triad-rejoined':[SOLO_V70_NEF_RELAY_M017.room,next.nefRelayM017?SOLO_V70_NEF_RELAY_M017.regroupX:SOLO_V70_RECONNECTION.x,430],'quarantine-valves':[8,980,430],'returned':[0,160,430],'mentor-report':[0,160,430],'opening-attested':[0,160,430]};const target=endpoints[id];if(target&&!near(...target))return null;if(id==='returned'&&next.walked<10000||id==='drone-confined'&&(next.room!==8||next.drone.hp!==0||next.drone.hits<5)||id==='triad-oath'&&!next.companions.every((c,i)=>Math.abs(c.x-[320,730][i])<5)||id==='triad-rejoined'&&!next.nefRelayM017&&!soloV70NefPlatesReadyM017(next))return null;}
 const complete=next.phase==='complete',soloV70:SoloV70Campaign={...before,checkpoint:next,receipts,status:complete?'completed':'active',completedAt:complete?before.completedAt??now:null};if(!normalizeSoloV70Campaign(soloV70))return null;
 // A real local drone combat is retained here, but is not an invented global
 // rite, Queen kill, triad blooding, permanent armament or personal ship grant.
 return {...save,soloV70,profile:{...save.profile,playTimeSeconds:save.profile.playTimeSeconds+Math.max(0,Math.floor(next.tick/60)-Math.floor(old.tick/60))}};
}
export const withSoloV70Checkpoint=(save:SoloV70Save,state:SoloV70State,now=new Date().toISOString())=>advance(save,state,[],now);
export const withSoloV70Progress=(save:SoloV70Save,receipts:readonly SoloV70Receipt[],state:SoloV70State,now=new Date().toISOString())=>advance(save,state,receipts,now);
export const soloV70NeedsScene=(progress:SoloV70Campaign|null|undefined)=>progress?.status==='active';

export function soloV70AllowsTriadHuntM017(save: SaveGame): boolean {
  if (!save.soloV70?.checkpoint.depthsM017) return true;
  const temple = normalizeSoloV70Campaign(save.soloV70);
  return temple?.status === 'completed' && !!temple.checkpoint.depthsM017?.huntThreshold && soloV70MatchesSave(save);
}
