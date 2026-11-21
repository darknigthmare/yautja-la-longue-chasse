const SOURCE_RETRY_TICKS=240;
const MAX_STALL_TICKS=135;
const MIN_APPROACH_GAIN=5;

function deferGroundHarvestV112(memory,tick,target,reason){
  const attempts=(memory.deferred.get(target.key)?.attempts??0)+1;
  memory.deferred.set(target.key,{attempts,until:tick+SOURCE_RETRY_TICKS});
  memory.events.push({tick,corpseId:target.corpse.id,action:target.part.action,reason});
  memory.target=null;
}

export function observeGroundHarvestV112(ledger,tick,memory){
  const pending=memory.pending;
  if(!pending||ledger.operation)return;
  memory.pending=null;
  if(!ledger.completedEventIds.includes(pending.action+":"+pending.target.corpse.id)){
    deferGroundHarvestV112(memory,tick,pending.target,"geste interrompu");
  }else if(pending.action===pending.target.part.action){
    memory.events.push({tick,corpseId:pending.target.corpse.id,action:pending.action,reason:"prise récoltée"});
    memory.target=null;
  }else{
    memory.progressTick=tick;
  }
}

/** Reserve a specific, currently admissible anatomy part instead of making
 * the closest body an unconditional blocking waypoint. */
export function chooseGroundHarvestV112(candidates,tick,memory,loadRatio,minimumRatio){
  let selected=candidates.find(candidate=>candidate.key===memory.target?.key);
  if(selected&&selected.distance<memory.bestDistance-MIN_APPROACH_GAIN){
    memory.bestDistance=selected.distance;
    memory.progressTick=tick;
  }
  if(selected&&tick-memory.progressTick<MAX_STALL_TICKS)return selected;
  if(memory.target)deferGroundHarvestV112(memory,tick,memory.target,
    selected?"aucun progrès vers le poste":"poste devenu inaccessible");
  const eligible=candidates.filter(candidate=>{
    const record=memory.deferred.get(candidate.key);
    return !record||record.attempts<2&&tick>=record.until;
  });
  const threshold=minimumRatio??1;
  const efficiency=candidate=>(Math.min(candidate.projectedRatio,threshold)-loadRatio)/
    (candidate.workSeconds+candidate.distance/220);
  eligible.sort((a,b)=>efficiency(b)-efficiency(a)||a.distance-b.distance);
  selected=eligible[0];
  if(!selected)return null;
  memory.target=selected;
  memory.bestDistance=selected.distance;
  memory.progressTick=tick;
  memory.events.push({tick,corpseId:selected.corpse.id,action:selected.part.action,reason:"poste choisi"});
  return selected;
}

export function groundHarvestMenuActionV112(menu,target){
  if(!menu)return null;
  if(!menu.open)return "open";
  if(menu.corpseId!==target.corpse.id)return menu.nextCorpseId?"next-corpse":null;
  if(target.part.requiresFlay&&!menu.flayed)return menu.canFlay?"flay":null;
  return menu.parts.some(part=>part.action===target.part.action&&part.available)?target.part.action:null;
}

export function nearestGroundHarvestThreatV112(player,enemies){
  const x=player.x+player.width/2,y=player.y+player.height/2;
  return Math.min(Infinity,...enemies.map(enemy=>{
    const horizontal=Math.max(0,Math.abs(enemy.x+enemy.width/2-x)-(enemy.width+player.width)/2);
    const vertical=Math.max(0,Math.abs(enemy.y+enemy.height/2-y)-(enemy.height+player.height)/2);
    return Math.hypot(horizontal,vertical);
  }));
}
