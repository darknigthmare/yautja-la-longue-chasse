import assert from 'node:assert/strict';
import {archivePlaqueRouteV109} from './archive-plaque-v109-route.mjs';

/** All B gestures and the later A gestures use their real models and motor.
 * The only initial placement is the existing empty K-17 route checkpoint. */
export function archiveContinuationRouteV111(owner='2026-10-26T10:00:00.000Z'){
  const original=archivePlaqueRouteV109(owner),completed=original.complete('B'),{qa,b,nav,motor,world}=original;
  const api=qa.load('app/game/systems/homeworldArchiveContinuationV111.ts');
  const schema=qa.load('app/game/systems/homeworldArchiveContinuationLedgerV111.ts');
  let base=structuredClone(completed.ledger),ledger=schema.defaultHomeworldArchiveContinuationV111(owner),actor=structuredClone(completed.actor);
  let motorSteps=0,motorDistance=0;
  const context=(point=actor,patch={})=>({...original.context(point),basePlaque:base,...patch});
  const state=()=>({base,ledger,actor,motorSteps,motorDistance});
  const restore=value=>{base=structuredClone(value.base);ledger=structuredClone(value.ledger);actor=structuredClone(value.actor);motorSteps=value.motorSteps??0;motorDistance=value.motorDistance??0;};
  const action=(name,patch={})=>{const result=api.applyArchiveContinuationV111(ledger,name,ledger.revision,context(actor,patch));assert(result.ok,name+': '+result.message);ledger=result.ledger;return state();};
  function walkTo(target){
    const route=nav.homeworldWalkRouteV109('0',actor,target);assert.equal(route.status,'reachable','actual continuation route '+JSON.stringify(target));
    for(const destination of route.points.slice(1)){
      for(let n=0;n<2000&&Math.hypot(destination.x-actor.x,destination.y-actor.y)>2;n++){
        const before=actor,span=Math.max(Math.abs(destination.x-actor.x)/330,Math.abs(destination.y-actor.y)/260,1/60);
        actor=motor.stepHomeworldCargoActorV108(actor,{moveX:(destination.x-actor.x)/(330*span),climb:(destination.y-actor.y)/(260*span),jumpPressed:false},1/60,'0');
        const sampled=api.sampleArchiveContinuationWalkV111(ledger,before,actor,1/60,context());assert(!sampled.invalid,'supported continuation motor');ledger=sampled.ledger;
        motorSteps++;motorDistance+=Math.hypot(actor.x-before.x,actor.y-before.y);
      }
      assert(Math.hypot(destination.x-actor.x,destination.y-actor.y)<=2,'native motor reaches continuation stand');
    }
    return state();
  }
  function start(){for(const name of ['open','choose-a','reply','authorize','start'])action(name);return state();}
  function mismatch(){start();walkTo(b.supports[0].stand);action('inspect-edge');action('compare-supports');walkTo(b.post);action('report-mismatch');return state();}
  function fragment(){walkTo(b.objects[2].stand);action('observe-fragment');action('copy-fragment');action('take-fragment');walkTo(b.supports[2].stand);action('deposit');return state();}
  function complete(){mismatch();action('interrupt',{active:false});action('resume');fragment();walkTo(b.supports[0].stand);action('compare-fragment');action('conclude');walkTo(b.post);action('report');return state();}
  return{original,qa,b,nav,motor,world,api,schema,owner,state,restore,context,action,walkTo,start,mismatch,fragment,complete};
}
