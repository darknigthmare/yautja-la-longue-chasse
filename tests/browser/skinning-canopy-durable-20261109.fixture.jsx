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
const mode=new URL(window.location.href).searchParams.get('case')??'field';
const clone=value=>JSON.parse(JSON.stringify(value,(_key,item)=>item instanceof Set?[...item]:item));
const audit={
  mode,
  documentId:crypto.randomUUID(),
  runtime:null,
  mounts:[],
  writes:[],
  setups:[],
  terminalSegment:null,
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
    player:game.player,
    rites:game.huntRites,
    riteToolInitialCondition:game.riteToolInitialConditionV112,
    damageTaken:game.damageTaken,
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
      active:enemy.active,boss:enemy.boss,x:enemy.x,y:enemy.y,health:enemy.health,
    })),
    ship:game.dropShip,
    reachableSupportIds:game.world.climbables.filter(support=>handle.native.canopySupportReachableV112(game.player,support,game.world.platforms)).map(support=>support.id),
    inputs:{keyboard:[...handle.input.keyboardHeld],touch:[...handle.input.touchHeld],gamepad:[...handle.input.gamepadHeld]},
  });
};
window.__onSkinningCanopyMountV112=handle=>{
  audit.runtime=handle;
  const game=handle.game;
  audit.mounts.push({resumed:handle.resumed,elapsed:game.elapsed,originalEnemyCount:game.enemies.length});
  if(mode!=='field'||handle.resumed)return;
  const originalEnemyIds=game.enemies.map(enemy=>enemy.id);
  const prey=handle.native.makeEnemy(
    'qa-durable-field-prey','hell-hound-stalker',handle.mission.id,
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
audit.prepareTerminalSegment=()=>{
  const handle=audit.runtime;
  const game=handle.game;
  const mission=handle.mission;
  if(mode!=='field'||game.phase==='dead'||game.phase==='finished'||!game.huntRites.specimensV112?.length){
    throw Error('A living, harvested field state is required for the declared terminal segment');
  }
  const before=clone({player:game.player,rites:game.huntRites,worldExtraction:game.world.extraction});
  game.riteMenuCorpseId=null;
  game.huntRites={...game.huntRites,operation:null};
  game.riteOperationDamageStart=null;
  game.completedObjectives=new Set(mission.objectives.filter(objective=>objective.kind!=='extract').map(objective=>objective.id));
  game.phase='extraction';
  game.trophyQuality='worthy';
  game.trophyCarried=true;
  game.trophyVictory=null;
  game.trophyClaim={
    id:mission.id+':qa-durable-segment-apex',
    definitionId:mission.trophy.id,
    targetName:mission.targetName,
    targetKind:mission.targetKind,
    partId:mission.trophy.partId,
    condition:'intact',
    quality:'worthy',
  };
  game.boss.active=false;
  game.boss.alive=false;
  game.boss.health=0;
  game.bossDefeatedAt=game.elapsed;
  Object.assign(game.player,{
    x:game.world.extraction.x-game.player.width/2-160,
    y:game.world.floorY-game.player.height,
    previousY:game.world.floorY-game.player.height,
    velocityX:0,
    velocityY:0,
    grounded:true,
    climbing:false,
    climbZoneId:null,
    canopySwing:null,
  });
  game.dropShip=handle.native.createDropShipArrival();
  audit.terminalSegment={
    classification:'PREPARED_TERMINAL_SEGMENT_NOT_CONTINUOUS_MISSION_TRAVERSAL',
    before,
    after:clone({player:game.player,rites:game.huntRites,worldExtraction:game.world.extraction}),
    prepared:['Apex and non-extraction objectives','initial segment position 160 px west of the real extraction'],
    retained:['harvested identities and quality','tool-use receipts','all non-boss enemies and hazards','authored world geometry and extraction position'],
    notClaimed:['Apex combat','main mission traversal','complete campaign','eight-mission ground fallback'],
  };
  return clone(audit.terminalSegment);
};
window.__skinningCanopyQaV112=audit;
createRoot(document.getElementById('root')).render(<GameClient/>);
