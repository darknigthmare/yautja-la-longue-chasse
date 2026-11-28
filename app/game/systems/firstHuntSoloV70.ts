import { SOLO_V70_FULL_ROOMS_M017, SOLO_V70_DEPTH_POSTS_M017, SOLO_V70_PURGE_M017,
  SOLO_V70_FINAL_THRESHOLD_M017, SOLO_V70_GALLERY_M017, SOLO_V70_ROYAL_M017,
  soloV70GalleryThreatM017, soloV70RoyalInSweepM017, soloV70RoyalSweepM017,
  SOLO_V70_RESCUE_M017, soloV70RescueTargetM017, soloV70SaarCarryX, soloV70RescuePartyM017,
  soloV70DepthPostM017, soloV70PurgeRemainingM017, soloV70DepthAppuisM017,
  type SoloV70DepthExtensionM017 } from './firstHuntSoloV70DepthsM017';

/** Act I of the clan's original Temple. No AVP replica or completed Blooded rite. */
export const SOLO_V70_PHASES = ['briefing','ascent','oath','signs','arsenal','belvedere','counterweight','humans','configuration','separation','drone','quarantine','return','debrief','recognition','complete'] as const;
export type SoloV70Phase = typeof SOLO_V70_PHASES[number];
export const SOLO_V70_PROOFS = ['briefed','upper-entry','triad-oath','signs-read','arsenal-opened','belvedere-serviced','counterweight-aligned','human-truce','second-configuration','triad-rejoined','drone-confined','quarantine-valves','returned','mentor-report','opening-attested'] as const;
export type SoloV70Proof = typeof SOLO_V70_PROOFS[number];
export interface SoloV70Receipt { id: SoloV70Proof; sourceId: 'solo.temple-opening.v70'; tick: number }
export interface SoloV70Actor { x:number;y:number;vx:number;vy:number;facing:-1|1 }
export interface SoloV70TrioObservation { tick: number; configuration: 1 | 2 | 3; positions: [number, number, number] }
interface SoloV70DepthsM017 {
  relay: SoloV70TrioObservation | null;
  huntThreshold: SoloV70TrioObservation | null;
  extension?: SoloV70DepthExtensionM017;
}
interface SoloV70RiteAdmission {
  version: 1;
  sealedEnergy: SoloV70TrioObservation | null;
  threshold: SoloV70TrioObservation | null;
}
export interface SoloV70State {
 version:1;phase:SoloV70Phase;tick:number;phaseStartedAt:number;room:number;roomEnteredAt:number;walked:number;configuration:1|2|3;visited:boolean[];
 player:SoloV70Actor;companions:[{x:number},{x:number}];companionMode:'follow'|'plates';signals:number;signs:number;scan:number;liftTicks:number;valveTimer:number;
 drone:{x:number;hp:number;mode:'watch'|'telegraph'|'lunge'|'recover'|'dead';age:number;hits:number};health:number;hurtTimer:number;attackTimer:number;attackCooldown:number;acid:{x:number;ttl:number};failedAt:number|null;attempts:number;
 doorCrossings:number;lastDoor:{from:number;to:number;tick:number}|null;inputArmed:boolean;previousJump:boolean;previousInteract:boolean;previousCommand:boolean;milestones:Partial<Record<SoloV70Proof,number>>;
 riteAdmission?: SoloV70RiteAdmission;
 belvedereLever?: SoloV70TrioObservation;
 /** Variant 1 has fixed bridges. Variant 2 unfolds their physical supports after the glyph. */
 reconnectionVariant?: 1 | 2;
 /** Relay opened by a hold from the middle upper footplate. */
 nefRelayM017?: { tick: number; x: number };
 depthsM017?: SoloV70DepthsM017;
}
export interface SoloV70Input { move?:-1|0|1;jump?:boolean;interact?:boolean;command?:boolean }
export interface SoloV70Environment { assetsReady:boolean;pageVisible:boolean;paused:boolean }
export const SOLO_V70_ROOMS = [
 {name:'Marches des Trois',level:'Haut',scene:'camp',platforms:[[300,365,170],[550,310,170],[790,270,330]]},
 {name:'Vestibule des Serments',level:'Haut',scene:'dojo',platforms:[]},
 {name:'Tribune des Signes',level:'Haut',scene:'dojo',platforms:[[200,360,180],[455,300,180],[760,360,180]]},
 {name:'Arsenal des Épreuves',level:'Haut',scene:'quarters',platforms:[]},
 {name:'Belvédère Fracturé',level:'Haut',scene:'camp',platforms:[[290,365,190],[560,310,190],[830,270,290]]},
 {name:'Puits des Contrepoids',level:'Milieu',scene:'dojo',platforms:[[740,300,380]]},
 {name:'Camp des Intrus',level:'Milieu',scene:'quarters',platforms:[[200,350,220]]},
 {name:'Nef des Anneaux',level:'Milieu',scene:'dojo',platforms:[]},
 {name:'Vanne de Quarantaine',level:'Milieu',scene:'dojo',platforms:[[360,360,160]]},
] as const;
const SOLO_V70_DEEP_ROOMS_M017 = [
  { name: 'Descente des Contrepoids', level: 'Profondeurs', scene: 'dojo', platforms: [[350, 372, 160], [530, 316, 235]] },
  { name: 'Galerie des Coques', level: 'Profondeurs', scene: 'quarters', platforms: [[200, 365, 180], [460, 318, 240]] },
] as const;
export const SOLO_V70_DEPTHS_M017 = {
  descent: { room: SOLO_V70_ROOMS.length, x: 660, y: 316, plates: [505, 825], holdTicks: 54, openingTicks: 72 },
  hunt: { room: SOLO_V70_ROOMS.length + 1, x: 950, holdTicks: 45 },
} as const;
const allDepthRoomsM017 = [...SOLO_V70_DEEP_ROOMS_M017, ...SOLO_V70_FULL_ROOMS_M017] as const;
export function soloV70Room(room: number) {
  return SOLO_V70_ROOMS[room] ?? allDepthRoomsM017[room - SOLO_V70_ROOMS.length];
}

export const soloV70HuntTargetM017 = (s: Pick<SoloV70State, 'depthsM017'>) =>
  s.depthsM017?.extension ? SOLO_V70_FINAL_THRESHOLD_M017 : SOLO_V70_DEPTHS_M017.hunt;

export const SOLO_V70_GROUND=430,SOLO_V70_WIDTH=1120;
export const SOLO_V70_SIGNS=[{x:290,y:360},{x:540,y:300},{x:850,y:360}] as const;
export const SOLO_V70_ENERGY_VAULT = { room: 3, x: 460, holdTicks: 36 } as const;
export const SOLO_V70_LOAN_RACK = { room: 3, x: 820 } as const;
export const SOLO_V70_BELVEDERE = { room: 4, leverX: 680, exitX: 950, upperY: 270, lowerY: 430,
  plates: [530, 815], holdTicks: 36 } as const;
export const soloV70PlateTargets = (s: Pick<SoloV70State, 'phase' | 'room' | 'depthsM017'>) =>
  (s.depthsM017?.extension ? soloV70DepthPostM017(s.room, !!s.depthsM017.extension.royal)?.plates : undefined) ?? (
  s.room === SOLO_V70_DEPTHS_M017.descent.room ? SOLO_V70_DEPTHS_M017.descent.plates
  : s.phase === 'oath' ? [320, 730] as const
  : s.phase === 'belvedere' ? SOLO_V70_BELVEDERE.plates : [520, 920] as const);
export const soloV70BelvederePlatesReady = (positions: readonly number[]) =>
  positions.length === 2 && positions.every((x, index) => Math.abs(x - SOLO_V70_BELVEDERE.plates[index]) < 5);
interface SoloV70Platform { x: number; y: number; width: number; oneWay?: true }
export const SOLO_V70_RECONNECTION = {
  room: 7, x: 300, holdTicks: 120,
  platforms: [
    { x: 425, y: 367, width: 132, oneWay: true },
    { x: 620, y: 314, width: 150, oneWay: true },
    { x: 835, y: 350, width: 112, oneWay: true },
  ],
} as const;
export const SOLO_V70_NEF_RELAY_M017 = {
  room: SOLO_V70_RECONNECTION.room,
  leverX: 690,
  upperY: SOLO_V70_RECONNECTION.platforms[1].y,
  regroupX: 895,
  holdTicks: 42,
  plates: [520, 920],
} as const;
const NEF_BRIDGE_TRAVEL_TICKS = 48;
const NEF_BRIDGE_STAGGER_TICKS = 12;
export const SOLO_V70_NEF_DEPLOYMENT_TICKS_M017 =
  NEF_BRIDGE_TRAVEL_TICKS + (SOLO_V70_RECONNECTION.platforms.length - 1) * NEF_BRIDGE_STAGGER_TICKS;
export function soloV70NefDeploymentM017(
  s: Pick<SoloV70State, 'room' | 'configuration' | 'reconnectionVariant' | 'milestones' | 'tick'>,
): number | null {
  const activated = s.milestones['second-configuration'];
  if (s.reconnectionVariant !== 2 || s.room !== SOLO_V70_RECONNECTION.room ||
      s.configuration !== 2 || activated === undefined) return null;
  const elapsed = s.tick - activated;
  return elapsed < SOLO_V70_NEF_DEPLOYMENT_TICKS_M017 ? elapsed : null;
}
export const soloV70NefPlatesReadyM017 = (s: Pick<SoloV70State, 'companions'>) =>
  s.companions.every((companion, index) => Math.abs(companion.x - SOLO_V70_NEF_RELAY_M017.plates[index]) < 5);
export function soloV70ReconnectionPreview(s: SoloV70State) {
  if (!s.reconnectionVariant || s.phase !== 'configuration' || s.room !== SOLO_V70_RECONNECTION.room || !s.scan) return null;
  return { remainingTicks: SOLO_V70_RECONNECTION.holdTicks - s.scan, platforms: SOLO_V70_RECONNECTION.platforms };
}
export const SOLO_V70_QUARANTINE_THRESHOLD = { room: 8, x: 980 } as const;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown,a:number,b:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const int=(v:unknown,a:number,b:number):v is number=>finite(v,a,b)&&Number.isSafeInteger(v);
export const soloV70TrioPresent = (s: SoloV70State) =>
  s.companions.every(companion => Math.abs(companion.x - s.player.x) < 185);
export const soloV70TrioObservation = (s: SoloV70State, configuration: 1 | 2 | 3): SoloV70TrioObservation =>
  ({ tick: s.tick, configuration, positions: [s.player.x, s.companions[0].x, s.companions[1].x] });

export const soloV70DepthPlatesReadyM017 = (positions: readonly number[]) =>
  positions.length === 2 && positions.every((x, index) => Math.abs(x - SOLO_V70_DEPTHS_M017.descent.plates[index]) < 5);
export const soloV70DepthDoorOpeningM017 = (s: Pick<SoloV70State, 'depthsM017' | 'tick'>) => {
  const relay = s.depthsM017?.relay;
  return relay ? Math.max(0, SOLO_V70_DEPTHS_M017.descent.openingTicks - (s.tick - relay.tick)) : null;
};

function readTrioObservation(value: unknown, center: number, configuration: 1 | 2 | 3, maxTick: number,
  stationed?: (positions: readonly number[]) => boolean): SoloV70TrioObservation | null {
  if (!record(value) || Object.keys(value).length !== 3 || value.configuration !== configuration ||
    !int(value.tick, 1, maxTick) || !Array.isArray(value.positions) || value.positions.length !== 3 ||
    !Array.from(value.positions).every(x => finite(x, 65, 1055))) return null;
  const [player, saar, vek] = value.positions as [number, number, number];
  if (Math.abs(player - center) >= 38 || (stationed
    ? !stationed([saar, vek])
    : Math.abs(saar - player) >= 185 || Math.abs(vek - player) >= 185)) return null;
  return { tick: value.tick, configuration, positions: [player, saar, vek] };
}

export const soloV70ProofCount=(s:Pick<SoloV70State,'phase'>)=>SOLO_V70_PHASES.indexOf(s.phase);
export const soloV70Receipts=(s:SoloV70State):SoloV70Receipt[]=>SOLO_V70_PROOFS.slice(0,soloV70ProofCount(s)).map(id=>({id,sourceId:'solo.temple-opening.v70',tick:s.milestones[id]!}));
export function createSoloV70State(rooms: 9 | 11 | 15 = 9):SoloV70State {return {version:1,phase:'briefing',tick:0,phaseStartedAt:0,room:0,roomEnteredAt:0,walked:0,configuration:1,visited:Array.from({ length: rooms }, (_, index) => index === 0),player:{x:125,y:430,vx:0,vy:0,facing:1},companions:[{x:80},{x:65}],companionMode:'follow',signals:0,signs:0,scan:0,liftTicks:0,valveTimer:0,drone:{x:925,hp:5,mode:'watch',age:0,hits:0},health:6,hurtTimer:0,attackTimer:0,attackCooldown:0,acid:{x:925,ttl:0},failedAt:null,attempts:0,doorCrossings:0,lastDoor:null,inputArmed:false,previousJump:false,previousInteract:false,previousCommand:false,milestones:{},riteAdmission:{version:1,sealedEnergy:null,threshold:null},reconnectionVariant:2,...(rooms > 9 ? { depthsM017: { relay: null, huntThreshold: null,
  ...(rooms === 15 ? { extension: { observations: {}, purgeStartedAt: null,
    gallery: { openedAt: null, screened: null }, royal: { startedAt: null, evade: null },
    rescue: { pickedUp: null, delivered: null } } } : {}) } } : {})};}
export function soloV70Platforms(s: SoloV70State): SoloV70Platform[] {
  const fixed: SoloV70Platform[] = soloV70Room(s.room).platforms.map(([x, y, width]) => ({
    x, y, width, ...(s.room >= SOLO_V70_DEPTHS_M017.descent.room ? { oneWay: true } : {}),
  }));
  if (s.room === 5) fixed.push({ x: 440, y: 430 - Math.max(0, s.liftTicks - 1) * 170 / 99, width: 220 });
  if (s.reconnectionVariant && s.room === SOLO_V70_RECONNECTION.room && s.configuration >= 2) {
    const elapsed = soloV70NefDeploymentM017(s);
    if (elapsed === null) fixed.push(...SOLO_V70_RECONNECTION.platforms);
    else for (const [index, platform] of SOLO_V70_RECONNECTION.platforms.entries()) {
      const progress = clamp((elapsed - index * NEF_BRIDGE_STAGGER_TICKS) / NEF_BRIDGE_TRAVEL_TICKS, 0, 1);
      const width = platform.width * progress;
      if (width > 0) fixed.push({
        ...platform,
        x: index === 1 ? platform.x + platform.width - width : platform.x,
        width,
      });
    }
  }
  return fixed;
}
export function soloV70Support(s:SoloV70State,a=s.player){return soloV70Platforms(s).find(p=>a.x>p.x-17&&a.x<p.x+p.width+17&&a.y<=p.y+.01)?.y??430;}
export function soloV70Portal(room:number,side:'left'|'right',configuration:number,belvedereBelow=false){
 const higher = side === 'right' && configuration !== 3;
 return {x:side==='left'?80:1040,y:higher?(room===0||room===4&&!belvedereBelow?270:room===5?300:430):430};
}
export const soloV70CampaignPortal = (s: SoloV70State, room: number, side: 'left' | 'right') =>
  soloV70Portal(room, side, s.configuration, Boolean(s.belvedereLever));
export function soloV70CanTravel(s: SoloV70State, to: number) {
  if (to < 0 || to >= s.visited.length || Math.abs(to - s.room) !== 1) return false;
  const { descent, hunt } = SOLO_V70_DEPTHS_M017;
  if (s.room === SOLO_V70_RESCUE_M017.room && soloV70RescueTargetM017(s.depthsM017?.extension)) return false;
  if (s.depthsM017 && s.phase === 'return') {
    if (s.room === SOLO_V70_QUARANTINE_THRESHOLD.room && to < s.room && !s.depthsM017.huntThreshold) return false;
    if (to === descent.room && to > s.room) return Boolean(s.riteAdmission?.threshold);
    if (to === hunt.room) return soloV70DepthDoorOpeningM017(s) === 0;
    const post = soloV70DepthPostM017(s.room);
    if (post && to > s.room) {
      const extension = s.depthsM017.extension;
      return Boolean(extension?.observations[post.id]) &&
        (post.id !== 'eggs-observed' || !extension?.gallery || !!extension.gallery.screened);
    }
  }
  if (to < s.room) return true;
  return to < descent.room && soloV70ProofCount(s) >= [0, 2, 3, 4, 5, 6, 7, 8, 10][to];
}
export function soloV70NeedsImmediateCheckpoint(a:SoloV70State,b:SoloV70State){return a.phase!==b.phase||a.room!==b.room||a.signs!==b.signs||a.companionMode!==b.companionMode||a.signals!==b.signals||a.liftTicks===0&&b.liftTicks>0||b.valveTimer>a.valveTimer||a.drone.hp!==b.drone.hp||a.health!==b.health||a.failedAt!==b.failedAt||a.attempts!==b.attempts||a.riteAdmission?.sealedEnergy?.tick!==b.riteAdmission?.sealedEnergy?.tick||a.belvedereLever?.tick!==b.belvedereLever?.tick||a.nefRelayM017?.tick!==b.nefRelayM017?.tick||
  a.depthsM017?.extension?.purgeStartedAt!==b.depthsM017?.extension?.purgeStartedAt||
  a.depthsM017?.extension?.gallery?.openedAt!==b.depthsM017?.extension?.gallery?.openedAt||
  a.depthsM017?.extension?.gallery?.screened?.tick!==b.depthsM017?.extension?.gallery?.screened?.tick||
  a.depthsM017?.extension?.royal?.startedAt!==b.depthsM017?.extension?.royal?.startedAt||
  a.depthsM017?.extension?.royal?.evade?.tick!==b.depthsM017?.extension?.royal?.evade?.tick||
  a.depthsM017?.extension?.rescue?.pickedUp?.tick!==b.depthsM017?.extension?.rescue?.pickedUp?.tick||
  a.depthsM017?.extension?.rescue?.delivered?.tick!==b.depthsM017?.extension?.rescue?.delivered?.tick||
  SOLO_V70_DEPTH_POSTS_M017.some(({id})=>a.depthsM017?.extension?.observations[id]?.tick!==b.depthsM017?.extension?.observations[id]?.tick)||
  a.depthsM017?.relay?.tick!==b.depthsM017?.relay?.tick||a.depthsM017?.huntThreshold?.tick!==b.depthsM017?.huntThreshold?.tick||(a.room===b.room&&soloV70NefDeploymentM017(a)!==null&&soloV70NefDeploymentM017(b)===null);}
export function normalizeSoloV70State(v:unknown):SoloV70State|null{
 if (!record(v)) return null;
 const deepRoute = Object.hasOwn(v, 'depthsM017');
 const fullRoute = record(v.depthsM017) && Object.hasOwn(v.depthsM017, 'extension');
 const roomCount = SOLO_V70_ROOMS.length + (fullRoute ? allDepthRoomsM017.length : deepRoute ? SOLO_V70_DEEP_ROOMS_M017.length : 0);
 if(v.version!==1||!SOLO_V70_PHASES.some(p=>p===v.phase)||!int(v.tick,0,5_184_000)||!int(v.phaseStartedAt,0,v.tick)||!int(v.room,0,roomCount-1)||!int(v.roomEnteredAt,0,v.tick)||!finite(v.walked,0,v.tick*3.5+.1)||![1,2,3].includes(v.configuration as number)||!Array.isArray(v.visited)||v.visited.length!==roomCount||!v.visited.every(x=>typeof x==='boolean')||!v.visited[0]||!v.visited[v.room]||!record(v.player)||!Array.isArray(v.companions)||v.companions.length!==2||!v.companions.every(c=>record(c)&&finite(c.x,65,1055))||!['follow','plates'].includes(String(v.companionMode))||!int(v.signals,0,99999)||!int(v.signs,0,3)||!int(v.scan,0,(v.reconnectionVariant===1||v.reconnectionVariant===2)&&v.phase==='configuration'&&v.room===SOLO_V70_RECONNECTION.room?SOLO_V70_RECONNECTION.holdTicks-1:89)||!int(v.liftTicks,0,100)||!int(v.valveTimer,0,600)||!record(v.drone)||!finite(v.drone.x,650,970)||!int(v.drone.hp,0,5)||!['watch','telegraph','lunge','recover','dead'].includes(String(v.drone.mode))||!int(v.drone.age,0,89)||!int(v.drone.hits,0,9999)||!int(v.health,0,6)||!int(v.hurtTimer,0,75)||!int(v.attackTimer,0,18)||!int(v.attackCooldown,0,45)||!record(v.acid)||!finite(v.acid.x,650,970)||!int(v.acid.ttl,0,120)||!(v.failedAt===null||int(v.failedAt,0,v.tick))||!int(v.attempts,0,9999)||!int(v.doorCrossings,0,99999)||!record(v.milestones))return null;
 const a=v.player,count=soloV70ProofCount(v as unknown as SoloV70State),furthest=deepRoute&&count>=12?roomCount-1:[0,0,1,2,3,4,5,6,7,7,8,8,8,8,8,8][count],visited=v.visited;
 if(!['inputArmed','previousJump','previousInteract','previousCommand'].every(k=>typeof v[k]==='boolean')||v.room>furthest||visited.some((x,i)=>x&&(i>furthest||i>0&&!visited[i-1]))||v.doorCrossings<visited.filter(Boolean).length-1)return null;
 if(!finite(a.x,65,1055)||!finite(a.y,130,430)||!finite(a.vx,-3.5,3.5)||!finite(a.vy,-12,16)||![-1,1].includes(a.facing as number)||v.health===0&&v.failedAt===null||v.health>0&&v.failedAt!==null||(v.drone.hp===0)!==(v.drone.mode==='dead')||v.drone.hits<5-v.drone.hp||count>=4&&v.signs!==3||count<3&&v.signs!==0||v.configuration!==(count>=12?3:count>=9?2:1)||count<11&&v.drone.hp===0||count>=11&&v.drone.hp!==0||count<10&&v.drone.hp!==5||count>=7&&v.liftTicks!==100||count<6&&v.liftTicks!==0||count>=13&&v.room!==0||Object.keys(v.milestones).length!==count)return null;
 if(v.lastDoor===null?v.doorCrossings!==0:!record(v.lastDoor)||!int(v.lastDoor.from,0,roomCount-1)||!int(v.lastDoor.to,0,roomCount-1)||Math.abs(v.lastDoor.from-v.lastDoor.to)!==1||!int(v.lastDoor.tick,1,v.tick)||v.lastDoor.to!==v.room||v.lastDoor.tick!==v.roomEnteredAt||v.doorCrossings<1)return null;
 if (v.reconnectionVariant !== undefined && v.reconnectionVariant !== 1 && v.reconnectionVariant !== 2) return null;
 if (v.reconnectionVariant && v.phase === 'configuration' && (v.scan as number) > 0 &&
     (v.room !== SOLO_V70_RECONNECTION.room || Math.abs((a.x as number) - SOLO_V70_RECONNECTION.x) >= 38 ||
       a.y !== SOLO_V70_GROUND || a.vx !== 0)) return null;
 const milestones:SoloV70State['milestones']={};let prior=0;for(const id of SOLO_V70_PROOFS.slice(0,count)){const tick=v.milestones[id];if(!int(tick,1,v.tick)||tick<=prior)return null;milestones[id]=tick;prior=tick;}if(prior!==v.phaseStartedAt)return null;
 const reconnectedAt = milestones['second-configuration'];
 if (v.reconnectionVariant && reconnectedAt !== undefined &&
     reconnectedAt - milestones['human-truce']! < SOLO_V70_RECONNECTION.holdTicks) return null;
 let riteAdmission: SoloV70RiteAdmission | undefined;
 if (Object.hasOwn(v, 'riteAdmission')) {
   const raw = v.riteAdmission;
   if (!record(raw) || Object.keys(raw).length !== 3 || raw.version !== 1) return null;
   const seal = raw.sealedEnergy === null ? null : readTrioObservation(raw.sealedEnergy, SOLO_V70_ENERGY_VAULT.x, 1, v.tick);
   const threshold = raw.threshold === null ? null : readTrioObservation(raw.threshold, SOLO_V70_QUARANTINE_THRESHOLD.x, 2, v.tick);
   if (raw.sealedEnergy !== null && !seal || raw.threshold !== null && !threshold) return null;
   const arsenalOpened = milestones['arsenal-opened'];
   const signsRead = milestones['signs-read'];
   const thresholdReached = milestones['quarantine-valves'];
   if ((seal && (signsRead === undefined || seal.tick - signsRead < SOLO_V70_ENERGY_VAULT.holdTicks)) ||
     (arsenalOpened !== undefined && (!seal || seal.tick >= arsenalOpened)) ||
     (threshold?.tick ?? null) !== (thresholdReached ?? null)) return null;
   riteAdmission = { version: 1, sealedEnergy: seal, threshold };
 }
 let depthsM017: SoloV70DepthsM017 | undefined;
  if (deepRoute) {
    const raw = v.depthsM017, { descent, hunt } = SOLO_V70_DEPTHS_M017;
    if (!riteAdmission || !record(raw) || Object.keys(raw).length !== (fullRoute ? 3 : 2)) return null;
    const relay = raw.relay === null ? null
      : readTrioObservation(raw.relay, descent.x, 3, v.tick, soloV70DepthPlatesReadyM017);
    const final = fullRoute ? SOLO_V70_FINAL_THRESHOLD_M017 : hunt;
    const huntThreshold = raw.huntThreshold === null ? null : readTrioObservation(raw.huntThreshold, final.x, 3, v.tick);
    if (raw.relay !== null && !relay || raw.huntThreshold !== null && !huntThreshold) return null;
    const opened = riteAdmission.threshold?.tick;
    if (opened === undefined && visited[descent.room] ||
        relay && (opened === undefined || !visited[descent.room] || relay.tick - opened < descent.holdTicks) ||
        visited[hunt.room] && (!relay || v.tick - relay.tick < descent.openingTicks) ||
        huntThreshold && (!relay || !visited[final.room] || huntThreshold.tick - relay.tick < descent.openingTicks + hunt.holdTicks) ||
        milestones.returned !== undefined && (!huntThreshold || huntThreshold.tick >= milestones.returned) ||
        opened !== undefined && v.room < SOLO_V70_QUARANTINE_THRESHOLD.room && !huntThreshold) return null;
    let extension: SoloV70DepthExtensionM017 | undefined;
    if (fullRoute) {
      const proof = raw.extension;
      if (!record(proof) || !record(proof.observations)) return null;
      const hasGallery = Object.hasOwn(proof, 'gallery'), hasRoyal = Object.hasOwn(proof, 'royal');
      const hasRescue = Object.hasOwn(proof, 'rescue');
      if (hasRescue && !hasRoyal || hasRoyal && !hasGallery ||
          Object.keys(proof).length !== 2 + Number(hasGallery) + Number(hasRoyal) + Number(hasRescue)) return null;
      const observations: SoloV70DepthExtensionM017['observations'] = {};
      let elapsedFrom = relay ? relay.tick + descent.openingTicks : v.tick;
      for (const candidate of SOLO_V70_DEPTH_POSTS_M017) {
        const post = soloV70DepthPostM017(candidate.room, hasRoyal)!;
        const value = proof.observations[post.id];
        if (value === undefined) {
          if (visited[post.room + 1]) return null;
          continue;
        }
        const plates = post.plates;
        const observation = readTrioObservation(value, post.x, 3, v.tick,
          plates ? positions => soloV70DepthAppuisM017(positions, plates) : undefined);
        if (!relay || !visited[post.room] || !observation || observation.tick < elapsedFrom + post.holdTicks) return null;
        observations[post.id] = observation;
        elapsedFrom = observation.tick;
      }
      if (Object.keys(observations).length !== Object.keys(proof.observations).length) return null;
      const { purgeStartedAt } = proof, lock = observations['royal-lock'], purge = observations['vent-purge'];
      if (purgeStartedAt !== null && (!lock || !visited[final.room] ||
          !int(purgeStartedAt, lock.tick + SOLO_V70_PURGE_M017.holdTicks, v.tick))) return null;
      if (purge && (purgeStartedAt === null || purge.tick < purgeStartedAt + 45 ||
          purge.tick >= purgeStartedAt + SOLO_V70_PURGE_M017.duration)) return null;
      if (huntThreshold && (!purge || huntThreshold.tick < purge.tick + final.holdTicks)) return null;
      let gallery: SoloV70DepthExtensionM017['gallery'];
      if (Object.hasOwn(proof, 'gallery')) {
        const rawGallery = proof.gallery, eggs = observations['eggs-observed'];
        const galleryPost = SOLO_V70_GALLERY_M017;
        if (!record(rawGallery) || Object.keys(rawGallery).length !== 2) return null;
        let openedAt: number | null = null;
        if (rawGallery.openedAt !== null) {
          if (!eggs || !int(rawGallery.openedAt, eggs.tick + galleryPost.hatchDelay, v.tick)) return null;
          openedAt = rawGallery.openedAt;
        }
        const screened = rawGallery.screened === null ? null : readTrioObservation(rawGallery.screened, galleryPost.x, 3, v.tick);
        const resin = observations['resin-anchor'];
        if (rawGallery.screened !== null && !screened || visited[galleryPost.room + 1] && !screened ||
            screened && (openedAt === null || screened.tick - openedAt < galleryPost.holdTicks) ||
            resin && (!screened || resin.tick < screened.tick + SOLO_V70_DEPTH_POSTS_M017[1].holdTicks)) return null;
        gallery = { openedAt, screened };
      }
      let royal: SoloV70DepthExtensionM017['royal'];
      if (hasRoyal) {
        const rawRoyal = proof.royal, { room, coverY, warningTicks } = SOLO_V70_ROYAL_M017;
        const screen = observations['containment-screen'];
        if (!record(rawRoyal) || Object.keys(rawRoyal).length !== 2) return null;
        let startedAt: number | null = null;
        if (rawRoyal.startedAt !== null) {
          if (!screen || !visited[room] || !int(rawRoyal.startedAt, screen.tick + 1, v.tick)) return null;
          startedAt = rawRoyal.startedAt;
        }
        let evade: NonNullable<SoloV70DepthExtensionM017['royal']>['evade'] = null;
        if (rawRoyal.evade !== null) {
          const mark = rawRoyal.evade;
          if (!record(mark) || Object.keys(mark).length !== 3 || startedAt === null ||
              !int(mark.tick, startedAt + warningTicks, v.tick) || !finite(mark.x, 65, 1055) ||
              !finite(mark.y, 130, coverY) || !soloV70RoyalInSweepM017(mark.x) ||
              soloV70RoyalSweepM017(startedAt, mark.tick).stage !== 'strike') return null;
          evade = { tick: mark.tick, x: mark.x, y: mark.y };
        }
        if (lock && (!evade || lock.tick < evade.tick + soloV70DepthPostM017(room)!.holdTicks)) return null;
        royal = { startedAt, evade };
      }
      let rescue: SoloV70DepthExtensionM017['rescue'];
      if (hasRescue) {
        const mark = proof.rescue, { room, pickup, relief, carrySpeed } = SOLO_V70_RESCUE_M017;
        if (!record(mark) || Object.keys(mark).length !== 2) return null;
        const pickedUp = mark.pickedUp === null ? null : readTrioObservation(mark.pickedUp, pickup.x, 3, v.tick);
        const delivered = mark.delivered === null ? null : readTrioObservation(mark.delivered, relief.x, 3, v.tick);
        if (mark.pickedUp !== null && !pickedUp || mark.delivered !== null && !delivered) return null;
        if (pickedUp && (!lock || !visited[room] || pickedUp.tick < lock.tick + pickup.holdTicks ||
            !soloV70RescuePartyM017(pickedUp.positions))) return null;
        if (delivered && (!pickedUp || !soloV70RescuePartyM017(delivered.positions) ||
            delivered.tick - pickedUp.tick < relief.holdTicks + Math.ceil((delivered.positions[0] - pickedUp.positions[0]) / carrySpeed))) return null;
        if (purgeStartedAt !== null && (!delivered || purgeStartedAt < delivered.tick + SOLO_V70_PURGE_M017.holdTicks)) return null;
        if (visited[room] && !delivered) {
          const saar = (v.companions[0] as { x: number }).x;
          if (v.room !== room || v.companionMode !== 'follow' ||
              Math.abs(saar - (pickedUp ? soloV70SaarCarryX(a.x as number) : pickup.x)) >= .01 ||
              pickedUp && (a.y !== relief.y || a.vy !== 0 || Math.abs(a.vx as number) > carrySpeed)) return null;
        }
        rescue = { pickedUp, delivered };
      }
      extension = { observations, purgeStartedAt, ...(gallery ? { gallery } : {}), ...(royal ? { royal } : {}),
        ...(rescue ? { rescue } : {}) };
    }
    const post = extension && soloV70DepthPostM017(v.room, !!extension.royal);
    const royalPending = post?.id === 'royal-lock' && extension?.royal && !extension.royal.evade;
    const plates = post && !royalPending && !extension?.observations[post.id] && post.plates;
    if (post && v.scan) {
      const purgeComplete = extension?.observations['vent-purge'];
      const valveAt = extension?.purgeStartedAt;
      const purgeOpen = valveAt != null && v.tick - valveAt < SOLO_V70_PURGE_M017.duration;
      const gallery = extension?.gallery;
      const screening = post.id === 'eggs-observed' && gallery?.openedAt != null && !gallery.screened;
      const rescueTarget = post.id === 'vent-purge' ? soloV70RescueTargetM017(extension) : undefined;
      const target = rescueTarget ?? (post.id === 'vent-purge'
        ? purgeComplete ? { ...final, y: SOLO_V70_GROUND } : purgeOpen ? post : SOLO_V70_PURGE_M017
        : screening ? SOLO_V70_GALLERY_M017 : post);
      const hold = post.id === 'vent-purge' || screening || !extension?.observations[post.id];
      const party = (v.companions as { x: number }[]).map(companion => companion.x);
      if (!hold || royalPending || huntThreshold || (v.scan as number) >= target.holdTicks || Math.abs((a.x as number) - target.x) >= 38 ||
          a.vx !== 0 || a.y !== target.y || (plates
            ? v.companionMode !== 'plates' || !soloV70DepthAppuisM017(party, plates)
            : target !== SOLO_V70_PURGE_M017 && party.some(x => Math.abs(x - (a.x as number)) >= 185))) return null;
    } else if (v.room >= descent.room && v.scan) {
      const target = v.room === descent.room ? descent : hunt;
      if ((v.scan as number) >= target.holdTicks || Math.abs((a.x as number) - target.x) >= 38 || a.vx !== 0 ||
          (v.room === descent.room
            ? relay || a.y !== descent.y || v.companionMode !== 'plates' ||
              !soloV70DepthPlatesReadyM017((v.companions as { x: number }[]).map(companion => companion.x))
            : huntThreshold || a.y !== SOLO_V70_GROUND ||
              (v.companions as { x: number }[]).some(companion => Math.abs(companion.x - (a.x as number)) >= 185))) return null;
    }
    if (v.room >= descent.room && v.companionMode === 'plates' && !plates && (v.room !== descent.room || relay)) return null;
    depthsM017 = { relay, huntThreshold, ...(extension ? { extension } : {}) };
  }
  let belvedereLever: SoloV70TrioObservation | undefined;
 if (Object.hasOwn(v, 'belvedereLever')) {
   const lever = readTrioObservation(v.belvedereLever, SOLO_V70_BELVEDERE.leverX, 1, v.tick);
   const opened = milestones['arsenal-opened'];
   const passed = milestones['belvedere-serviced'];
   if (!lever || opened === undefined || lever.tick - opened < SOLO_V70_BELVEDERE.holdTicks ||
       passed !== undefined && lever.tick >= passed || !soloV70BelvederePlatesReady(lever.positions.slice(1))) return null;
   belvedereLever = lever;
 }
 let nefRelayM017: SoloV70State['nefRelayM017'];
 if (Object.hasOwn(v, 'nefRelayM017')) {
   const relay = v.nefRelayM017, { holdTicks, leverX, regroupX } = SOLO_V70_NEF_RELAY_M017;
   const rejoined = milestones['triad-rejoined'];
   const deploymentDelay = v.reconnectionVariant === 2 ? SOLO_V70_NEF_DEPLOYMENT_TICKS_M017 - 1 : 0;
   if (!v.reconnectionVariant || reconnectedAt === undefined || !record(relay) || Object.keys(relay).length !== 2 ||
       !int(relay.tick, reconnectedAt + holdTicks + deploymentDelay, v.tick) || !finite(relay.x, leverX - 38, leverX + 38) ||
       (rejoined !== undefined && rejoined - relay.tick < (regroupX - 38 - relay.x) / 3.5) ||
       (v.phase === 'separation' && v.companionMode !== 'follow')) return null;
   nefRelayM017 = { tick: relay.tick, x: relay.x };
 }
 return {...v,player:{...a},companions:v.companions.map(c=>({...c})),drone:{...v.drone},acid:{...v.acid},visited:[...v.visited],milestones,
   ...(depthsM017 ? { depthsM017 } : {}),
    ...(nefRelayM017 ? { nefRelayM017 } : {}),
   ...(belvedereLever ? { belvedereLever } : {}),
   ...(riteAdmission ? { riteAdmission } : {}),inputArmed:false,previousJump:false,previousInteract:false,previousCommand:false} as unknown as SoloV70State;
}
export function stepSoloV70(state:SoloV70State,input:SoloV70Input,env:SoloV70Environment):{state:SoloV70State;receipts:SoloV70Receipt[]}{
 const s:SoloV70State={...state,...(state.depthsM017 ? { depthsM017: { ...state.depthsM017,
  ...(state.depthsM017.extension ? { extension: { ...state.depthsM017.extension,
    observations: { ...state.depthsM017.extension.observations },
    ...(state.depthsM017.extension.gallery ? { gallery: { ...state.depthsM017.extension.gallery } } : {}),
    ...(state.depthsM017.extension.royal ? { royal: { ...state.depthsM017.extension.royal } } : {}),
    ...(state.depthsM017.extension.rescue ? { rescue: { ...state.depthsM017.extension.rescue } } : {}) } } : {}) } } : {}),...(state.riteAdmission ? { riteAdmission: { ...state.riteAdmission } } : {}),player:{...state.player},companions:state.companions.map(c=>({...c})) as SoloV70State['companions'],drone:{...state.drone},acid:{...state.acid},visited:[...state.visited],milestones:{...state.milestones}},receipts:SoloV70Receipt[]=[];
 if(!env.assetsReady||!env.pageVisible||env.paused||s.phase==='complete'){s.inputArmed=false;s.previousJump=s.previousInteract=s.previousCommand=false;return {state:s,receipts};}
 if(!s.inputArmed){if(!input.move&&!input.jump&&!input.interact&&!input.command)s.inputArmed=true;return {state:s,receipts};}
 const jump=!!input.jump&&!s.previousJump,interact=!!input.interact&&!s.previousInteract,command=!!input.command&&!s.previousCommand;s.previousJump=!!input.jump;s.previousInteract=!!input.interact;s.previousCommand=!!input.command;s.tick++;
 if(s.failedAt!==null){if(interact&&s.tick-s.failedAt>=90){s.health=6;s.failedAt=null;s.attempts++;s.player={x:125,y:430,vx:0,vy:0,facing:1};if(s.phase==='drone'){s.drone={x:925,hp:5,mode:'watch',age:0,hits:s.drone.hits};}s.hurtTimer=75;s.acid.ttl=0;s.inputArmed=false;}return {state:s,receipts};}
 const extension = s.depthsM017?.extension;
 const rescue = extension?.rescue;
 const rescueTarget = s.room === SOLO_V70_RESCUE_M017.room ? soloV70RescueTargetM017(extension) : undefined;
 const carrying = !!rescueTarget && !!rescue?.pickedUp;
 const a=s.player,oldX=a.x,oldLift=soloV70Platforms(s).find(p=>s.room===5&&p.x===440);let oldY=a.y;
 if(s.phase==='counterweight'&&s.room===5&&s.liftTicks>0)s.liftTicks=Math.min(100,s.liftTicks+1);
 const newLift=soloV70Platforms(s).find(p=>s.room===5&&p.x===440);if(oldLift&&newLift&&a.y===oldLift.y&&a.x>423&&a.x<677){a.y=newLift.y;oldY=a.y;}
 a.vx=(input.move===-1?-1:input.move===1?1:0)*(carrying ? SOLO_V70_RESCUE_M017.carrySpeed : 3.5);if(a.vx)a.facing=a.vx<0?-1:1;
 if(!carrying&&jump&&a.vy===0&&a.y===soloV70Support(s))a.vy=-11.7;
 a.x=clamp(a.x+a.vx,65,s.phase==='drone'&&s.room===8?820:1055);
 // Gallery slabs have a real upper contact plane and a thin side edge. Their
 // service passage remains usable below, including after configuration III.
 // Nef bridges allow a jump through the underside without a lateral collision.
 for(const p of soloV70Platforms(s))if(!p.oneWay&&a.y>p.y+.01&&a.y<p.y+28&&a.x>p.x-17&&a.x<p.x+p.width+17){a.x=clamp(oldX<=p.x-17?p.x-17:p.x+p.width+17,65,1055);a.vx=0;}
 a.vy=Math.min(16,a.vy+.52);let y=a.y+a.vy;for(const p of soloV70Platforms(s))if(a.vy>=0&&oldY<=p.y+.01&&y>=p.y&&a.x>p.x-17&&a.x<p.x+p.width+17){y=p.y;a.vy=0;}if(y>=430){y=430;a.vy=0;}a.y=y;s.walked+=Math.abs(a.x-oldX);
 s.valveTimer=Math.max(0,s.valveTimer-1);s.hurtTimer=Math.max(0,s.hurtTimer-1);s.attackTimer=Math.max(0,s.attackTimer-1);s.attackCooldown=Math.max(0,s.attackCooldown-1);s.acid.ttl=Math.max(0,s.acid.ttl-1);
 const plateTargets=soloV70PlateTargets(s);s.companions.forEach((c,i)=>{if (i === 0 && rescueTarget) {
   c.x = carrying ? soloV70SaarCarryX(a.x) : rescueTarget.x;
   return;
 } const target=s.companionMode==='plates'?plateTargets[i]:clamp(a.x-65*(i+1),65,1055);if(Math.abs(target-c.x)>3)c.x=clamp(c.x+Math.sign(target-c.x)*2.9,65,1055);});
 const near=(x:number,y=430,t=38)=>Math.abs(a.x-x)<t&&Math.abs(a.y-y)<.01;
 const transition=(phase:SoloV70Phase)=>{s.phase=phase;s.phaseStartedAt=s.tick;s.scan=0;s.inputArmed=false;s.previousJump=s.previousInteract=s.previousCommand=false;s.companionMode='follow';};
 const proof=(id:SoloV70Proof,phase:SoloV70Phase)=>{s.milestones[id]=s.tick;receipts.push({id,sourceId:'solo.temple-opening.v70',tick:s.tick});transition(phase);};
 const scan=(condition:boolean,ticks:number)=>{s.scan=condition?s.scan+1:0;return s.scan>=ticks;};
 const { descent } = SOLO_V70_DEPTHS_M017;
 const royal = extension?.royal;
 const currentPost = extension && s.phase === 'return' ? soloV70DepthPostM017(s.room, !!royal) : undefined;
 const royalPending = currentPost?.id === 'royal-lock' && royal && !royal.evade;
 const pendingPost = currentPost && !royalPending && !extension?.observations[currentPost.id] ? currentPost : undefined;
 const atDepthRelay = s.phase === 'return' && s.room === descent.room && s.depthsM017 && !s.depthsM017.relay;
 if(command&&(atDepthRelay||pendingPost?.plates||s.phase==='oath'||s.phase==='separation'&&!s.nefRelayM017||s.phase==='belvedere'&&s.room===SOLO_V70_BELVEDERE.room&&!s.belvedereLever)){s.companionMode=s.companionMode==='follow'?'plates':'follow';s.signals++;}
 if(s.phase==='briefing'&&s.room===0&&near(160)&&interact)proof('briefed','ascent');
 else if(s.phase==='ascent'&&s.room===0&&near(900,270)&&interact)proof('upper-entry','oath');
 else if(s.phase==='oath'&&s.room===1&&scan(near(520)&&!a.vx&&s.companionMode==='plates'&&s.companions.every((c,i)=>Math.abs(c.x-plateTargets[i])<5)&&!!input.interact,45))proof('triad-oath','signs');
 else if(s.phase==='signs'&&s.room===2){const target=SOLO_V70_SIGNS[s.signs];if(target&&scan(near(target.x,target.y)&&!a.vx&&!!input.interact,30)){s.signs++;s.scan=0;if(s.signs===3)proof('signs-read','arsenal');}}
 else if (s.phase === 'arsenal' && s.room === SOLO_V70_ENERGY_VAULT.room) {
   const admission = s.riteAdmission;
   if (admission && !admission.sealedEnergy) {
     if (scan(near(SOLO_V70_ENERGY_VAULT.x) && !a.vx && soloV70TrioPresent(s) && !!input.interact, SOLO_V70_ENERGY_VAULT.holdTicks)) {
       admission.sealedEnergy = soloV70TrioObservation(s, 1);
       s.scan = 0;
     }
   } else if (scan(near(SOLO_V70_LOAN_RACK.x) && !a.vx && (!admission || soloV70TrioPresent(s)) && !!input.interact, 45)) {
     proof('arsenal-opened','belvedere');
   }
 }
 else if(s.phase==='belvedere'&&s.room===SOLO_V70_BELVEDERE.room){
   const { leverX, exitX, upperY, lowerY, holdTicks } = SOLO_V70_BELVEDERE;
   if (!s.belvedereLever && near(exitX, upperY) && interact) {
     proof('belvedere-serviced','counterweight');
   } else if (!s.belvedereLever && scan(near(leverX) && !a.vx && s.companionMode === 'plates' &&
       soloV70BelvederePlatesReady(s.companions.map(c => c.x)) && !!input.interact, holdTicks)) {
     s.belvedereLever = soloV70TrioObservation(s, 1);
     s.companionMode = 'follow';
     s.scan = 0;
   } else if (s.belvedereLever && near(exitX, lowerY) && soloV70TrioPresent(s) && interact) {
     proof('belvedere-serviced','counterweight');
   }
 }
 else if(s.phase==='counterweight'&&s.room===5){if(!s.liftTicks&&scan(near(540)&&!a.vx&&!!input.interact,30))s.liftTicks=1;if(s.liftTicks===100&&near(950,300)&&interact)proof('counterweight-aligned','humans');}
 else if(s.phase==='humans'&&s.room===6&&scan(near(740)&&!a.vx&&!!input.interact,60))proof('human-truce','configuration');
 else if (s.phase === 'configuration' && s.room === SOLO_V70_RECONNECTION.room &&
   scan(near(SOLO_V70_RECONNECTION.x) && !a.vx && !!input.interact, s.reconnectionVariant ? SOLO_V70_RECONNECTION.holdTicks : 45)) {
   s.configuration = 2;
   proof('second-configuration','separation');
 }
 else if (s.phase === 'separation' && s.room === SOLO_V70_NEF_RELAY_M017.room) {
   const { leverX, upperY, regroupX, holdTicks } = SOLO_V70_NEF_RELAY_M017;
   if (s.nefRelayM017) {
     if (near(regroupX) && !a.vx && soloV70TrioPresent(s) && interact) proof('triad-rejoined', 'drone');
   } else {
     const upper = !!s.reconnectionVariant && near(leverX, upperY);
     const upperLocked = upper && soloV70NefDeploymentM017(s) !== null;
     const stationed = s.companionMode === 'plates' && soloV70NefPlatesReadyM017(s);
     if (scan(!upperLocked && (upper || near(SOLO_V70_RECONNECTION.x)) && !a.vx && stationed && !!input.interact, upper ? holdTicks : 75)) {
       if (upper) {
         s.nefRelayM017 = { tick: s.tick, x: a.x };
         s.companionMode = 'follow';
         s.scan = 0;
       } else proof('triad-rejoined', 'drone');
     }
   }
 }
 else if(s.phase==='drone'&&s.room===8){
  const d=s.drone;d.age++;if(d.mode==='watch'&&d.age>=50){d.mode='telegraph';d.age=0;}else if(d.mode==='telegraph'&&d.age>=24){d.mode='lunge';d.age=0;}else if(d.mode==='lunge'&&d.age>=24){d.mode='recover';d.age=0;}else if(d.mode==='recover'&&d.age>=70){d.mode='watch';d.age=0;}
  if(d.mode==='lunge')d.x=Math.max(680,d.x-7);else if(d.mode==='recover')d.x=Math.min(925,d.x+3.5);
  if(command&&!s.attackCooldown){s.attackTimer=18;s.attackCooldown=45;if(d.mode==='recover'&&Math.abs(a.x-d.x)<100&&a.y>330){d.hp--;d.hits++;s.acid={x:d.x,ttl:120};}}
  if(!s.hurtTimer&&(d.mode==='lunge'&&Math.abs(a.x-d.x)<65&&a.y>350||s.acid.ttl>0&&Math.abs(a.x-s.acid.x)<40&&a.y===430)){s.health--;s.hurtTimer=75;if(!s.health)s.failedAt=s.tick;}
  if(!d.hp){d.mode='dead';d.age=0;proof('drone-confined','quarantine');}
 } else if (s.phase === 'quarantine' && s.room === SOLO_V70_QUARANTINE_THRESHOLD.room) {
   const threshold = SOLO_V70_QUARANTINE_THRESHOLD.x;
   if (near(200) && !a.vx && input.interact && s.valveTimer === 0 && scan(true, 30)) {
     s.valveTimer = 600;
     s.scan = 0;
   } else if (near(threshold) && !a.vx && s.valveTimer > 0) {
     if (scan((!s.riteAdmission || soloV70TrioPresent(s)) && !!input.interact, 45)) {
       if (s.riteAdmission) s.riteAdmission.threshold = soloV70TrioObservation(s, 2);
       s.configuration = 3;
       s.valveTimer = 0;
       proof('quarantine-valves', 'return');
     }
   } else if (!near(200) && !near(threshold)) s.scan = 0;
 }
 else if (atDepthRelay && s.depthsM017) {
    if (scan(near(descent.x, descent.y) && a.vx === 0 && s.companionMode === 'plates' &&
        soloV70DepthPlatesReadyM017(s.companions.map(companion => companion.x)) && !!input.interact, descent.holdTicks)) {
      s.depthsM017.relay = soloV70TrioObservation(s, 3);
      s.companionMode = 'follow';
      s.scan = 0;
    }
  } else if (royalPending && royal) {
    const { x, y, coverY } = SOLO_V70_ROYAL_M017;
    if (royal.startedAt === null) {
      if (interact && !a.vx && near(x, y) && soloV70TrioPresent(s)) royal.startedAt = s.tick;
    } else if (soloV70RoyalSweepM017(royal.startedAt, s.tick).stage === 'strike' && soloV70RoyalInSweepM017(a.x)) {
      if (a.y <= coverY) royal.evade = { tick: s.tick, x: a.x, y: a.y };
      else if (!s.hurtTimer) {
        s.health--;
        s.hurtTimer = 75;
        if (!s.health) s.failedAt = s.tick;
      }
    }
  } else if (rescueTarget && rescue) {
    if (scan(near(rescueTarget.x, rescueTarget.y) && a.vx === 0 && a.vy === 0 &&
        soloV70TrioPresent(s) && !!input.interact, rescueTarget.holdTicks)) {
      if (carrying) rescue.delivered = soloV70TrioObservation(s, 3);
      else {
        s.companions[0].x = soloV70SaarCarryX(a.x);
        rescue.pickedUp = soloV70TrioObservation(s, 3);
      }
      s.scan = 0;
    }
  } else if (pendingPost && extension) {
    const armed = soloV70PurgeRemainingM017(s);
    if (pendingPost.id === 'vent-purge' && !armed) {
      if (scan(a.y === SOLO_V70_PURGE_M017.y && a.vy === 0 && near(SOLO_V70_PURGE_M017.x) && a.vx === 0 && !!input.interact, SOLO_V70_PURGE_M017.holdTicks)) {
        extension.purgeStartedAt = s.tick;
        s.scan = 0;
      }
    } else {
      const party = pendingPost.plates
        ? s.companionMode === 'plates' && soloV70DepthAppuisM017(s.companions.map(companion => companion.x), pendingPost.plates)
        : soloV70TrioPresent(s);
      if (scan(party && a.y === pendingPost.y && a.vy === 0 && near(pendingPost.x, pendingPost.y) && a.vx === 0 && !!input.interact, pendingPost.holdTicks)) {
        extension.observations[pendingPost.id] = soloV70TrioObservation(s, 3);
        s.companionMode = 'follow';
        s.scan = 0;
      }
    }
  } else if (currentPost?.id === 'eggs-observed' && extension?.gallery && !extension.gallery.screened) {
    const { x, y, holdTicks, hatchDelay } = SOLO_V70_GALLERY_M017;
    const encounter = extension.gallery, observed = extension.observations['eggs-observed'];
    if (encounter.openedAt === null) {
      if (observed && s.tick - observed.tick >= hatchDelay) encounter.openedAt = s.tick;
    } else if (scan(near(x, y) && a.vx === 0 && a.vy === 0 && soloV70TrioPresent(s) && !!input.interact, holdTicks)) {
      encounter.screened = soloV70TrioObservation(s, 3);
      s.scan = 0;
    }
    const threat = soloV70GalleryThreatM017(s);
    if (threat && encounter.openedAt !== null && s.tick - encounter.openedAt >= 8 &&
        !s.hurtTimer && Math.abs(a.x - threat.x) < 25 && Math.abs(a.y - threat.y) < 34) {
      s.health--;
      s.hurtTimer = 75;
      if (!s.health) {
        s.failedAt = s.tick;
        s.scan = 0;
      }
    }
  } else if (s.phase === 'return' && s.room === soloV70HuntTargetM017(s).room && s.depthsM017 && !s.depthsM017.huntThreshold) {
    const threshold = soloV70HuntTargetM017(s);
    if (scan((!extension || a.y === SOLO_V70_GROUND && a.vy === 0) && near(threshold.x) && a.vx === 0 && soloV70TrioPresent(s) && !!input.interact, threshold.holdTicks)) {
      s.depthsM017.huntThreshold = soloV70TrioObservation(s, 3);
      s.scan = 0;
    }
  } else if(s.phase==='return'&&s.room===0&&near(160)&&s.walked>=10000&&interact&&(!s.depthsM017||s.depthsM017.huntThreshold))proof('returned','debrief');
 else if(s.phase==='debrief'&&s.room===0&&near(160)&&interact)proof('mentor-report','recognition');
 else if(s.phase==='recognition'&&s.room===0&&scan(near(160)&&!a.vx&&!!input.interact,90))proof('opening-attested','complete');
 if(!receipts.length&&interact&&soloV70ProofCount(s)<15)for(const side of ['left','right'] as const){const to=s.room+(side==='left'?-1:1),door=soloV70CampaignPortal(s,s.room,side);if(soloV70CanTravel(s,to)&&near(door.x,door.y,42)&&s.companions.every(c=>Math.abs(c.x-a.x)<185)){const from=s.room,entry=soloV70CampaignPortal(s,to,side==='left'?'right':'left');s.room=to;s.roomEnteredAt=s.tick;s.visited[to]=true;s.doorCrossings++;s.lastDoor={from,to,tick:s.tick};s.player={x:entry.x,y:entry.y,vx:0,vy:0,facing:side==='left'?-1:1};s.companions=[{x:clamp(entry.x+(side==='left'?45:-45),65,1055)},{x:clamp(entry.x+(side==='left'?90:-90),65,1055)}];
    if (to === SOLO_V70_RESCUE_M017.room && soloV70RescueTargetM017(extension)) s.companions[0].x = SOLO_V70_RESCUE_M017.pickup.x;
    s.scan=0;s.inputArmed=false;break;}}
 return {state:s,receipts};
}
export function soloV70Objective(s:SoloV70State):{title:string;instruction:string;room:number;targetX:number;targetY:number}{
 const nefDeploying = soloV70NefDeploymentM017(s) !== null;
 const { descent } = SOLO_V70_DEPTHS_M017;
 const gateOpening = soloV70DepthDoorOpeningM017(s);
 const extension = s.depthsM017?.extension;
 const firstPost = extension && SOLO_V70_DEPTH_POSTS_M017.find(candidate => !extension.observations[candidate.id]);
 const post = firstPost && soloV70DepthPostM017(firstPost.room, !!extension?.royal);
 const royal = extension?.royal;
 const royalGoal: [string, string, number, number, number] | null =
   royal && post?.id === 'royal-lock' && !royal.evade
     ? ['Nef de la Reine · balayage',
       royal.startedAt === null ? 'Réunis Saar et Vek au repère bas. Interagis pour provoquer le mouvement de la reine captive.'
         : 'Quand le glyphe s’allume, saute ou prends le couvert haut au-dessus de la zone annoncée.',
       SOLO_V70_ROYAL_M017.room, SOLO_V70_ROYAL_M017.x, SOLO_V70_ROYAL_M017.y]
     : null;
 const rescueTarget = soloV70RescueTargetM017(extension);
 const rescueGoal: [string, string, number, number, number] | null = rescueTarget
   ? extension?.rescue?.pickedUp
     ? ['Porter Saar au refuge', 'Avance au sol jusqu’au refuge sans te séparer de Vek. Maintiens Interaction pour déposer Saar.', SOLO_V70_RESCUE_M017.room, rescueTarget.x, rescueTarget.y]
     : ['Secourir Saar', 'Saar est blessé à l’entrée du sas. Rejoins-le avec Vek puis maintiens Interaction pour le soulever.', SOLO_V70_RESCUE_M017.room, rescueTarget.x, rescueTarget.y]
   : null;
 const valve: [string, string, number, number, number] | null = post?.id === 'vent-purge' && !soloV70PurgeRemainingM017(s)
   ? ['Ouvrir la conduite du sas', 'Maintiens Interaction à la commande amont. Le glyphe indique le temps avant fermeture.', post.room, SOLO_V70_PURGE_M017.x, SOLO_V70_PURGE_M017.y]
   : null;
 const gallery = extension?.gallery;
 const hatchGoal: [string, string, number, number, number] | null =
   gallery && extension?.observations['eggs-observed'] && !gallery.screened
     ? ['Galerie des Coques · confinement',
       gallery.openedAt === null ? 'Une coque frémit. Anticipe le bond et replie-toi vers la commande ouest.'
         : 'Saute hors de portée du facehugger, puis maintiens Interaction avec Saar et Vek près de la commande ouest.',
       SOLO_V70_GALLERY_M017.room, SOLO_V70_GALLERY_M017.x, SOLO_V70_GALLERY_M017.y]
     : null;
 const threshold = soloV70HuntTargetM017(s);
 const depthGoal: [string, string, number, number, number] | null = !s.depthsM017 || s.depthsM017.huntThreshold ? null
   : !s.depthsM017.relay
     ? ['Descente des Contrepoids', 'Donne le Signal pour placer Saar et Vek sur leurs plaques. Depuis la passerelle, maintiens Interaction au pupitre jusqu’au mouvement du volet.', descent.room, descent.x, descent.y]
     : gateOpening
       ? ['Volet de la Galerie', 'Le glyphe annonce la rotation du volet. Rassemble Saar et Vek près de la porte pendant son ouverture.', descent.room, 1040, 430]
       : hatchGoal ?? royalGoal ?? rescueGoal ?? valve ?? (post ? [post.label, post.instruction, post.room, post.x, post.y]
         : [extension ? 'Sas de Purge · seuil de chasse' : 'Galerie des Coques · seuil de chasse',
           'Rejoins le glyphe aval avec Saar et Vek, puis maintiens Interaction pour inscrire vos trois présences.', threshold.room, threshold.x, 430]);
 const goals:Record<SoloV70Phase,[string,string,number,number,number]>={
 briefing:['Le Temple des Trois Ombres · I','Écoute le vétéran. Cette ouverture ne termine pas le rite Blooded.',0,160,430],
 ascent:['Marches des Trois','Saute les marches réelles et confirme la terrasse supérieure.',0,900,270],
 oath:['Trois poids, un serment','Signal : place Saar et Vek sur leurs plaques. Tiens Interaction sur la plaque centrale.',1,520,430],
 signs:['Tribune des Signes',`Relevé ${s.signs}/3. Gagne chaque tribune et maintiens Interaction immobile.`,2,SOLO_V70_SIGNS[Math.min(2,s.signs)].x,SOLO_V70_SIGNS[Math.min(2,s.signs)].y],
 arsenal:s.riteAdmission && !s.riteAdmission.sealedEnergy
   ? ['Déposer les armes énergétiques', 'Réunis Saar et Vek devant le coffre et maintiens Interaction pour sceller les trois émetteurs.', SOLO_V70_ENERGY_VAULT.room, SOLO_V70_ENERGY_VAULT.x, 430]
   : ['Arsenal des Épreuves', 'Vérifie le râtelier des lames et outils de rite. Ils sont prêtés pour ce parcours.', SOLO_V70_LOAN_RACK.room, SOLO_V70_LOAN_RACK.x, 430],
 belvedere:s.belvedereLever
   ? ['Belvédère Fracturé · passage bas','La triade a ouvert la commande. Rejoins la sortie basse avec Saar et Vek.',4,SOLO_V70_BELVEDERE.exitX,SOLO_V70_BELVEDERE.lowerY]
   : s.room===SOLO_V70_BELVEDERE.room&&s.companionMode==='plates'
     ? ['Belvédère Fracturé · contrepoids','Attends Saar et Vek sur leurs appuis, puis maintiens Interaction au contrepoids.',4,SOLO_V70_BELVEDERE.leverX,430]
     : ['Belvédère Fracturé','Traverse les terrasses ou donne le Signal au sol pour actionner le contrepoids avec la triade.',4,SOLO_V70_BELVEDERE.exitX,SOLO_V70_BELVEDERE.upperY],
 counterweight:['Puits des Contrepoids','Tiens Interaction sur le plateau bas pour engager le contrepoids. Monte avec lui puis saute vers la galerie.',5,s.liftTicks<70?540:950,s.liftTicks<70?430-Math.max(0,s.liftTicks-1)*170/99:300],
 humans:['Camp des Intrus','Le garde protège les survivants. Approche sans attaque et maintiens Interaction pour établir une trêve ; les humains ne sont pas des aliens à éliminer.',6,740,430],
 configuration:['II · La Reconnexion', s.reconnectionVariant
   ? 'Maintiens Interaction au pupitre. Le glyphe annonce la position des passerelles deux secondes avant leur déploiement.'
   : 'Tiens Interaction au pupitre : les accès internes se réorientent, les sorties de service restent disponibles.',
   SOLO_V70_RECONNECTION.room, SOLO_V70_RECONNECTION.x, 430],
 separation:s.nefRelayM017
   ? ['Nef des Anneaux · rendez-vous aval', 'Redescends au rendez-vous. Attends Saar et Vek près de toi, puis presse Interaction.', SOLO_V70_NEF_RELAY_M017.room, SOLO_V70_NEF_RELAY_M017.regroupX, 430]
   : ['Les deux ailes', nefDeploying
     ? 'Les passerelles se déploient. La commande haute attend leur verrouillage. Donne le Signal et prépare les appuis de Saar et Vek.'
     : s.reconnectionVariant
       ? 'Donne le Signal et attends Saar et Vek sur leurs plaques. Maintiens Interaction au contrepoids bas ou sur la commande de la passerelle médiane.'
       : 'Signal : Saar et Vek gagnent leurs plaques éloignées. Maintiens le contrepoids central jusqu’à rétablir la connexion.',
     SOLO_V70_RECONNECTION.room, SOLO_V70_RECONNECTION.x, 430],
 drone:['Un drone dans la vanne','Télégraphe → bond → retrait. Saute ou prends de la distance, puis Lame/Signal pendant le retrait à portée. L’acide reste au point d’impact. Interaction après une défaite reprend le point sûr.',8,740,430],
 quarantine:['III · Isolement local', s.riteAdmission
   ? 'Ouvre la première vanne. Réunis la triade au seuil pendant l’ouverture, puis maintiens Interaction à la seconde vanne.'
   : 'Tiens Interaction à la première vanne puis rejoins la seconde avant la fin de la fenêtre. Le foyer profond reste fermé.',
   SOLO_V70_QUARANTINE_THRESHOLD.room, s.valveTimer ? SOLO_V70_QUARANTINE_THRESHOLD.x : 200, 430],
 return: depthGoal ?? ['Revenir avec la triade','Reviens à pied par les portes et sorties de service. Saar et Vek doivent arriver près de chaque porte.',0,160,430],
 debrief:['Le temple reste une chasse','Remets le rapport d’ouverture. Un drone combattu ne signe ni la mort de la reine ni les chasses de chaque camarade.',0,160,430],
 recognition:['Acte I · L’Ouverture attestée','Maintiens Interaction. Le clan conserve les quinze faits du parcours ; tu restes Young Blood.',0,160,430],
 complete:s.depthsM017 ? ['Young Blood · Seuil de chasse atteint', 'Après la Vanne, la triade a franchi les salles profondes. Retrouve ton exercice au poste avant de partir pour le Quatza-Rij.', 0, 160, 430] : ['Young Blood · Temple ouvert','Les neuf secteurs hauts sont traversés et la vanne locale isolée. Profondeurs, reine, chasses individuelles et Blooding restent à accomplir.',0,160,430]};
 const [title,instruction,room,targetX,targetY]=goals[s.phase];if(s.failedAt!==null)return {title:'Point sûr · La triade attend',instruction:'Relâche puis presse Interaction après un instant pour reprendre cette chambre. Les preuves antérieures restent acquises.',room:s.room,targetX:125,targetY:430};
 if(room!==s.room){const door=soloV70CampaignPortal(s,s.room,room<s.room?'left':'right');return {title,instruction:instruction+' Rejoins la porte puis relâche et presse Interaction.',room,targetX:door.x,targetY:door.y};}return {title,instruction,room,targetX,targetY};
}
