import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './homeworld-scene-ssr-v78.mjs';
/** Starts at a declared empty K-17 campaign checkpoint. Every observation,
 * consent, copied provenance, carry and report below uses the real model and
 * current cargo motor on the collision-checked V109 route. */
export function archivePlaqueRouteV109(owner='2026-10-25T10:00:00.000Z'){
 const qa=homeworldSceneSsrV78(),api=qa.load('app/game/systems/homeworldArchivePlaqueV109.ts'),schema=qa.load('app/game/systems/homeworldArchivePlaqueLedgerV109.ts'),defs=qa.load('app/game/systems/homeworldArchivePlaqueDefinitionV109.ts'),nav=qa.load('app/game/systems/homeworldNavigationV109.ts'),motor=qa.load('app/game/systems/homeworldCargoV108.ts'),world=qa.load('app/game/systems/homeworldWorldV77.ts'),b=defs.HOMEWORLD_ARCHIVE_PLAQUE_V109;
 let ledger=schema.defaultHomeworldArchivePlaqueV109(owner),actor={...world.createHomeworldWorldActorV77(),...b.post,vx:0,vy:0};
 const context=(p=actor,patch={})=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor:{x:p.x,y:p.y},levelId:'0',visitedDistrictIds:['port'],active:true,artAvailable:true,...patch});
 const state=()=>({ledger,actor}),restore=s=>{ledger=structuredClone(s.ledger);actor=structuredClone(s.actor);};
 const action=(name,patch={})=>{const out=api.applyArchivePlaqueV109(ledger,name,ledger.revision,context(actor,patch));assert(out.ok,name+': '+out.message);ledger=out.ledger;return state();};
 function walkTo(target){const route=nav.homeworldWalkRouteV109('0',actor,target);assert.equal(route.status,'reachable','native K-17 path '+JSON.stringify(target));
  for(const point of route.points.slice(1)){
   for(let n=0;n<2000&&Math.hypot(point.x-actor.x,point.y-actor.y)>2;n++){
    const before=actor,span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);actor=motor.stepHomeworldCargoActorV108(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,'0');
    const out=api.sampleArchivePlaqueWalkV109(ledger,before,actor,1/60,context());assert(!out.invalid,'supported K-17 motor '+JSON.stringify({before,actor,point}));ledger=out.ledger;
   }assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=2,'K-17 motor reaches '+JSON.stringify({actor,point}));
  }return state();
 }
 function start(option='A'){for(const a of ['open',option==='A'?'choose-a':'choose-b','reply','authorize','start'])action(a);return state();}
 function place(id){const d=b.objects.find(o=>o.id===id),s=b.supports.find(o=>o.id===id);walkTo(d.stand);action('observe-'+id);action('copy-'+id);action('take-'+id);walkTo(s.stand);action('deposit');return state();}
 function beforeMismatch(){start();place('plaque');place('trace');walkTo(b.supports[0].stand);action('inspect-edge');action('compare-supports');walkTo(b.post);action('report-mismatch');return state();}
 function complete(option='A'){
  if(option==='A'){beforeMismatch();action('interrupt',{active:false});action('resume');place('fragment');walkTo(b.supports[0].stand);action('compare-fragment');}
  else {start('B');place('plaque');place('trace');walkTo(b.supports[0].stand);}
  action('conclude');walkTo(b.post);action('report');return state();
 }
 return{qa,api,schema,defs,nav,motor,world,b,owner,context,state,restore,action,walkTo,start,place,beforeMismatch,complete};
}
