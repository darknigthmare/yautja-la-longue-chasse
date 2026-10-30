import './homeworldPublicPlacesMountV112';
import type {HomeworldProgress} from './homeworld';
import {normalizeHomeworldCheckpointV77,type HomeworldCheckpointV77} from './homeworldCheckpointV77';
import {homeworldArrivalRecoveryLedgersV111,HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111,type HomeworldArrivalRecoveryLedgersV111,type HomeworldArrivalRecoveryLedgerKeyV111} from './homeworldArrivalRecoveryLedgerV111';
import {normalizeHomeworldCartographyV104} from './homeworldCartographyLedgerV104';
import {normalizeHomeworldCartographyV105} from './homeworldCartographyLedgerV105';
import {normalizeHomeworldArchiveV106} from './homeworldArchiveLedgerV106';
import {normalizeHomeworldArchiveComparisonV107} from './homeworldArchiveComparisonLedgerV107';
import {normalizeHomeworldCargoV108} from './homeworldCargoLedgerV108';
import {normalizeHomeworldArchivePlaqueV109} from './homeworldArchivePlaqueLedgerV109';
import {normalizeHomeworldArchiveContinuationV111} from './homeworldArchiveContinuationLedgerV111';
import {homeworldCivicWalkableV80} from './homeworldCivicWorldV80';
import {homeworldPublicPlaceCollisionV112} from './homeworldPublicPlacesV112';
import {homeworldCollisionBeforePublicPlacesV112,HOMEWORLD_GROUND_V77,HOMEWORLD_CONNECTOR_PADS_V82} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_GROUND_V78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_CITY_GENERATED_PROPS_V78,HOMEWORLD_URBAN_PROPS_V78} from './homeworldStreetModulesV78';
import {homeworldCityNativeTouchesV78} from './homeworldCityNativePlacementV78';
import {homeworldCourtTouchesV80,HOMEWORLD_COURT_ART_V80} from './homeworldCourtArtV80';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import {homeworldUrbanFacadeCollisionV78} from './homeworldUrbanFacadesV78';
import {HOMEWORLD_CIVIC_PROPS_V80,homeworldCivicTouchesV80} from './homeworldCivicDecorV80';
import {homeworldArchiveCollisionV106} from './homeworldArchiveSolidsV106';
import {homeworldArchiveComparisonCollisionV107} from './homeworldArchiveComparisonSolidsV107';
import {cargoFixedCollisionV108} from './homeworldCargoSolidsV108';
import {cargoCaseCollisionV108} from './homeworldCargoV108';
import {pointInHomeworldPolygon,type HomeworldFootprint} from './homeworldCity';
import {HOMEWORLD_CARGO_V108} from './homeworldCargoDefinitionV108';

type Point={x:number;y:number};
type JsonObject=Record<string,unknown>;
type MutableLedger={ownerCreatedAt:string;revision:number;receipt:JsonObject|null};
const record=(value:unknown):value is JsonObject=>!!value&&typeof value==='object'&&!Array.isArray(value);
const point=(value:unknown):value is Point&JsonObject=>record(value)&&typeof value.x==='number'&&typeof value.y==='number'&&Number.isFinite(value.x)&&Number.isFinite(value.y);
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export const HOMEWORLD_GEOMETRY_RECOVERY_RADIUS_V112=96;
export const HOMEWORLD_GEOMETRY_RECOVERY_PREFIX_V112='yautja.homeworld-geometry-recovery.v112.';
const maximumBytes=512*1024;
const normalizers={cartographyV104:normalizeHomeworldCartographyV104,cartographyV105:normalizeHomeworldCartographyV105,
  archiveV106:normalizeHomeworldArchiveV106,archiveComparisonV107:normalizeHomeworldArchiveComparisonV107,
  cargoV108:normalizeHomeworldCargoV108,archivePlaqueV109:normalizeHomeworldArchivePlaqueV109};
export type HomeworldGeometryRecoveryLedgersV112=Pick<HomeworldProgress,HomeworldArrivalRecoveryLedgerKeyV111>;
function documents(raw:unknown,owner:string):HomeworldGeometryRecoveryLedgersV112|null {
  if(!record(raw)||Object.keys(raw).some(key=>!HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111.includes(key as HomeworldArrivalRecoveryLedgerKeyV111)))return null;
  for(const key of HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111){
    if(!Object.hasOwn(raw,key))continue;
    const current=key==='archiveContinuationV111'?normalizeHomeworldArchiveContinuationV111(raw[key],raw.archivePlaqueV109):normalizers[key](raw[key]);
    if(!current||current.ownerCreatedAt!==owner)return null;
  }
  return structuredClone(raw) as HomeworldGeometryRecoveryLedgersV112;
}
const historicalGround=[...HOMEWORLD_GROUND_V77.filter(g=>!g.id.startsWith('foundation-v112:')),...HOMEWORLD_CONNECTOR_PADS_V82,...HOMEWORLD_URBAN_GROUND_V78].filter(g=>g.levelId==='0');
/** Exact former floor union and all retained collision providers. Only the new
 * V112 public furniture is absent; dynamic old cargo still blocks this query. */
export function homeworldBeforePublicPlacesWalkableV112(p:Point,cargo?:Parameters<typeof cargoCaseCollisionV108>[0],body:HomeworldFootprint={halfWidth:24,halfDepth:14}):boolean {
  if(![p.x,p.y].every(Number.isFinite))return false;
  if(![[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].every(([x,y])=>historicalGround.some(g=>pointInHomeworldPolygon({x:p.x+x*body.halfWidth,y:p.y+y*body.halfDepth},g.polygon))))return false;
  if(homeworldCollisionBeforePublicPlacesV112('0',p,body)||homeworldUrbanFacadeCollisionV78('0',p,body)
    ||HOMEWORLD_CITY_GENERATED_PROPS_V78.some(item=>item.levelId==='0'&&homeworldCityNativeTouchesV78(item,p,body))
    ||HOMEWORLD_URBAN_PROPS_V78.some(item=>item.levelId==='0'&&homeworldCourtTouchesV80(item,p,body))
    ||HOMEWORLD_CIVIC_PROPS_V80.some(item=>item.levelId==='0'&&homeworldCivicTouchesV80(item,p,body))
    ||homeworldArchiveCollisionV106('0',p,body)||homeworldArchiveComparisonCollisionV107('0',p,body)||cargoFixedCollisionV108('0',p,body)
    ||cargoCaseCollisionV108(cargo,p,body))return false;
  return true;
}
export interface HomeworldGeometryRecoveryContextV112 {
  ownerCreatedAt:string;currentOwnerCreatedAt:string;checkpoint:unknown;ledgers:HomeworldArrivalRecoveryLedgersV111;
  actor:Point;levelId:string;interiorId:string|null;active:boolean;inTransit?:boolean;
}
export interface HomeworldGeometryRecoveryMigrationV112 {
  kind:'checkpoint'|'operation-last'|'ground-object';ledgerKey?:HomeworldArrivalRecoveryLedgerKeyV111;
  study?:boolean;objectField?:'cases'|'lots'|'objects'|'evidence';objectIndex?:number;objectId?:string;
  from:Point;to:Point;obstacleId:string;
}
interface Anchor extends Omit<HomeworldGeometryRecoveryMigrationV112,'to'> {body:HomeworldFootprint}
export interface HomeworldGeometryRecoveryBackupV112 {
  version:1;operationId:'homeworld-public-furniture-migration-v112';ownerCreatedAt:string;
  originalCheckpointPresent:boolean;originalCheckpointJson:string;originalLedgersJson:string;
  restoredCheckpoint:HomeworldCheckpointV77|null;migratedLedgersJson:string;
  changedLedgerKeys:HomeworldArrivalRecoveryLedgerKeyV111[];migrations:HomeworldGeometryRecoveryMigrationV112[];
  /** This is an explicitly confirmed geometry migration, never measured walking. */
  source:'new-local-geometry-position';
}
export interface HomeworldGeometryRecoveryPlanV112 {
  key:string;ownerCreatedAt:string;from:Point;to:Point;movesActor:boolean;
  checkpoint:HomeworldCheckpointV77|undefined;ledgers:HomeworldGeometryRecoveryLedgersV112;
  migrations:HomeworldGeometryRecoveryMigrationV112[];changedLedgerKeys:HomeworldArrivalRecoveryLedgerKeyV111[];
  backup:HomeworldGeometryRecoveryBackupV112;backupKey:string;
}
export interface HomeworldGeometryRecoveryInspectionV112 {ok:boolean;reason:string;plan:HomeworldGeometryRecoveryPlanV112|null}
const refused=(reason:string):HomeworldGeometryRecoveryInspectionV112=>({ok:false,reason,plan:null});
const nativeBody={halfWidth:24,halfDepth:14};
function cargoForAnchor(checked:HomeworldArrivalRecoveryLedgersV111,anchor?:Anchor){
  const cargo=normalizeHomeworldCargoV108(checked.cargoV108)??undefined;
  if(cargo?.receipt&&anchor?.ledgerKey==='cargoV108'&&anchor.kind==='ground-object'){
    // Collision-only projection excludes the one load being migrated. This
    // temporary query is never saved as a manufactured carrier/possession.
    for(const lot of cargo.receipt.lots)if(lot.id===anchor.objectId)lot.place='carried';
  }
  return cargo;
}
function anchors(checkpoint:unknown,checked:HomeworldArrivalRecoveryLedgersV111,owner:string):Anchor[]{
  const result:Anchor[]=[],saved=normalizeHomeworldCheckpointV77(checkpoint);
  const admit=(candidate:Omit<Anchor,'obstacleId'>)=>{
    const hit=homeworldPublicPlaceCollisionV112('0',candidate.from,candidate.body);
    if(hit)result.push({...candidate,obstacleId:hit});
  };
  if(saved?.ownerCreatedAt===owner&&saved.levelId==='0'&&saved.interiorId===null)admit({kind:'checkpoint',from:{...saved.exterior},body:nativeBody});
  for(const key of HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111){
    const ledger=checked[key];if(!record(ledger)||!record(ledger.receipt))continue;
    const study=key==='archiveContinuationV111';
    const receipt=study&&record(ledger.receipt.study)&&record(ledger.receipt.study.receipt)?ledger.receipt.study.receipt:study?null:ledger.receipt;
    if(!receipt||receipt.phase==='completed')continue;
    if(point(receipt.last)&&(receipt.last.levelId===undefined||receipt.last.levelId==='0'))admit({kind:'operation-last',ledgerKey:key,study,from:{x:receipt.last.x,y:receipt.last.y},body:nativeBody});
    for(const field of ['cases','lots','objects','evidence'] as const){
      const values=field==='evidence'?[receipt[field]]:receipt[field];if(!Array.isArray(values))continue;
      for(let index=0;index<values.length;index++){
        const item=values[index];if(!point(item)||item.place!=='ground')continue;
        const lot=key==='cargoV108'?HOMEWORLD_CARGO_V108.lots.find(lot=>lot.id===item.id):null;
        const art=lot?HOMEWORLD_COURT_ART_V80[HOMEWORLD_CARGO_V108.caseArtId]:null,scale=lot&&art?lot.height/art.alphaBounds.height:0;
        const body=lot&&art?{halfWidth:Math.max(24,lot.width/2,...art.nativeGroundSupport!.map(p=>Math.abs((p.x-art.pivot.x)*scale))),
          halfDepth:Math.max(14,lot.halfDepth,...art.nativeGroundSupport!.map(p=>Math.abs((p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale)))}:nativeBody;
        admit({kind:'ground-object',ledgerKey:key,study,objectField:field,objectIndex:index,objectId:typeof item.id==='string'?item.id:field,
          from:{x:item.x,y:item.y},body});
      }
    }
  }
  return result;
}
/** Pause BEFORE any movement/draft/location save. Scan remote interrupted
 * last points and grounded pieces too, even when the saved actor is elsewhere. */
export function homeworldGeometryRecoveryRequiredV112(checkpoint:unknown,owner:string,ledgers:HomeworldArrivalRecoveryLedgersV111):boolean {
  const checked=documents(ledgers,owner);
  return !!checked&&anchors(checkpoint,checked,owner).length>0;
}

function migrateOne(raw:unknown,key:HomeworldArrivalRecoveryLedgerKeyV111,from:Point,to:Point):unknown|null {
  if(!record(raw)||!record(raw.receipt))return raw;
  const ledger=structuredClone(raw) as unknown as MutableLedger,r=ledger.receipt!,wasInterrupted=r.phase==='interrupted';
  if(r.phase==='completed'||!point(r.last)||distance(r.last,from)>.001||r.last.levelId!==undefined&&r.last.levelId!=='0')return raw;
  if(ledger.revision>=999990)return null;
  if(['working','walking','observing','search','carrying','compare','return'].includes(String(r.phase))){
    if(key!=='cartographyV104')r.resumePhase=r.phase;
    r.phase='interrupted';r.interruptedCount=Number(r.interruptedCount)+1;
  }
  r.last={...r.last,...to};ledger.revision++;
  for(const field of ['cases','lots','objects'])if(Array.isArray(r[field]))for(const item of r[field]){
    if(record(item)&&item.place==='carried'){item.x=to.x;item.y=to.y;}
  }
  if(record(r.evidence)&&r.evidence.place==='carried'){r.evidence.x=to.x;r.evidence.y=to.y;}
  if(key==='cartographyV104'&&Array.isArray(r.trail)&&Array.isArray(r.trailBreaks)&&!['choice','ready'].includes(String(r.phase))){
    const trail=r.trail as Point[],breaks=r.trailBreaks as number[];
    if(!point(trail.at(-1))||distance(trail.at(-1)!,to)>96.000001)return null;
    if(wasInterrupted)r.interruptedCount=Number(r.interruptedCount)+1;
    if(trail.length>=512){
      // Preserve the first/last observations and every declared discontinuity.
      // Validate each actual compaction before accepting it, so a recorded
      // waypoint cannot disappear merely to create room for this new break.
      for(let index=1;index<trail.length-1;index++){
        if(breaks.includes(index)||breaks.includes(index+1)||distance(trail[index-1],trail[index+1])>72)continue;
        const compact=structuredClone(ledger),receipt=compact.receipt!,points=receipt.trail as Point[];
        points.splice(index,1);receipt.trailBreaks=breaks.map(n=>n>index?n-1:n);receipt.trimmedCount=Number(receipt.trimmedCount)+1;
        (receipt.trailBreaks as number[]).push(points.length);points.push({...to});
        if(normalizeHomeworldCartographyV104(compact))return compact;
      }
      return null;
    }
    breaks.push(trail.length);trail.push({...to});
  }
  return ledger;
}
function migrateAnchor(raw:HomeworldArrivalRecoveryLedgersV111,anchor:Anchor,to:Point,owner:string){
  const next=structuredClone(raw),changed:HomeworldArrivalRecoveryLedgerKeyV111[]=[];
  if(anchor.kind==='checkpoint'){const valid=documents(next,owner);return valid?{ledgers:valid,changed}:null;}
  const key=anchor.ledgerKey!,outer=next[key];if(!record(outer)||!record(outer.receipt))return null;
  const original=anchor.study?outer.receipt.study:outer;if(!record(original)||!record(original.receipt))return null;
  let moved:unknown;
  if(anchor.kind==='operation-last')moved=migrateOne(original,key==='archiveContinuationV111'?'archivePlaqueV109':key,anchor.from,to);
  else{
    const ledger=structuredClone(original) as unknown as MutableLedger,r=ledger.receipt!;
    if(ledger.revision>=999990)return null;
    const values=r[anchor.objectField!];
    const target=anchor.objectField==='evidence'?r.evidence:Array.isArray(values)?values[anchor.objectIndex!]:null;
    if(!point(target)||target.place!=='ground'||distance(target,anchor.from)>.001)return null;
    target.x=to.x;target.y=to.y;
    if(['working','search','carrying','compare','return'].includes(String(r.phase))){r.resumePhase=r.phase;r.phase='interrupted';r.interruptedCount=Number(r.interruptedCount)+1;}
    ledger.revision++;moved=ledger;
  }
  if(!moved)return null;
  if(anchor.study){if(Number(outer.revision)>=999990)return null;outer.receipt.study=moved;outer.revision=Number(outer.revision)+1;}
  else next[key]=moved;
  const valid=documents(next,owner);if(!valid)return null;
  changed.push(key);return{ledgers:valid,changed};
}

function preservesRecordedFeet(context:HomeworldGeometryRecoveryContextV112,ledgers:HomeworldArrivalRecoveryLedgersV111,checkpoint:HomeworldCheckpointV77|undefined,movesActor:boolean):boolean {
  const cargo=normalizeHomeworldCargoV108(ledgers.cargoV108)??undefined,feet:Point[]=[];
  if(movesActor&&checkpoint)feet.push(checkpoint.exterior);
  else if(context.levelId==='0'&&!context.interiorId)feet.push(context.actor);
  if(checkpoint?.levelId==='0')feet.push(checkpoint.exterior);
  for(const key of HOMEWORLD_ARRIVAL_RECOVERY_LEDGER_KEYS_V111){
    const value=ledgers[key];if(!record(value)||!record(value.receipt))continue;
    const r=key==='archiveContinuationV111'&&record(value.receipt.study)&&record(value.receipt.study.receipt)?value.receipt.study.receipt:value.receipt;
    if(r.phase!=='completed'&&point(r.last)&&(r.last.levelId===undefined||r.last.levelId==='0'))feet.push(r.last);
  }
  return feet.every(foot=>!cargoCaseCollisionV108(cargo,foot));
}

export function planHomeworldGeometryRecoveryV112(context:HomeworldGeometryRecoveryContextV112):HomeworldGeometryRecoveryInspectionV112 {
  if(context.currentOwnerCreatedAt!==context.ownerCreatedAt)return refused('Cette restauration appartient à une autre partie.');
  if(!context.active||context.inTransit||!['0','+1','+2','-1A','-1B','-1C'].includes(context.levelId)||!point(context.actor))return refused('Reprends cette cité pour consulter le déplacement de géométrie.');
  const saved=normalizeHomeworldCheckpointV77(context.checkpoint),checked=documents(context.ledgers,context.ownerCreatedAt);
  if(!checked||context.checkpoint!==undefined&&context.checkpoint!==null&&(!saved||saved.ownerCreatedAt!==context.ownerCreatedAt))return refused('Le point ou les documents de cette partie ne peuvent pas être conservés exactement.');
  const affected=anchors(context.checkpoint,checked,context.ownerCreatedAt);
  if(!affected.length)return refused('Aucun point ou objet incomplet n’est occupé par le nouveau mobilier.');
  let checkpointJson:string,ledgersJson:string;
  try{checkpointJson=JSON.stringify(context.checkpoint??null);ledgersJson=JSON.stringify(homeworldArrivalRecoveryLedgersV111(context.ledgers));}catch{return refused('Les documents ne peuvent pas être conservés exactement.');}
  if(new TextEncoder().encode(checkpointJson+ledgersJson).byteLength>maximumBytes)return refused('Les documents dépassent la taille admise pour cette copie conservée.');
  let next=checked,checkpoint=saved,movesActor=false;
  const migrations:HomeworldGeometryRecoveryMigrationV112[]=[],changed=new Set<HomeworldArrivalRecoveryLedgerKeyV111>();
  for(const anchor of affected){
    const cargo=cargoForAnchor(next,anchor);
    if(!homeworldBeforePublicPlacesWalkableV112(anchor.from,cargo,anchor.body))return refused('Un point occupé ne dispose pas de son ancienne géométrie libre. Aucun passage à travers un autre obstacle n’est supposé.');
    let selected=false;
    for(let radius=8;radius<=HOMEWORLD_GEOMETRY_RECOVERY_RADIUS_V112&&!selected;radius+=8)for(let n=0;n<48;n++){
      const angle=n*Math.PI/24,to={x:anchor.from.x+Math.cos(angle)*radius,y:anchor.from.y+Math.sin(angle)*radius};
      const clearance={halfWidth:Math.max(36,anchor.body.halfWidth),halfDepth:Math.max(26,anchor.body.halfDepth)};
      if(!homeworldCivicWalkableV80('0',to,clearance)||cargoCaseCollisionV108(cargo,to,clearance))continue;
      const samples=Math.max(1,Math.ceil(radius/2));let clear=true;
      for(let step=0;step<=samples;step++)if(!homeworldBeforePublicPlacesWalkableV112({x:anchor.from.x+(to.x-anchor.from.x)*step/samples,y:anchor.from.y+(to.y-anchor.from.y)*step/samples},cargo,anchor.body)){clear=false;break;}
      if(!clear)continue;
      const moved=migrateAnchor(next,anchor,to,context.ownerCreatedAt);if(!moved)continue;
      if(anchor.kind==='ground-object'){
        const stand=anchor.ledgerKey==='cargoV108'||anchor.ledgerKey==='archivePlaqueV109'||anchor.ledgerKey==='archiveContinuationV111'?{x:to.x,y:to.y+60}:to;
        if(!homeworldCivicWalkableV80('0',stand)||cargoCaseCollisionV108(normalizeHomeworldCargoV108(moved.ledgers.cargoV108)??undefined,stand))continue;
      }
      if(!preservesRecordedFeet(context,moved.ledgers,checkpoint,movesActor))continue;
      next=moved.ledgers;for(const key of moved.changed)changed.add(key);
      if(anchor.kind==='checkpoint'&&checkpoint){checkpoint={...checkpoint,exterior:{...to}};movesActor=true;}
      const {body:unused,...recorded}=anchor;void unused;
      migrations.push({...recorded,to});selected=true;break;
    }
    if(!selected)return refused('Aucun point local libre avec le corps ou la pièce entière et les mêmes documents n’a été trouvé à moins de 96 unités. Les données restent conservées.');
  }
  const changedLedgerKeys=[...changed],backup:HomeworldGeometryRecoveryBackupV112={version:1,operationId:'homeworld-public-furniture-migration-v112',ownerCreatedAt:context.ownerCreatedAt,
    originalCheckpointPresent:context.checkpoint!==undefined,originalCheckpointJson:checkpointJson,originalLedgersJson:ledgersJson,
    restoredCheckpoint:checkpoint??null,migratedLedgersJson:JSON.stringify(next),changedLedgerKeys,migrations,source:'new-local-geometry-position'};
  const bytes=JSON.stringify(backup);let hash=2166136261;for(const c of bytes)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  const key=JSON.stringify([context.ownerCreatedAt,checkpointJson,ledgersJson,context.actor.x,context.actor.y,context.levelId,context.interiorId,bytes]);
  return{ok:true,reason:'Ces nouveaux points libres se trouvent près des anciens emplacements obstrués. La restauration ne comptera pas comme une marche.',
    plan:{key,ownerCreatedAt:context.ownerCreatedAt,from:migrations[0].from,to:migrations[0].to,movesActor,checkpoint,ledgers:next,migrations,changedLedgerKeys,backup,
      backupKey:HOMEWORLD_GEOMETRY_RECOVERY_PREFIX_V112+context.ownerCreatedAt+'.'+hash.toString(16)}};
}
export function storeHomeworldGeometryRecoveryBackupV112(plan:HomeworldGeometryRecoveryPlanV112,storage:Pick<Storage,'getItem'|'setItem'>):boolean {
  try{
    const bytes=JSON.stringify(plan.backup),before=storage.getItem(plan.backupKey);
    if(before!==null&&before!==bytes)return false;
    if(before===null)storage.setItem(plan.backupKey,bytes);
    return storage.getItem(plan.backupKey)===bytes;
  }catch{return false;}
}
/** A persistence host can confirm its successful write on a later render.
 * Only the already confirmed proposal's exact checkpoint and seven documents
 * may finish that operation; another campaign update is never a substitute. */
export function homeworldGeometryRecoverySaveMatchesV112(plan:HomeworldGeometryRecoveryPlanV112,owner:string,progress:HomeworldProgress):boolean {
  return owner===plan.ownerCreatedAt&&equal(progress.locationV77,plan.checkpoint)
    &&equal(homeworldGeometryRecoveryLedgersV112(progress),plan.ledgers);
}
export function homeworldGeometryRecoveryBackupConfirmedV112(plan:HomeworldGeometryRecoveryPlanV112,storage:Pick<Storage,'getItem'>):boolean {
  try{return storage.getItem(plan.backupKey)===JSON.stringify(plan.backup);}catch{return false;}
}
export function createHomeworldGeometryRecoveryTransactionV112(readContext:()=>HomeworldGeometryRecoveryContextV112,
  backup:(plan:HomeworldGeometryRecoveryPlanV112)=>boolean,persistAtomic:(plan:HomeworldGeometryRecoveryPlanV112)=>boolean) {
  return(expectedKey:string)=>{
    const inspected=planHomeworldGeometryRecoveryV112(readContext()),plan=inspected.plan;
    if(!plan)return{ok:false,changed:false,message:inspected.reason};
    if(plan.key!==expectedKey)return{ok:false,changed:false,stale:true,message:'Le lieu, le propriétaire ou les documents ont changé. Consulte à nouveau la proposition.'};
    let copied=false;try{copied=backup(plan)===true;}catch{copied=false;}
    if(!copied)return{ok:false,changed:false,writeRefused:true,message:'La copie exacte de l’ancien point n’a pas été enregistrée. Aucun déplacement n’a eu lieu ; réessaie ici.'};
    const current=planHomeworldGeometryRecoveryV112(readContext()).plan;
    if(!current||current.key!==expectedKey)return{ok:false,changed:false,stale:true,message:'La partie ou le point a changé pendant la copie. Aucun déplacement n’a eu lieu.'};
    let saved=false;try{saved=persistAtomic(plan)===true;}catch{saved=false;}
    if(!saved)return{ok:false,changed:false,writeRefused:true,message:'La restauration n’a pas été enregistrée. Le personnage et les relevés restent à leur point actuel ; réessaie ici.'};
    return{ok:true,changed:true,message:'Restauration locale enregistrée avec sa copie d’origine. Aucune marche, récompense ou nouvelle preuve n’a été ajoutée.',plan};
  };
}
/** Public selector shared with the host; no optional field is added to Save12. */
export const homeworldGeometryRecoveryLedgersV112=(progress:HomeworldProgress)=>homeworldArrivalRecoveryLedgersV111(progress);
