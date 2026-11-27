/** Read-only input policy, shared by native simulation and browser drivers. */
const center=actor=>({x:actor.x+actor.width/2,y:actor.y+actor.height/2});
export function decideHuntCampaignInputV112(game,tick,memory,strategy='mixed'){
  const held=[],pressed=[],player=game.player,pc=center(player);
  const ritual=game.trophyRitual;
  if(game.trophyExtracting&&ritual){
    if(ritual.phase==='cue'&&ritual.cueElapsedSeconds>=.48)pressed.push(ritual.sequence[ritual.cueIndex]);
    return{held,pressed,reason:'native trophy glyph'};
  }
  if(player.health<player.maxHealth*.58&&player.medicomps>0&&player.healCooldown<=0)pressed.push('heal');
  if(player.scanCooldown<=0&&game.scanNodes.some(node=>!node.scanned&&Math.hypot(node.x-pc.x,node.y-pc.y)<450))pressed.push('scan');
  let target=game.scanNodes.find(node=>!node.scanned),reason='trace';
  if(!target){target=game.recoveryNodes.find(node=>!node.recovered);reason='technology';}
  if(!target){target=center(game.boss);reason=game.boss.alive?'apex':'apex trophy';}
  const purgePending=game.bossMechanics.missionId==='volcano-bad-blood'&&game.bossMechanics.purgeSeconds!==null&&!game.bossMechanics.purgeResolved;
  if(purgePending){target=game.purgeConsoleNodes.filter(node=>!node.recovered).sort((a,b)=>Math.abs(a.x-pc.x)-Math.abs(b.x-pc.x))[0]??target;reason='purge console';}
  const leaveGuardianAsh=game.bossMechanics.missionId==='ruins-ancient-guardian'&&game.boss.active&&game.boss.alive&&pc.x<game.world.bossArena.x+200;
  if(leaveGuardianAsh){target={x:game.world.bossArena.x+300,y:game.world.floorY-50};reason='leave ash before guardian';}
  if(game.phase==='extraction'){target={x:game.world.extraction.x,y:game.world.floorY-50};reason='extraction';}
  const enemies=game.enemies.filter(enemy=>enemy.active&&enemy.alive);
  if(game.boss.active&&game.boss.alive)enemies.push(game.boss);
  const nearest=enemies.map(enemy=>({enemy,point:center(enemy),range:Math.hypot(center(enemy).x-pc.x,center(enemy).y-pc.y)})).sort((a,b)=>a.range-b.range)[0];
  const fight=nearest&&nearest.range<(strategy==='rush'?100:strategy==='melee'?260:570)&&game.phase!=='extraction'&&!purgePending&&!leaveGuardianAsh;
  let pointer=null;
  if(fight){
    const {enemy,point,range}=nearest;target=point;reason='combat:'+enemy.id;
    const gap=Math.abs(point.x-pc.x)-(player.width+enemy.width)/2;
    const dodge=enemy.telegraph>0&&gap<100&&player.grounded&&player.stamina>25&&tick%30===0;
    if(dodge){
      held.push('down',point.x>pc.x?'left':'right');
      pressed.push('jump');
    }else if(strategy==='mixed'&&!game.energyWeaponsLocked&&(range>180||Math.abs(point.y-pc.y)>65)&&player.energy>=34){
      if(player.activeWeaponSlot!==1)pressed.push('weaponTwo');
      held.push('aim');pointer={x:point.x-game.cameraX,y:point.y-(game.cameraY??0)};
      if(player.weaponChargeSeconds>=.8&&player.weaponCooldown<=0)pressed.push('weapon');
    }else{
      if(player.activeWeaponSlot!==0)pressed.push('weaponOne');
      // The native swing uses player.facing, which only turns on movement while melee is idle.
      const behind=(point.x-pc.x)*(player.facing??1)<0&&Math.abs(point.x-pc.x)>8;
      if(behind&&gap<95&&player.melee.phase==='idle'){
        held.push(point.x>pc.x?'right':'left');
      }else if(gap<95&&Math.abs(point.y-pc.y)<140&&player.melee.phase==='idle'&&player.stamina>=20){
        if(tick%3!==0)held.push('down');
        pressed.push('melee');
      }
    }
    // Do not add the approach direction to a committed dodge.
    if(dodge||gap<55)target={...target,x:pc.x};
    if(!dodge&&range<260&&player.grounded&&tick>=(memory.nextJump??0)){
      pressed.push('jump');held.push('jump');memory.nextJump=tick+66;memory.jumpUntil=tick+12;
    }
  }
  if(reason==='technology'||reason==='purge console'||reason==='apex trophy'){
    if(Math.abs(target.y-pc.y)<95)delete memory.dropTargetX;
    if(player.grounded&&target.y-pc.y>100){
      const feet=player.y+player.height;
      const support=game.world.platforms.find(platform=>Math.abs(platform.y-feet)<3&&
        player.x+player.width>platform.x&&player.x<platform.x+platform.width);
      if(support&&(memory.dropTargetX===undefined||Math.abs(memory.dropTargetX-pc.x)<18)){
        const left=support.x-player.width-25,right=support.x+support.width+player.width+25;
        memory.dropDirection??=Math.abs(pc.x-left)<Math.abs(pc.x-right)?-1:1;
        memory.dropTargetX=memory.dropDirection<0?left:right;
      }
    }
    if(memory.dropTargetX!==undefined){target={...target,x:memory.dropTargetX};reason='descend by support edge';}
  }else{delete memory.dropTargetX;delete memory.dropDirection;}
  const dx=target.x-pc.x;
  const stop=reason==='trace'?140:reason==='technology'?25:reason==='extraction'?45:reason==='apex trophy'?30:6;
  if(Math.abs(dx)>stop)held.push(dx>0?'right':'left');
  if(((reason==='technology'&&Math.abs(dx)<80)||(reason==='purge console'&&Math.abs(dx)<80)||(reason==='apex trophy'&&Math.abs(dx)<100)||
    (reason==='extraction'&&Math.abs(dx)<100))&&tick>=(memory.nextInteractTick??0)){
      pressed.push('interact');memory.nextInteractTick=tick+30;
  }
  if(game.boss.active&&!game.boss.scanned&&Math.hypot(center(game.boss).x-pc.x,center(game.boss).y-pc.y)<440&&player.scanCooldown<=0)pressed.push('scan');
  const movement=held.includes('right')||held.includes('left');
  if(movement&&Math.abs(player.x-memory.previousX)<.2&&player.grounded)memory.stuckTicks++;else memory.stuckTicks=0;
  if(memory.stuckTicks>15&&player.grounded&&!held.includes('down')){pressed.push('jump');held.push('jump');memory.stuckTicks=0;memory.jumpUntil=tick+22;}
  if(tick<memory.jumpUntil)held.push('jump');
  if(leaveGuardianAsh&&player.grounded&&tick>=(memory.nextJump??0)){
    pressed.push('jump');held.push('jump');memory.nextJump=tick+66;memory.jumpUntil=tick+12;
  }
  memory.previousX=player.x;
  return{held:[...new Set(held)],pressed:[...new Set(pressed)],pointer,reason,target};
}

/** The ground recipe approaches the actual trophy, even when another target is
 * alive. Reach is assessed by production before the interact edge is emitted. */
export function decideGroundApexTrophyInputV112(game,tick,memory,point,inReach){
  const player=game.player,pc=center(player);
  if(inReach){
    delete memory.trophyExit;
    return {held:[],pressed:["interact"],reason:"reachable apex trophy"};
  }
  const feet=player.y+player.height;
  if(memory.trophyExit&&feet>memory.trophyExit.surfaceY+6)delete memory.trophyExit;
  if(!memory.trophyExit&&player.grounded&&point.y-pc.y>88){
    const support=game.world.platforms.find(platform=>
      Math.abs(platform.y-feet)<3&&player.x+player.width>platform.x&&player.x<platform.x+platform.width);
    if(support){
      const ends=[support.x-player.width/2-18,support.x+support.width+player.width/2+18]
        .filter(x=>x>=player.width/2&&x<=game.world.width-player.width/2);
      ends.sort((a,b)=>Math.abs(a-pc.x)-Math.abs(b-pc.x));
      if(ends.length)memory.trophyExit={x:ends[0],surfaceY:support.y};
    }
  }
  let x=memory.trophyExit?.x??point.x;
  const side=(Math.floor(tick/90)%2)===0?1:-1;
  if(!memory.trophyExit&&player.grounded&&Math.abs(x-pc.x)<18)x+=side*85;
  const dx=x-pc.x,held=[],pressed=[];
  if(Math.abs(dx)>6)held.push(dx>0?"right":"left");
  const still=held.length&&Number.isFinite(memory.previousTrophyX)&&Math.abs(memory.previousTrophyX-player.x)<.2;
  memory.trophyStuckTicks=still?(memory.trophyStuckTicks??0)+1:0;
  memory.previousTrophyX=player.x;
  if(player.grounded&&!memory.trophyExit&&tick>=(memory.nextTrophyJump??0)&&
      (memory.trophyStuckTicks>=18||point.y<pc.y-88&&Math.abs(point.x-pc.x)<145)){
    pressed.push("jump");
    memory.nextTrophyJump=tick+66;
    memory.trophyJumpUntil=tick+12;
  }
  if(tick<(memory.trophyJumpUntil??0))held.push("jump");
  return {held,pressed,reason:memory.trophyExit?"descend to apex trophy":"approach apex trophy"};
}

/** A damaged rite is allowed a short local defence before trying the trophy
 * again. A wall or a different floor cannot turn defence into a waypoint. */
export function observeGroundTrophyDamageV112(game,tick,memory,wasExtracting,previousDamage){
  if(!wasExtracting||game.phase!=="trophy"||game.trophyExtracting||game.damageTaken<=previousDamage)return false;
  memory.defendUntil=tick+240;
  return true;
}

export function groundTrophyGuardV112(game,tick,memory,blocked){
  if(game.phase!=="trophy"||game.trophyExtracting||!game.player.grounded||tick>=(memory.defendUntil??0))return null;
  const player=game.player,pc=center(player),feet=player.y+player.height;
  return game.enemies.filter(enemy=>enemy.alive&&enemy.active&&!enemy.boss)
    .map(enemy=>({enemy,point:center(enemy)}))
    .filter(({enemy,point})=>Math.abs(feet-enemy.y-enemy.height)<=72&&Math.abs(pc.y-point.y)<=100&&
      Math.abs(pc.x-point.x)-(player.width+enemy.width)/2<=125&&!blocked(pc,point))
    .sort((a,b)=>Math.abs(pc.x-a.point.x)-Math.abs(pc.x-b.point.x))[0]?.enemy??null;
}
