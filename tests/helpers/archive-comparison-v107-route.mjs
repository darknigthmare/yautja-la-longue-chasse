import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './homeworld-scene-ssr-v78.mjs';
/** Real source actions + shared civic motor, never a hand-authored receipt. */
export function archiveComparisonRouteV107(owner='2026-10-23T10:00:00.000Z'){
 const qa=homeworldSceneSsrV78(),api=qa.load('app/game/systems/homeworldArchiveComparisonV107.ts'),schema=qa.load('app/game/systems/homeworldArchiveComparisonLedgerV107.ts'),defs=qa.load('app/game/systems/homeworldArchiveComparisonDefinitionV107.ts');
 const old=qa.load('app/game/systems/homeworldArchiveV106.ts'),oldDefs=qa.load('app/game/systems/homeworldArchiveDefinitionV106.ts'),nav=qa.load('app/game/systems/homeworldNavigationV77.ts'),world=qa.load('app/game/systems/homeworldWorldV77.ts');
 const b=defs.HOMEWORLD_ARCHIVE_COMPARISON_V107,base=oldDefs.HOMEWORLD_ARCHIVE_V106;
 let legacyArchive,actor={...world.createHomeworldWorldActorV77(),...base.post,vx:0,vy:0},ledger;
 const context=(p=actor,patch={})=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor:{x:p.x,y:p.y},levelId:'0',visitedDistrictIds:['port'],active:true,legacyArchive,...patch});
 function walkTo(target,legacy=false,onStep=()=>{}){const route=nav.homeworldWalkRouteV77('0',actor,target);assert.equal(route.status,'reachable',JSON.stringify(target));for(const point of route.points.slice(1)){
  for(let i=0;i<1600&&Math.hypot(point.x-actor.x,point.y-actor.y)>5;i++){
   const before=actor,span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);
   actor=api.stepHomeworldArchiveComparisonActorV107(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,'0');
   const out=legacy?old.sampleArchiveWalkV106(legacyArchive,before,actor,1/60,context()):api.sampleArchiveComparisonV107(ledger,before,actor,1/60,context());assert(!out.invalid,'real motor route '+JSON.stringify({target,actor}));
   if(legacy)legacyArchive=out.ledger;else ledger=out.ledger;onStep({actor,ledger,legacyArchive});
  }assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=5,'native motor reaches node');
 }return state();}
 const oldAction=action=>{const out=old.applyArchiveActionV106(legacyArchive,action,legacyArchive?.revision??0,context());assert(out.ok,out.message+' '+action);legacyArchive=out.ledger;};
 const action=(name,patch={})=>{const out=api.applyArchiveComparisonV107(ledger,name,ledger?.revision??0,context(actor,patch));assert(out.ok,out.message+' '+name);ledger=out.ledger;return state();};
 const state=()=>({actor,ledger,legacyArchive});
 function baseCompleted(){for(const a of['choose-b','reply','start'])oldAction(a);for(let i=0;i<2;i++){walkTo(base.cases[i].stand,true);oldAction(i===0?'take-a':'take-b');walkTo(base.supports[i].stand,true);oldAction(i===0?'deposit-a':'deposit-b');}walkTo(base.post,true);oldAction('report');return state();}
 function started(){baseCompleted();for(const a of['choose-a','reply','start'])action(a);return state();}
 function carried(){started();walkTo(b.evidence.stand);action('discover');action('copy-provenance');action('take');return state();}
 function readyToCompare(){carried();walkTo(b.table.stand);action('deposit');for(const s of b.references){walkTo(s.stand);action(s.caseId==='A'?'observe-a':'observe-b');}walkTo(b.table.stand);return state();}
 function completed(){readyToCompare();action('compare');walkTo(b.post);action('report');return state();}
 const restore=s=>{actor=structuredClone(s.actor);ledger=structuredClone(s.ledger);legacyArchive=structuredClone(s.legacyArchive);};
 return {qa,api,schema,defs,b,base,nav,world,context,state,restore,action,walkTo,baseCompleted,started,carried,readyToCompare,completed,owner};
}
