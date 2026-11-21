const MAX_ROUTE_TICKS=4200;

const center=body=>body.x+body.width/2;
const foot=body=>body.y+body.height;
const controls=(held=[],pressed=[])=>({held,pressed});
const walk=(player,x,tolerance=10)=>Math.abs(x-center(player))<=tolerance?[]:[x>center(player)?"right":"left"];

export function loadedCanopyRouteV112(world,missionId,sequence){
  const base="v112-canopy-"+missionId+"-"+sequence+"-";
  const rests=Array.from({length:6},(_,index)=>world.platforms.find(p=>p.id===base+index+"-rest"));
  const grips=rests.slice(0,3).map((_,index)=>world.climbables.find(p=>p.id===base+index+"-grip"));
  if(rests.some(rest=>!rest)||grips.some(grip=>!grip))return null;
  return {rests,entry:grips[0],firstVine:grips[1],secondVine:grips[2]};
}

export function decideLoadedCanopyRouteV112(game,tick,memory,reachable){
  const {player,world}=game;
  const {rests,entry,firstVine,secondVine}=memory.route;
  const [firstRest,secondRest]=rests;
  const onRest=rest=>player.grounded&&Math.abs(foot(player)-rest.y)<1e-6&&
    player.x+player.width>rest.x&&player.x<rest.x+rest.width;
  const setStage=stage=>{
    memory.stage=stage;
    memory.events.push({stage,tick,x:player.x,y:player.y,supportId:player.climbZoneId});
  };
  if(tick-memory.startedTick>=MAX_ROUTE_TICKS){
    setStage("timeout");
    return controls(player.climbing?["right","jump"]:[],player.climbing?["jump"]:[]);
  }
  switch(memory.stage){
    case "approach":
      if(Math.abs(center(player)-center(entry))>10)return controls(walk(player,center(entry)));
      if(!player.grounded||player.stamina<player.maxStamina*.93)return controls();
      setStage("climb-entry");
      return controls(["up"]);
    case "climb-entry":
      if(player.climbZoneId!==entry.id||foot(player)>firstRest.y-16)return controls(["up"]);
      setStage("land-first-rest");
      return controls(["right"]);
    case "land-first-rest":
      if(!onRest(firstRest))return controls();
      setStage("first-rest-takeoff");
      return controls(["right"]);
    case "first-rest-takeoff":
      if(center(player)<center(firstRest)+36)return controls(["right"]);
      setStage("land-second-rest");
      return controls(["right","jump"],["jump"]);
    case "land-second-rest":
      if(!onRest(secondRest))return controls(center(player)<center(secondRest)-20?["right","jump"]:["jump"]);
      setStage("climb-first-vine");
      return controls();
    case "climb-first-vine":
      if(player.climbZoneId!==firstVine.id||player.y+player.height*.28-firstVine.y>120)return controls(["up"]);
      setStage("attach-first-vine");
      return controls(["right"]);
    case "attach-first-vine":
      if(player.canopySwing?.supportId!==firstVine.id)return controls(["right"]);
      setStage("pump-first-vine");
      return controls(["right"]);
    case "pump-first-vine": {
      const swing=player.canopySwing;
      if(!swing){setStage("lost-first-vine");return controls();}
      if(swing.angle<.15||swing.angle>.8||Math.cos(swing.angle)*swing.length*swing.angularVelocity<300)
        return controls([swing.angularVelocity>=0?"right":"left"]);
      setStage("catch-second-vine");
      return controls(["right","jump"],["jump"]);
    }
    case "catch-second-vine":
      if(player.climbZoneId!==secondVine.id){
        const canCatch=!reachable(firstVine)&&reachable(secondVine)&&player.climbReattachSeconds<=1/60;
        return controls(canCatch?["right","up"]:["right"]);
      }
      setStage("leave-second-vine");
      return controls(["right"]);
    case "leave-second-vine":
      if(player.climbing){setStage("exit-route");return controls(["right","jump"],["jump"]);}
      setStage("exit-route");
      return controls(["right"]);
    case "exit-route":
      if(!player.grounded||Math.abs(foot(player)-world.floorY)>=1e-6)return controls(["right"]);
      setStage("grounded-exit");
      return controls();
    default:
      return null;
  }
}
