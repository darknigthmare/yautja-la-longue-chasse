import assert from 'node:assert/strict';
import {getHistoricalHomeworldExcelContextV112,EXCEL_HOMEWORLD_HISTORY_COMMIT_V112} from '../../scripts/historical-excel-context-homeworld-v112.mjs';
import {homeworldSceneSsrV78} from './homeworld-scene-ssr-v78.mjs';

const memo=new Map();
/** Reproduce the real pre-V112 checkpoint with the pinned V111 private app.
 * Campaign ownership is supplied to its genuine constructors/actions before
 * playing; no existing receipt's owner, counters or coordinates are relabelled.
 * The private capsule works in shallow/sparse CI without git show main~N. */
export async function createGeometryUpgradeFixtureV112(owner='2026-09-20T10:00:00.000Z',{remote=false,groundObject=false,cargo=false}={}){
  const key=JSON.stringify([owner,remote,groundObject,cargo]);
  if(!memo.has(key))memo.set(key,(async()=>{
    const historical=await getHistoricalHomeworldExcelContextV112(),old=homeworldSceneSsrV78(historical.root),current=homeworldSceneSsrV78();
    if(cargo)return createCargoFixture(owner,{remote,groundObject},historical,old,current);
    const oldApi=old.load('app/game/systems/homeworldArchivePlaqueV109.ts'),schema=old.load('app/game/systems/homeworldArchivePlaqueLedgerV109.ts');
    const b=old.load('app/game/systems/homeworldArchivePlaqueDefinitionV109.ts').HOMEWORLD_ARCHIVE_PLAQUE_V109;
    const nav=old.load('app/game/systems/homeworldNavigationV109.ts'),motor=old.load('app/game/systems/homeworldCargoV108.ts'),world=old.load('app/game/systems/homeworldWorldV77.ts');
    const currentCivic=current.load('app/game/systems/homeworldCivicWorldV80.ts'),publicPlaces=current.load('app/game/systems/homeworldPublicPlacesMountV112.ts');
    const placement=current.load('app/game/systems/homeworldPublicPlacesV112.ts'),marker=publicPlaces.HOMEWORLD_PUBLIC_PLACES_V112.find(p=>p.id==='public-place-v112:traveler-marker');
    assert(marker,'the actual V112 witness furniture must be mounted');
    const polygon=placement.homeworldPublicPlacePolygonV112(marker),blocked={x:polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,y:polygon.reduce((sum,p)=>sum+p.y,0)/polygon.length};
    let actor={...world.createHomeworldWorldActorV77(),...b.post,vx:0,vy:0},ledger=schema.defaultHomeworldArchivePlaqueV109(owner),steps=0,walked=0;
    const context=()=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor:{x:actor.x,y:actor.y},levelId:'0',visitedDistrictIds:['port'],active:true,artAvailable:true});
    const action=(name,patch={})=>{const result=oldApi.applyArchivePlaqueV109(ledger,name,ledger.revision,{...context(),...patch});assert(result.ok,name+': '+result.message);ledger=result.ledger;};
    const walkTo=target=>{
      const route=nav.homeworldWalkRouteV109('0',actor,target);assert.equal(route.status,'reachable');
      for(const point of route.points.slice(1)){
        for(let n=0;n<3000&&Math.hypot(point.x-actor.x,point.y-actor.y)>1;n++){
          const previous=actor,span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);
          actor=motor.stepHomeworldCargoActorV108(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,'0');
          const result=oldApi.sampleArchivePlaqueWalkV109(ledger,previous,actor,1/60,context());assert(!result.invalid,'old native recorded walk');ledger=result.ledger;
          assert(Math.hypot(actor.x-previous.x,actor.y-previous.y)>.000001,'old motor actually progresses');steps++;walked+=Math.hypot(actor.x-previous.x,actor.y-previous.y);
        }
        assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=1,'old native motor reaches its actual waypoint');
      }
    };
    for(const name of ['open','choose-a','reply','authorize','start'])action(name);
    if(groundObject){
      walkTo(b.objects[0].stand);for(const name of ['observe-plaque','copy-plaque','take-plaque'])action(name);
      walkTo({x:blocked.x,y:blocked.y+60});action('interrupt',{active:false});action('park');
      assert.equal(ledger.receipt.objects[0].place,'ground');
      assert(Math.hypot(ledger.receipt.objects[0].x-blocked.x,ledger.receipt.objects[0].y-blocked.y)<=1);
    }else{walkTo(blocked);action('interrupt',{active:false});}
    if(remote)walkTo(b.post);
    const location=old.load('app/game/systems/homeworldLocationV77.ts'),checkpoint=location.createHomeworldCheckpointV77(owner,'0',actor,null,actor);
    assert(location.resolveHomeworldLocationV77(checkpoint,owner).restored,'old source checkpoint genuinely restores');
    assert(schema.normalizeHomeworldArchivePlaqueV109(ledger),'old played receipt remains valid');
    const affected=groundObject?ledger.receipt.objects[0]:ledger.receipt.last;
    assert(old.load('app/game/systems/homeworldCivicWorldV80.ts').homeworldCivicWalkableV80('0',affected),'old whole body was supported at the affected point');
    assert(!currentCivic.homeworldCivicWalkableV80('0',affected),'current new native furniture actually blocks the old point');
    assert.equal(currentCivic.homeworldCivicWalkableV80('0',checkpoint.exterior),remote||groundObject,'actor occupancy differs intentionally between fixture families');
    return {owner,checkpoint,ledgers:{archivePlaqueV109:ledger},ledgerKey:'archivePlaqueV109',operation:'plaque',historicalActor:actor,expectedFallbackActor:world.createHomeworldWorldActorV77(),
      oldNativeWalkSteps:steps,oldNativeWalkDistance:walked,oldOperationWalked:ledger.receipt.walked,
      oldFree:true,currentBlocked:true,sourceCommit:EXCEL_HOMEWORLD_HISTORY_COMMIT_V112,
      privateSourceManifestSha256:historical.manifestSha256??null,affected:{x:affected.x,y:affected.y},remote,groundObject};
  })());
  return structuredClone(await memo.get(key));
}

function createCargoFixture(owner,{remote,groundObject},historical,old,current){
  const load=name=>old.load('app/game/systems/'+name+'.ts'),api=load('homeworldCargoV108');
  const definition=load('homeworldCargoDefinitionV108').HOMEWORLD_CARGO_V108,world=load('homeworldWorldV77'),nav=load('homeworldNavigationV109');
  const marker=current.load('app/game/systems/homeworldPublicPlacesMountV112.ts').HOMEWORLD_PUBLIC_PLACES_V112.find(p=>p.id==='public-place-v112:traveler-marker');
  const polygon=current.load('app/game/systems/homeworldPublicPlacesV112.ts').homeworldPublicPlacePolygonV112(marker);
  const blocked={x:polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,y:polygon.reduce((sum,p)=>sum+p.y,0)/polygon.length};
  let actor={...world.createHomeworldWorldActorV77(),...definition.post,vx:0,vy:0},ledger,steps=0,walked=0;
  const context=()=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor:{x:actor.x,y:actor.y},levelId:'0',visitedDistrictIds:['port'],active:true});
  const action=name=>{const result=api.applyCargoActionV108(ledger,name,ledger?.revision??0,context());assert(result.ok,name+': '+result.message);ledger=result.ledger;};
  const walkTo=target=>{
    const route=nav.homeworldWalkRouteV109('0',actor,target,ledger);assert.equal(route.status,'reachable');
    for(const p of route.points.slice(1)){
      for(let n=0;n<3000&&Math.hypot(p.x-actor.x,p.y-actor.y)>1;n++){
        const previous=actor,span=Math.max(Math.abs(p.x-actor.x)/330,Math.abs(p.y-actor.y)/260,1/60);
        actor=api.stepHomeworldCargoActorV108(actor,{moveX:(p.x-actor.x)/(330*span),climb:(p.y-actor.y)/(260*span),jumpPressed:false},1/60,'0',ledger);
        const result=api.sampleCargoWalkV108(ledger,previous,actor,1/60,context());assert(!result.invalid,'old native Cargo walk');ledger=result.ledger;
        assert(Math.hypot(actor.x-previous.x,actor.y-previous.y)>.000001,'old cargo motor progresses');steps++;walked+=Math.hypot(actor.x-previous.x,actor.y-previous.y);
      }
      assert(Math.hypot(p.x-actor.x,p.y-actor.y)<=1);
    }
  };
  for(const name of ['choose-a','reply','start','consent-owner'])action(name);
  walkTo(definition.lots[0].stand);action('take-wide');
  walkTo(groundObject?{x:blocked.x,y:blocked.y+60}:blocked);
  if(groundObject){action('interrupt');action('park');}
  if(remote)walkTo(definition.post);
  const checkpoint=load('homeworldLocationV77').createHomeworldCheckpointV77(owner,'0',actor,null,actor);
  assert(load('homeworldLocationV77').resolveHomeworldLocationV77(checkpoint,owner).restored);
  const affected=groundObject?ledger.receipt.lots[0]:ledger.receipt.last;
  assert(load('homeworldCivicWorldV80').homeworldCivicWalkableV80('0',affected));
  assert(!current.load('app/game/systems/homeworldCivicWorldV80.ts').homeworldCivicWalkableV80('0',affected));
  assert.equal(current.load('app/game/systems/homeworldCivicWorldV80.ts').homeworldCivicWalkableV80('0',checkpoint.exterior),remote||groundObject);
  return{owner,checkpoint,ledgers:{cargoV108:ledger},ledgerKey:'cargoV108',operation:'cargo',historicalActor:actor,expectedFallbackActor:world.createHomeworldWorldActorV77(),
    oldNativeWalkSteps:steps,oldNativeWalkDistance:walked,oldOperationWalked:ledger.receipt.walked,oldFree:true,currentBlocked:true,
    sourceCommit:EXCEL_HOMEWORLD_HISTORY_COMMIT_V112,privateSourceManifestSha256:historical.manifestSha256,
    affected:{x:affected.x,y:affected.y},remote,groundObject};
}
