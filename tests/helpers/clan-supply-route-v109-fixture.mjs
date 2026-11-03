import assert from 'node:assert/strict';

/** Declared model preparation, never a browser-earned construction campaign.
 * Every retained person, stock, completed work and overlap comes from accepted
 * commands of the unchanged V108 engine; no checkpoint field is assigned. */
export function createLegacySupplyDriverV109(api){
  let state=api.createLogisticsV108();assert.ok(state);
  const d={
    get state(){return state;},
    send(action){const result=api.applyLogisticsV108(state,api.logisticsCommandV108(state,action));assert.equal(result.accepted,true,JSON.stringify(action)+' '+result.message);state=result.state;assert.equal(api.logisticsConservationV108(state),true);return state;},
    walk(id,x,y){let actor=api.logisticsActorV108(state,id);for(let guard=0;Math.hypot(actor.x-x,actor.y-y)>.05;guard++){assert.ok(guard<200);const dx=x-actor.x,dy=y-actor.y,dist=Math.hypot(dx,dy),step=Math.min(dist,24);d.send({kind:'move',actor:id,dx:dx/dist*step,dy:dy/dist*step});actor=api.logisticsActorV108(state,id);}},
    wait(n){for(let i=0;i<n;i++)d.send({kind:'wait'});},
    east(id,x,y){const actor=api.logisticsActorV108(state,id);if(actor.x<430){d.walk(id,390,450);d.walk(id,570,450);d.walk(id,570,390);d.walk(id,660,390);}else if(actor.x<640){d.walk(id,570,390);d.walk(id,660,390);}else{d.walk(id,actor.x,390);d.walk(id,660,390);}d.walk(id,660,y);d.walk(id,x,y);},
    home(id){const actor=api.logisticsActorV108(state,id);if(actor.x>540){if(actor.x<640){d.walk(id,570,actor.y);d.walk(id,570,390);}else{d.walk(id,actor.x,390);d.walk(id,660,390);d.walk(id,570,390);}d.walk(id,570,450);d.walk(id,390,450);}d.walk(id,100,500);},
    refill(){d.walk('carrier',390,300);d.send({kind:'rav-load',actor:'carrier',location:'boat',amount:20});d.home('carrier');d.send({kind:'rav-deposit',actor:'carrier',location:'depot',amount:20});},
    retire(id){d.home(id);const rav=api.logisticsActorV108(state,id).rav;if(rav)d.send({kind:'rav-deposit',actor:id,location:'depot',amount:rav});d.send({kind:'release',actor:id});},
    build(id){const operator='operator:'+id,point=api.CLAN_LOGISTICS_SITES_V108[id];d.send({kind:'reserve',work:id});d.send({kind:'load-kit',work:id});if(id==='W3-S09')d.walk('carrier',point.x,point.y);else d.east('carrier',point.x,point.y);d.send({kind:'deliver-kit',work:id});d.send({kind:'rav-deposit',actor:'carrier',location:id,amount:20});if(id==='W3-S09')d.walk(operator,point.x,point.y);else d.east(operator,point.x,point.y);d.walk(operator,point.x-24,point.y);d.send({kind:'support-left',work:id});d.walk(operator,point.x+24,point.y);d.send({kind:'support-right',work:id});d.walk(operator,point.x,point.y);for(let i=0;i<(id==='W3-S14'||id==='W3-S15'?2:3);i++)d.send({kind:'work',work:id});d.send({kind:'staff',work:id});},
  };
  return d;
}
export function prepareLegacySupplyFixtureV109(api,{overlappedMounts=false}={}){
  const d=createLegacySupplyDriverV109(api);
  d.send({kind:'hire',actor:'carrier'});
  for(const work of ['W3-S09','W3-S10','W3-S13','W3-S14','W3-S15','W3-S18']){
    while(d.state.depot<92)d.refill();
    const operator='operator:'+work;d.send({kind:'hire',actor:operator});d.wait(3);d.home(operator);d.send({kind:'rav-load',actor:operator,location:'depot',amount:6});d.send({kind:'rav-load',actor:'carrier',location:'depot',amount:20});d.build(work);
    if(work==='W3-S10'&&overlappedMounts){
      d.home('carrier');d.send({kind:'load-object',object:'water'});d.east('carrier',720,530);d.send({kind:'install-object',object:'water'});
      for(const [index,x] of [[1,570],[2,650]]){d.east(operator,x,90);d.send({kind:'lead',mount:'mount-v108-'+index});d.walk(operator,570,90);d.walk(operator,570,390);d.walk(operator,660,390);d.walk(operator,660,530);d.walk(operator,720,530);if(!d.state.works.find(w=>w.id==='W3-S10').staffed)d.send({kind:'staff',work:'W3-S10'});d.send({kind:'care',mount:'mount-v108-'+index});d.send({kind:'unlead',mount:'mount-v108-'+index});}
    }
    d.retire(operator);d.home('carrier');
  }
  d.retire('carrier');d.send({kind:'contract',actor:'carrier'});
  d.send({kind:'contract',actor:'operator:W3-S09'});d.wait(1);d.home('operator:W3-S09');d.send({kind:'rav-load',actor:'operator:W3-S09',location:'depot',amount:6});d.walk('operator:W3-S09',390,300);
  d.walk('carrier',390,300);d.send({kind:'rav-load',actor:'carrier',location:'boat',amount:20});d.send({kind:'rav-deposit',actor:'carrier',location:'W3-S09',amount:20});d.home('carrier');d.wait(1);d.send({kind:'staff',work:'W3-S09'});
  assert.equal(d.state.works.filter(work=>work.phase==='ready').length,6);assert.equal(d.state.actors[0].rav,0);assert.ok(d.state.boat.cargo>=20);assert.equal(api.logisticsFunctionalV108(d.state,'W3-S09'),true);
  const archive=api.exportLogisticsV108(d.state);assert.equal(api.importLogisticsV108(archive).state.revision,d.state.revision);
  return {archive,description:'MODEL_PREPARED: six V108 works built by accepted engine commands, real finite costs and identified people. These are not new browser-earned constructions. '+(overlappedMounts?'Both native legacy mounts were led and watered at the same old point through the V108 reducer; V109 must separate them through actual movement.':'Mounts retain their distinct original positions.'),state:d.state};
}
