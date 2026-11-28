import {createRoot} from 'react-dom/client';
import GameClient from '../../app/game/GameClient';
import {ACTIVE_HUNT_STORAGE_KEY} from '../../app/game/systems/activeHuntSave';
import {SAVE_STORAGE_KEY} from '../../app/game/save';
import {canopyBackHandGripV112} from '../../app/game/systems/canopyGripPresentationV112';
import {canopySwingPointV112} from '../../app/game/systems/canopyTraversalV112';
import '../../app/globals.css';

// This fixture mounts the complete production front end and GameClient. The
// native Canvas hook is injected by the runner at a single declared boundary.
// It exposes observation, and one initial field-prey setup. It replaces no
// production callback, admission, serializer, writer, claim or simulation loop.
// Platform setItem is observed after the native call, with no refusal/delay or
// alternate bytes. This is disclosed separately from the production writer.
const mode=new URL(window.location.href).searchParams.get('case')??'loaded-oseris';
const clone=value=>JSON.parse(JSON.stringify(value,(_key,item)=>item instanceof Set?[...item]:item));
const audit={
  mode,
  documentId:crypto.randomUUID(),
  runtime:null,
  mounts:[],
  writes:[],
  setups:[],
  rootDraws:new Map(),
  trophyDraws:new Map(),
  results:[],
  apexSetup:null,
};
const nativeSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  const result=nativeSet.call(this,key,value);
  if(this===localStorage&&key===ACTIVE_HUNT_STORAGE_KEY){
    try{
      const parsed=JSON.parse(value);
      audit.writes.push({
        runId:parsed.runId,
        sequence:parsed.sequence,
        elapsed:parsed.snapshot?.checkpoint?.elapsed,
        bytes:new TextEncoder().encode(value).byteLength,
      });
    }catch{
      audit.writes.push({classification:'NATIVE_NON_JSON_TOMBSTONE',bytes:new TextEncoder().encode(value).byteLength});
    }
  }
  return result;
};
audit.disk=()=>JSON.parse(localStorage.getItem(ACTIVE_HUNT_STORAGE_KEY)??'null');
audit.campaign=()=>JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY)??'null');
audit.state=()=>{
  const handle=audit.runtime;
  if(!handle)return null;
  const game=handle.game;
  let canopyGripContact=null;
  const swing=game.player.climbing?game.player.canopySwing:null;
  const support=swing?game.world.climbables.find(item=>item.id===swing.supportId):null;
  if(swing&&support){
    // This is the same rig solver called by the production hunter renderer.
    // The observation is made synchronously with this state; screenshots can
    // render later native frames, so before/after measurements are preserved.
    const frame=handle.native.solvePlayerRigFrame(game,game.player);
    const hand=canopyBackHandGripV112(frame);
    const target=canopySwingPointV112(swing,support);
    canopyGripContact={supportId:support.id,elapsed:game.elapsed,facing:game.player.facing,hand,target,distancePx:Math.hypot(hand.x-target.x,hand.y-target.y)};
  }
  return clone({
    alive:handle.alive,
    resumed:handle.resumed,
    missionId:handle.mission.id,
    encounterRun:handle.encounterRun,
    elapsed:game.elapsed,
    paused:game.paused,
    phase:game.phase,
    message:game.message,
    camera:{x:game.cameraX,y:game.cameraY},
    canopyGripContact,
    canopyTransfer:game.canopyTransfer?{...game.canopyTransfer}:null,
    player:game.player,
    rites:game.huntRites,
    fieldLoad:handle.native.huntFieldLoadV112(game),
    riteToolInitialCondition:game.riteToolInitialConditionV112,
    damageTaken:game.damageTaken,
    objectives: [...game.completedObjectives],
    scanNodes:game.scanNodes,
    recoveryNodes:game.recoveryNodes,
    supportKills:game.supportKills,
    secondWindUsed:game.secondWindUsed,
    boss:{id:game.boss.id,archetype:game.boss.archetype,x:game.boss.x,y:game.boss.y,width:game.boss.width,height:game.boss.height,active:game.boss.active,alive:game.boss.alive,health:game.boss.health,maxHealth:game.boss.maxHealth,scanned:game.boss.scanned,telegraph:game.boss.telegraph},
    world:{
      width:game.world.width,
      floorY:game.world.floorY,
      spawn:game.world.spawn,
      extraction:game.world.extraction,
      platforms:game.world.platforms,
      climbables:game.world.climbables,
      hazards:game.world.hazards,
    },
    enemies:game.enemies.map(enemy=>({
      id:enemy.id,archetype:enemy.archetype,alive:enemy.alive,
      active:enemy.active,boss:enemy.boss,x:enemy.x,y:enemy.y,height:enemy.height,width:enemy.width,health:enemy.health,maxHealth:enemy.maxHealth,scanned:enemy.scanned,telegraph:enemy.telegraph,
    })),
    ship:game.dropShip,
    secondaryDrops:game.regularTrophyDrops,
    primaryClaim:game.trophyClaim,
    trophyCarried:game.trophyCarried,
    apexPoint:handle.native.trophyHarvestPoint(game.boss,52),
    apexInReach:handle.native.trophyHarvestInReach(game.player,handle.native.trophyHarvestPoint(game.boss,52),
      game.world.platforms,handle.native.APEX_TROPHY_REACH),
    reachableSupportIds:game.world.climbables.filter(support=>handle.native.canopySupportReachableV112(game.player,support,game.world.platforms)).map(support=>support.id),
    inputs:{keyboard:[...handle.input.keyboardHeld],touch:[...handle.input.touchHeld],gamepad:[...handle.input.gamepadHeld]},
  });
};
window.__onSkinningCanopyMountV112=handle=>{
  audit.runtime=handle;
  const game=handle.game;
  audit.mounts.push({resumed:handle.resumed,elapsed:game.elapsed,originalEnemyCount:game.enemies.length});
  if(handle.resumed)return;
  const sourceEnemyId = {
    'loaded-oseris':'oseris-iv--vineback-grazer',
    'loaded-naraka':'naraka-delta--iron-croc',
    'loaded-mycora':'mycora-v--spore-hound',
  }[mode];
  if(typeof sourceEnemyId!=='string')return;
  const originalEnemyIds=game.enemies.map(enemy=>enemy.id);
  const prey=handle.native.makeEnemy(
    'qa-field-prey',sourceEnemyId,handle.mission.id,
    game.player.x+40,game.world.width,80,10,0,1,1,
  );
  Object.assign(prey,{
    y:game.world.floorY-prey.height,
    knockbackRestY:game.world.floorY-prey.height,
    scanned:true,
    active:true,
  });
  game.enemies.push(prey);
  handle.native.damageEnemy(game,handle.mission,prey,prey.health,'melee');
  audit.setups.push({
    kind:'ONE_DECLARED_INITIAL_PREY_CREATED_BY_NATIVE_DAMAGE',
    sourceEnemyId:prey.archetype,
    sourceActorId:prey.id,
    originalEnemyIds,
    originalEnemyCount:originalEnemyIds.length,
    resultingEnemyCount:game.enemies.length,
    playerMoved:false,
    worldGeometryChanged:false,
    enemiesRemoved:false,
    hazardsRemoved:false,
    playerInvulnerable:false,
    corpse:clone(game.huntRites.corpses.find(corpse=>corpse.id===prey.id)),
  });
};
window.__onCanopyRootDrawV112=(id,image)=>{
  if(image?.complete&&image.naturalWidth>0&&image.naturalHeight>0&&!audit.rootDraws.has(id)){
    audit.rootDraws.set(id,{src:image.src,width:image.naturalWidth,height:image.naturalHeight});
  }
};
audit.prepareApex=()=>{
  if(mode==='native-oseris'||mode==='loaded-mycora')throw Error('This route does not stage the Apex');
  const {game,native,mission}=audit.runtime;
  if(audit.apexSetup||game.phase!=='tracking'||!game.player.grounded||!game.boss.alive||
      !game.regularTrophyDrops.some(drop=>drop.collected))throw Error('A completed local trophy route must precede the declared Apex setup');
  const state=()=>clone({player:game.player,rites:game.huntRites,phase:game.phase,primaryClaim:game.trophyClaim,
    boss:{x:game.boss.x,y:game.boss.y,alive:game.boss.alive,health:game.boss.health}});
  const before=state();
  for(const objective of mission.objectives){
    if(objective.kind!=='boss'&&objective.kind!=='extract')game.completedObjectives.add(objective.id);
  }
  game.boss.active=true;
  game.boss.scanned=true;
  native.damageEnemy(game,mission,game.boss,game.boss.health/game.bossVulnerabilityMultiplier,'melee');
  audit.apexSetup={kind:'DECLARED_PRIOR_OBJECTIVES_AND_NATIVE_APEX_DEFEAT_AT_AUTHORED_LOCATION',before,after:state()};
  return audit.apexSetup;
};
window.__onOserisTrophyDrawV112=(id,image)=>{
  if(image?.complete&&image.naturalWidth>0&&image.naturalHeight>0&&!audit.trophyDraws.has(id)){
    audit.trophyDraws.set(id,{src:image.src,width:image.naturalWidth,height:image.naturalHeight});
  }
};
window.__onOserisReturnV112=result=>audit.results.push(clone(result));
window.__skinningCanopyQaV112=audit;
createRoot(document.getElementById('root')).render(<GameClient/>);
