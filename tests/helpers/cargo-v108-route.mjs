import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './homeworld-scene-ssr-v78.mjs';
/** Executes real source actions and native motor. Navigation additionally
 * rejects live lot hulls, which deliberately cannot enter the cached atlas. */
export function cargoRouteV108(owner='2026-10-24T10:00:00.000Z'){
 const qa=homeworldSceneSsrV78(),api=qa.load('app/game/systems/homeworldCargoV108.ts'),schema=qa.load('app/game/systems/homeworldCargoLedgerV108.ts'),defs=qa.load('app/game/systems/homeworldCargoDefinitionV108.ts'),nav=qa.load('app/game/systems/homeworldNavigationV77.ts'),world=qa.load('app/game/systems/homeworldWorldV77.ts'),civic=qa.load('app/game/systems/homeworldCivicWorldV80.ts'),b=defs.HOMEWORLD_CARGO_V108;
 let ledger=schema.defaultHomeworldCargoV108(owner),actor={...world.createHomeworldWorldActorV77(),...b.post,vx:0,vy:0};
 const context=(p=actor,patch={})=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor:{x:p.x,y:p.y},levelId:'0',visitedDistrictIds:['port'],active:true,...patch});
 const state=()=>({ledger,actor});const restore=s=>{ledger=structuredClone(s.ledger);actor=structuredClone(s.actor);};
 const action=(name,patch={})=>{const out=api.applyCargoActionV108(ledger,name,ledger.revision,context(actor,patch));assert(out.ok,name+': '+out.message);ledger=out.ledger;return state();};
 const clear=(a,z)=>{if(!nav.homeworldRouteSegmentV77('0',a,z))return false;const count=Math.max(1,Math.ceil(Math.hypot(z.x-a.x,z.y-a.y)/3));for(let i=0;i<=count;i++)if(api.cargoCaseCollisionV108(ledger,{x:a.x+(z.x-a.x)*i/count,y:a.y+(z.y-a.y)*i/count}))return false;return true;};
 function plan(target){
  if(clear(actor,target))return[target];
  const nodes=[{x:actor.x,y:actor.y},target];for(const lot of api.cargoLotsV108(ledger)){if(lot.place==='carried')continue;for(const dx of[-110,110])for(const dy of[-90,90]){const p={x:lot.x+dx,y:lot.y+dy};if(civic.homeworldCivicWalkableV80('0',p)&&!api.cargoCaseCollisionV108(ledger,p))nodes.push(p);}}
  // Add existing safe route sockets rather than reducing the actor footprint.
  for(const x of[6500,6650,6850,7050])for(const y of[5310,5540]){const p={x,y};if(civic.homeworldCivicWalkableV80('0',p)&&!api.cargoCaseCollisionV108(ledger,p))nodes.push(p);}
  const dist=new Map([[0,0]]),paths=new Map([[0,[]]]),done=new Set();
  while(done.size<nodes.length){let current=-1,best=Infinity;for(const [i,d]of dist)if(!done.has(i)&&d<best){current=i;best=d;}assert(current>=0,'native cargo route to '+JSON.stringify(target));if(current===1)return paths.get(1);done.add(current);
   for(let j=1;j<nodes.length;j++){if(done.has(j)||!clear(nodes[current],nodes[j]))continue;const points=[nodes[current],nodes[j]];
    const length=points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0),score=best+length;if(score>=(dist.get(j)??Infinity))continue;dist.set(j,score);paths.set(j,[...paths.get(current),...points.slice(1)]);
   }
  }throw Error('No cargo route');
 }
 function walkTo(target,onStep=()=>{}){for(const point of plan(target)){
   for(let i=0;i<2000&&Math.hypot(point.x-actor.x,point.y-actor.y)>2;i++){
    const before=actor,span=Math.max(Math.abs(point.x-actor.x)/330,Math.abs(point.y-actor.y)/260,1/60);actor=api.stepHomeworldCargoActorV108(actor,{moveX:(point.x-actor.x)/(330*span),climb:(point.y-actor.y)/(260*span),jumpPressed:false},1/60,'0',ledger);
    const out=api.sampleCargoWalkV108(ledger,before,actor,1/60,context());assert(!out.invalid,'supported cargo motor '+JSON.stringify({before,actor,target}));ledger=out.ledger;onStep(state());
   }assert(Math.hypot(point.x-actor.x,point.y-actor.y)<=2,'cargo motor reaches '+JSON.stringify({point,actor}));
  }return state();}
 function start(option='A'){for(const a of[option==='A'?'choose-a':'choose-b','reply','start','consent-owner'])action(a);if(option==='B'){walkTo(b.guardian.post);action('consent-depot');}return state();}
 function placeWide(option='A'){walkTo(b.lots[0].stand);action('take-wide');walkTo(option==='A'?b.racks[0].stand:b.depot.stand);action(option==='A'?'deposit-rack-wide':'deposit-depot');return state();}
 function placeNarrow(){walkTo(b.lots[1].stand);action('take-narrow');walkTo(b.racks[1].stand);action('deposit-rack-narrow');return state();}
 function complete(option='A'){start(option);placeWide(option);placeNarrow();walkTo(b.passage.start);action('check-passage');walkTo(b.passage.end);assert.equal(ledger.receipt.passageTested,true);walkTo(b.post);action('report');return state();}
 return{qa,api,schema,defs,b,owner,context,state,restore,action,plan,walkTo,start,placeWide,placeNarrow,complete,nav,civic,world};
}
