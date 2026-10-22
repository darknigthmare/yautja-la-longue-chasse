import './homeworldStreetCompositionMountV92';
import { HOMEWORLD_ACTOR } from './homeworldCity';
import { homeworldCivicWalkableV80 } from './homeworldCivicWorldV80';
import { homeworldRouteSegmentV77 } from './homeworldNavigationV77';
import { homeworldResidentOccludedV100 } from './homeworldResidentVisibilityV100';
import { HOMEWORLD_URBAN_PROPS_V78 } from './homeworldStreetModulesV78';
import { HOMEWORLD_STREET_COMPOSITION_PROPS_V92 } from './homeworldStreetCompositionMountV92';
import { HOMEWORLD_CARTOGRAPHY_V104 as b, HOMEWORLD_CARTOGRAPHY_SOURCE_V104 as source } from './homeworldCartographyDefinitionV104';
import { cartographyPointV104, defaultHomeworldCartographyV104, normalizeHomeworldCartographyV104, type CartographyPointV104, type HomeworldCartographyLedgerV104 } from './homeworldCartographyLedgerV104';

export interface CartographyContextV104 {
  ownerCreatedAt: string; currentOwnerCreatedAt: string; actor: CartographyPointV104;
  levelId: string; visitedDistrictIds: readonly string[]; interiorId?: string | null; inTransit?: boolean;
  active: boolean; hostPresent?: boolean; hostAvailable?: boolean; servicePresent?: boolean;
}
const distance = (a: CartographyPointV104, c: CartographyPointV104) => Math.hypot(a.x - c.x, a.y - c.y);
export function cartographyServicePresentV104() {
  return HOMEWORLD_URBAN_PROPS_V78.some(p => p.id === b.lecternId && p.levelId === b.levelId && p.artId === 'court-native-v80:clan-lectern-right' && p.x === 5890 && p.y === 5080)
    && HOMEWORLD_URBAN_PROPS_V78.some(p => p.id === b.waypoints[1].id && p.levelId === b.levelId && p.x === 6280 && p.y === 5180)
    && HOMEWORLD_STREET_COMPOSITION_PROPS_V92.some(p => p.id === b.waypoints[0].id && p.levelId === b.levelId && p.x === 6130 && p.y === 4930);
}
export function cartographyGroundContextV104(context: CartographyContextV104) {
  return context.ownerCreatedAt === context.currentOwnerCreatedAt && context.active && context.levelId === b.levelId && !context.interiorId && !context.inTransit
    && context.visitedDistrictIds.includes(b.districtId) && cartographyPointV104({x:context.actor?.x,y:context.actor?.y}) && homeworldCivicWalkableV80(b.levelId, context.actor)
    && !homeworldResidentOccludedV100(b.levelId, context.actor);
}
export function cartographyPostReachedV104(context: CartographyContextV104) {
  return cartographyGroundContextV104(context) && context.hostPresent !== false && context.hostAvailable !== false && context.servicePresent !== false && cartographyServicePresentV104()
    && homeworldCivicWalkableV80(b.levelId, b.host) && !homeworldResidentOccludedV100(b.levelId, b.host)
    && distance(context.actor, b.post) <= b.radius && distance(context.actor, b.host) <= 160 && homeworldRouteSegmentV77(b.levelId, context.actor, b.host);
}
export type CartographyActionV104 = 'choose-b' | 'reply' | 'start' | 'interrupt' | 'resume' | 'report';
export interface CartographyResultV104 { ok: boolean; changed: boolean; ledger: HomeworldCartographyLedgerV104; message: string }
export function applyCartographyActionV104(raw: unknown, action: CartographyActionV104, expectedRevision: number, context: CartographyContextV104): CartographyResultV104 {
  const previous = raw === undefined ? defaultHomeworldCartographyV104(context.ownerCreatedAt) : normalizeHomeworldCartographyV104(raw);
  const fallback = previous ?? defaultHomeworldCartographyV104(context.ownerCreatedAt);
  const fail = (message: string): CartographyResultV104 => ({ ok: false, changed: false, ledger: fallback, message });
  if (!previous || previous.ownerCreatedAt !== context.ownerCreatedAt || context.currentOwnerCreatedAt !== context.ownerCreatedAt) return fail('Le relevé ne correspond plus à cette partie. Aucune donnée remplacée.');
  if (previous.revision !== expectedRevision) return fail('Le relevé a changé. Relisez son état avant de poursuivre.');
  const ledger = structuredClone(previous), receipt = ledger.receipt;
  if (action === 'interrupt') {
    if (!receipt||!['walking','return'].includes(receipt.phase)) return { ok: true, changed: false, ledger, message: 'Le relevé reste conservé.' };
    receipt.phase = 'interrupted'; receipt.interruptedCount++;
  } else if (action === 'resume') {
    if (!receipt || receipt.phase !== 'interrupted' || !cartographyGroundContextV104(context) || distance(receipt.last, context.actor) > 64) return fail('Rejoignez à pied le dernier point enregistré pour reprendre.');
    receipt.phase = receipt.nextWaypoint===2?'return':'walking'; receipt.last = { x:context.actor.x,y:context.actor.y };
    if (distance(receipt.trail.at(-1)!, receipt.last) > 0) {receipt.trailBreaks.push(receipt.trail.length);receipt.trail.push({ ...receipt.last });}
  } else {
    if (!cartographyPostReachedV104(context)) return fail('Rejoignez le cartographe et son pupitre dans la cour déjà connue du port.');
    if (action === 'choose-b') {
      if (receipt) return fail('Cette liaison possède déjà un relevé. Reprenez-le sans effacer ses repères.');
      ledger.receipt = { sceneId: b.sceneId, routeId: b.routeId, sourceSha256: source.source.sha256, sourceCorpusSha256: source.sourceCorpusSha256,
        phase: 'choice', nextWaypoint: 0, walked: 0, legWalked: 0, last: { x:context.actor.x,y:context.actor.y }, trail: [{ x:context.actor.x,y:context.actor.y }], trailBreaks:[], trimmedCount:0, interruptedCount: 0 };
    } else if (action === 'reply') {
      if (!receipt || receipt.phase !== 'choice') return fail('Choisissez d’abord la liaison entre les repères connus.');
      receipt.phase = 'ready';
    } else if (action === 'start') {
      if (!receipt || receipt.phase !== 'ready') return fail('Écoutez la réponse du cartographe avant le départ.');
      receipt.phase = 'walking'; receipt.last = { x:context.actor.x,y:context.actor.y }; receipt.trail = [{ x:context.actor.x,y:context.actor.y }];
    } else if (action === 'report') {
      if (!receipt || receipt.phase !== 'return' || receipt.nextWaypoint !== 2) return fail('Parcourez les deux repères puis revenez au pupitre.');
      if (distance(receipt.last, context.actor) > 32) return fail('Le retour doit lui aussi être parcouru à pied.');
      receipt.phase = 'completed';
    } else return fail('Action inconnue.');
  }
  ledger.revision++;
  if (!normalizeHomeworldCartographyV104(ledger)) return fail('Le relevé ne peut pas être conservé dans cet état.');
  return { ok: true, changed: true, ledger, message: action === 'report' ? 'La liaison parcourue est consignée. Les zones non observées restent inconnues.' : action === 'interrupt' ? 'Marche interrompue : les repères atteints sont conservés.' : action === 'resume' ? 'La marche reprend au dernier point sûr.' : 'Le relevé est enregistré.' };
}

/** Receives only the before/after positions of the real movement integrator.
 * Buttons, target coordinates and saved locations cannot award a waypoint.
 * The caller retains this draft and commits at approaches/interruptions. */
export function sampleCartographyWalkV104(ledger: HomeworldCartographyLedgerV104, before: CartographyPointV104, after: CartographyPointV104, seconds: number, context: CartographyContextV104): { ledger: HomeworldCartographyLedgerV104; checkpoint: boolean; invalid: boolean } {
  const receipt = ledger.receipt;
  if (!receipt || !['walking', 'return'].includes(receipt.phase)) return { ledger, checkpoint: false, invalid: false };
  const travelled = distance(before, after);
  if(seconds===0&&travelled===0)return {ledger,checkpoint:false,invalid:false};
  if (!cartographyGroundContextV104({ ...context, actor: after }) || !cartographyPointV104({x:before?.x,y:before?.y}) || !Number.isFinite(seconds) || seconds <= 0 || seconds > 1 / 30 + 1e-6
    || distance(receipt.last, before) > 1 || travelled > Math.max(HOMEWORLD_ACTOR.walkSpeed, HOMEWORLD_ACTOR.depthSpeed) * seconds * 2 + .1
    || !homeworldRouteSegmentV77(b.levelId, before, after)) return { ledger, checkpoint: false, invalid: true };
  if (travelled < .001) return { ledger, checkpoint: false, invalid: false };
  const next = structuredClone(ledger), r = next.receipt!;
  r.last = { x: after.x, y: after.y }; r.walked = Math.min(1_000_000_000,r.walked+travelled); r.legWalked = Math.min(1_000_000_000,r.legWalked+travelled);
  if (distance(r.trail.at(-1)!, after) >= 20) r.trail.push({ ...r.last });
  let checkpoint = false;
  if (r.phase === 'walking' && r.legWalked >= 40 && distance(after, b.waypoints[r.nextWaypoint]) <= b.waypointRadius) {
    r.trail.push({ ...r.last }); r.nextWaypoint++; r.legWalked = 0; checkpoint = true;
    if (r.nextWaypoint === 2) r.phase = 'return';
  }
  // The map is bounded without capping the playable walk. Preserve the
  // origin and earned approaches, then the latest 200 sampled points. Any
  // omitted interval becomes a visible break, never a fabricated shortcut.
  if(r.trail.length>=480){
    const kept=new Set<number>([0]);let previous=-1;
    for(let waypoint=0;waypoint<r.nextWaypoint;waypoint++){
      const index=r.trail.findIndex((p,i)=>i>previous&&distance(p,b.waypoints[waypoint])<=b.waypointRadius+1);
      if(index<0)return {ledger,checkpoint:false,invalid:true};kept.add(index);previous=index;
    }
    for(let i=Math.max(1,r.trail.length-200);i<r.trail.length;i++)kept.add(i);
    const indices=[...kept].sort((a,c)=>a-c),oldBreaks=r.trailBreaks;
    r.trailBreaks=indices.flatMap((oldIndex,newIndex)=>newIndex>0&&(oldIndex>indices[newIndex-1]+1||oldBreaks.includes(oldIndex))?[newIndex]:[]);
    r.trail=indices.map(i=>r.trail[i]);r.trimmedCount=Math.min(1_000_000_000,r.trimmedCount+1);
  }
  return { ledger: next, checkpoint, invalid: false };
}

/** Stale callbacks and failed durable writes leave both receipt and revision
 * unchanged. The ref is published only after the campaign callback succeeds. */
export function createCartographyTransactionV104(read:()=>unknown,getContext:()=>CartographyContextV104,commit:(ledger:HomeworldCartographyLedgerV104)=>boolean) {
  return(action:CartographyActionV104,expectedRevision:number):CartographyResultV104=>{
    const context=getContext(),raw=read(),result=applyCartographyActionV104(raw,action,expectedRevision,context);
    if(!result.ok||!result.changed)return result;
    if(!commit(result.ledger))return{ok:false,changed:false,ledger:normalizeHomeworldCartographyV104(raw)??defaultHomeworldCartographyV104(context.ownerCreatedAt),message:'Le relevé n’a pas été enregistré. Réessaie avant de poursuivre sa validation.'};
    return result;
  };
}
