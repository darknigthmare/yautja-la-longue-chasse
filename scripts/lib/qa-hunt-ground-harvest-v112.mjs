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

/** Available anatomy can have 2- or 3-unit steps. Keep a path to the exact
 * volume limit when the current set of genuine prey supports one. */
function canCompleteVolumeV112(pool,excluded,massBudget,volumeBudget){
  if(volumeBudget<0||massBudget< -1e-9)return false;
  const leastMass=Array(volumeBudget+1).fill(Infinity);
  leastMass[0]=0;
  for(const option of pool){
    if(option.key===excluded||option.volumeUnits>volumeBudget)continue;
    for(let units=volumeBudget;units>=option.volumeUnits;units--){
      leastMass[units]=Math.min(leastMass[units],leastMass[units-option.volumeUnits]+option.massKg);
    }
  }
  return leastMass[volumeBudget]<=massBudget+1e-9;
}
export function exactVolumeCandidatesV112(candidates,{load,pool}){
  const remainingVolume=load.capacityVolumeUnits-load.volumeUnits;
  const remainingMass=load.capacityMassKg-load.massKg;
  return candidates.filter(candidate=>canCompleteVolumeV112(pool,candidate.key,
    remainingMass-candidate.part.massKg,remainingVolume-candidate.part.volumeUnits));
}

/** Reserve a specific, currently admissible anatomy part instead of making
 * the closest body an unconditional blocking waypoint. */
export function chooseGroundHarvestV112(candidates,tick,memory,loadRatio,minimumRatio,packing){
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
  const exact=packing&&minimumRatio===1?exactVolumeCandidatesV112(eligible,packing):[];
  const ranked=exact.length?exact:eligible;
  const efficiency=candidate=>(Math.min(candidate.projectedRatio,threshold)-loadRatio)/
    (candidate.workSeconds+candidate.distance/220);
  ranked.sort((a,b)=>efficiency(b)-efficiency(a)||a.distance-b.distance);
  selected=ranked[0];
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
