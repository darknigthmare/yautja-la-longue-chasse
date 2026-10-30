import type {WarRulesV6} from "./clanWarBibleV6";

/**
 * 12 W3-MAP authoring exercises at their exact BIBLE V6 grid dimensions.
 * Geometry is generated from source dimensions, situation, alternate routes
 * and biome cues, not a 1:1 scan of any film scene or a finished authored level.
 * Nothing in this file edits the persistent V6/V85 campaigns.
 */
export type WarTileKindV128 = "ground"|"wall"|"cover"|"water"|"lava"|"ice"|"bridge"|"ladder"|"door"|"hazard";
export type WarMissionMapActionV128 = "up"|"down"|"left"|"right"|"wait"|"cloak"|"observe"|"interact"|"attack"|"power"|"stabilize"|"retreat";
export type WarMissionMapOutcomeV128 = "victory"|"defeat"|"retreat";
export interface WarMapPointV128 {x:number;y:number;}
export interface WarMapTileV128 {
 x:number;y:number;kind:WarTileKindV128;elevation:number;
 opaque:boolean;solid:boolean;cover:boolean;
 environment:string;source:"game-authored-layout-study";
}
export interface WarSourceMapV128 {
 id:string;name:string;planetId:string;planetName:string;worldCode:string;
 worldStratum:"planet-surface"|"subsurface"|"orbital-vessel";
 accessGate:string;width:number;height:number;biome:string;
 sourceRow:number;sourceCells:string[];sourceSituation:string;sourceGeometry:string;
 sourceCover:string;sourceEvent:string;sourceObjective:string;sourceAccess:string;
 sourceExtraction:string;tileScale:"one-tactical-cell-not-geographic-metre";
 interpretation:"source-guided-tile-study-not-final-authored-or-film-map";
 start:WarMapPointV128;goal:WarMapPointV128;extraction:WarMapPointV128;
 mandatoryPaths:WarMapPointV128[][];hazards:WarMapPointV128[];
 observation:WarMapPointV128;poweredDoors:WarMapPointV128[];
 eventClass:string;
 generatorSeed:number;tiles:WarMapTileV128[];unitRoles:string[];
}
export interface WarMapActorV128 extends WarMapPointV128 {
 id:string;unitId:string;hp:number;status:"active"|"down";
 acknowledged:boolean;lastSeenTurn:number;
}
export interface WarMapPlayerV128 extends WarMapPointV128 {
 hp:number;cloaked:boolean;energy:number;observed:boolean;
}
export interface WarMapReportV128 {
 id:string;mapId:string;scenarioId:string;sourceCells:string[];
 outcome:WarMissionMapOutcomeV128;turn:number;playerHp:number;
 opposingUnitIds:string[];notes:string;campaignMutation:false;
}
export interface WarMapPracticeV128 {
 version:128;map:WarSourceMapV128;player:WarMapPlayerV128;
 enemies:WarMapActorV128[];turn:number;alarm:number;
 power:boolean;airlockStable:boolean;objectiveDone:boolean;lastMessage:string;
 report:WarMapReportV128|null;log:string[];scenarioId:string;
}
export interface WarMapUpdateV128 {accepted:boolean;state:WarMapPracticeV128;message:string;}
const point=(x:number,y:number)=>({x,y});
const key=(p:WarMapPointV128)=>p.x+","+p.y;
const dist=(a:WarMapPointV128,b:WarMapPointV128)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const moves=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
const safe=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n));
function hash(s:string):number {
 let h=2166136261;
 for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
 return h>>>0;
}
const settings={
 "W3-MAP01":{biome:"pierre de corniche",fluid:"none",unit:"W3-U12"},
 "W3-MAP02":{biome:"bassins et conduites",fluid:"water",unit:"W3-U20"},
 "W3-MAP03":{biome:"cratères volcaniques",fluid:"lava",unit:"W3-U14"},
 "W3-MAP04":{biome:"relais sous cendres",fluid:"none",unit:"W3-U13"},
 "W3-MAP05":{biome:"canopée et racines",fluid:"water",unit:"W3-U05"},
 "W3-MAP06":{biome:"gué forestier",fluid:"water",unit:"W3-U03"},
 "W3-MAP07":{biome:"littoral et quai",fluid:"water",unit:"W3-U25"},
 "W3-MAP08":{biome:"île littorale et signal",fluid:"water",unit:"W3-U25"},
 "W3-MAP09":{biome:"glacier et crevasses",fluid:"ice",unit:"W3-U24"},
 "W3-MAP10":{biome:"galeries thermiques",fluid:"none",unit:"W3-U20"},
 "W3-MAP11":{biome:"port et portes verticales",fluid:"none",unit:"W3-U12"},
 "W3-MAP12":{biome:"coque de vaisseau",fluid:"none",unit:"W3-U26"},
} as const;
type MapIdV128=keyof typeof settings;
function isMapIdV128(id:string):id is MapIdV128 {
 return Object.prototype.hasOwnProperty.call(settings,id);
}
function sourceEntry(rules:WarRulesV6,id:string){
 return rules.entries.find(e=>e.sheet==="Cartes des escarmouches"&&e.id===id);
}
function sourceValue(entry:NonNullable<ReturnType<typeof sourceEntry>>,col:string):string{
 return String(entry.fields.find(f=>f.column===col)?.value??"").trim();
}
function sourceCells(entry:NonNullable<ReturnType<typeof sourceEntry>>):string[]{
 return ["C","D","E","F","G","H","I","J","K","L","M"]
   .map(col=>entry.fields.find(f=>f.column===col)?.cell).filter((v):v is string=>!!v);
}
function coordinates(id:MapIdV128,w:number,h:number){
 const side=id==="W3-MAP02"||id==="W3-MAP05"||id==="W3-MAP07"||id==="W3-MAP09";
 const start=side?point(3,h-4):point(3,Math.floor(h*.72));
 const goal=side?point(w-4,3):point(w-4,Math.floor(h*.28));
 return {start,goal};
}
function chain(steps:WarMapPointV128[],reverseFirst=false):WarMapPointV128[]{
 const all:WarMapPointV128[]=[];
 let pos=steps[0];
 const append=(p:WarMapPointV128)=>{if(!all.length||key(all[all.length-1])!==key(p))all.push(p);};
 append(pos);
 for(const next of steps.slice(1)){
  let x=pos.x,y=pos.y;
  const walkX=()=>{while(x!==next.x){x+=Math.sign(next.x-x);append(point(x,y));}};
  const walkY=()=>{while(y!==next.y){y+=Math.sign(next.y-y);append(point(x,y));}};
  if(reverseFirst){walkY();walkX();}else{walkX();walkY();}
  pos=next;
 }
 return all;
}
const EVENT_TYPES:Record<MapIdV128,string>={
 "W3-MAP01":"chute-de-pierres","W3-MAP02":"jet-de-vapeur",
 "W3-MAP03":"vent-de-cendres","W3-MAP04":"effondrement-annonce",
 "W3-MAP05":"proie-au-bruit","W3-MAP06":"courant-du-gue",
 "W3-MAP07":"maree-haute","W3-MAP08":"rafales-sur-le-phare",
 "W3-MAP09":"fissure-de-glace","W3-MAP10":"jets-thermiques",
 "W3-MAP11":"elevateur-de-charge","W3-MAP12":"pression-du-sas",
};
const POWERED_MAPS:ReadonlySet<MapIdV128>=new Set(["W3-MAP02","W3-MAP10","W3-MAP11","W3-MAP12"]);
const noTrap=(routes:WarMapPointV128[][],pos:WarMapPointV128)=>
 routes.every(route=>!route.some(p=>key(p)===key(pos)));
export function createWarSourceMapV128(id:string,rules:WarRulesV6):WarSourceMapV128 {
 if(!isMapIdV128(id))throw new RangeError("Carte W3-MAP01..12 inconnue.");
 const entry=sourceEntry(rules,id);
 if(!entry)throw new Error("Cette carte n'existe pas dans la Bible V6 sélectionnée.");
 const planetId=sourceValue(entry,"C");
 const planet=rules.entries.find(e=>e.sheet==="Mondes en guerre"&&e.id===planetId);
 if(!planet)throw new Error("Planète parent absente : ne pas inventer une position pour une carte W3.");
 const width=Number(sourceValue(entry,"D")),height=Number(sourceValue(entry,"E"));
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<20||width>48||height<20||height>40)
  throw new Error("Dimensions source hors limites : ne pas fabriquer un décor.");
 const {start,goal}=coordinates(id,width,height);
 const center=Math.floor(height/2);
 const one=chain([start,point(Math.floor(width*.24),4),point(Math.floor(width*.72),4),goal]);
 const two=chain([start,point(Math.floor(width*.24),height-5),point(Math.floor(width*.72),height-5),goal],true);
 const three=chain([start,point(Math.floor(width*.35),center),point(Math.floor(width*.65),center),goal]);
 const mandatoryPaths=[one,two,three];
 const observation=one[Math.floor(one.length*.78)];
 // Doors are objects on an optional route: power loss cannot strand the team.
 const poweredDoor=POWERED_MAPS.has(id)?
  one.find(p=>p.x>=Math.floor(width*.46)&&p.x<=Math.floor(width*.56)&&p.y===4&&
    noTrap([two,three],p)):undefined;
 const poweredDoors=poweredDoor?[poweredDoor]:[];
 const open=new Set(mandatoryPaths.flatMap(route=>route.map(key)));
 const protectedCells=new Set([...open,...moves.flatMap(step=>[
  key(point(start.x+step.x,start.y+step.y)),
  key(point(goal.x+step.x,goal.y+step.y))
 ])]);
 const seed=hash(id+"-"+width+"-"+height);
 const environment=settings[id];
 const tiles:WarMapTileV128[]=[];
 const hazards:WarMapPointV128[]=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const pos=point(x,y),cell=key(pos);
  const nearEdge=x===0||y===0||x===width-1||y===height-1;
  const protectedWalk=protectedCells.has(cell);
  const noise=hash(id+"-"+x+"-"+y)%100;
  const fluid=settings[id].fluid;
  let kind:WarTileKindV128=nearEdge?"wall":
    protectedWalk?"ground":noise<22?"wall":
    noise<30&&fluid!=="none"?fluid==="ice"?"ice":fluid:"ground";
  if(kind==="ground"&&!nearEdge&&noise>=30&&noise<42&&!protectedWalk)kind="cover";
  if(kind==="ground"&&protectedWalk&&noise>=42&&noise<48)kind="bridge";
  if(kind==="ground"&&protectedWalk&&noise>=50&&noise<54)kind="ladder";
  // Field events must be visible, local and never seal the unique extraction.
  if(!nearEdge&&x>Math.floor(width*.4)&&x<Math.floor(width*.58)&&
     y>=Math.floor(height*.43)&&y<=Math.floor(height*.56)&&
     !noTrap(mandatoryPaths,pos)&&noise%7===0&&hazards.length<3){
   kind="hazard";hazards.push(pos);
  }
  if(poweredDoor&&cell===key(poweredDoor))kind="door";
  if(cell===key(start)||cell===key(goal))kind="ground";
  const solid=kind==="wall"||kind==="lava"||kind==="water";
  tiles.push({
   x,y,kind,elevation:safe(Math.floor((height-y)/Math.max(5,height/3)),0,2),
   opaque:kind==="wall",solid,
   cover:kind==="cover",environment:environment.biome,
   source:"game-authored-layout-study",
  });
 }
 return {
  id,name:String(entry.title),planetId,planetName:String(planet.title),
  worldCode:sourceValue(planet,"C"),
  worldStratum:id==="W3-MAP12"?"orbital-vessel":
    id==="W3-MAP10"?"subsurface":"planet-surface",
  accessGate:sourceValue(planet,"K"),
  width,height,biome:environment.biome,
  sourceRow:entry.row,sourceCells:sourceCells(entry),
  sourceSituation:sourceValue(entry,"F"),sourceGeometry:sourceValue(entry,"G"),
  sourceCover:sourceValue(entry,"H"),sourceEvent:sourceValue(entry,"I"),
  sourceObjective:sourceValue(entry,"J"),sourceAccess:sourceValue(entry,"K"),
  sourceExtraction:sourceValue(entry,"L"),
  tileScale:"one-tactical-cell-not-geographic-metre",
  interpretation:"source-guided-tile-study-not-final-authored-or-film-map",
  start,goal,extraction:start,mandatoryPaths,hazards,observation,poweredDoors,eventClass:EVENT_TYPES[id],
  generatorSeed:seed,tiles,unitRoles:["W3-U01",environment.unit,"W3-U07"],
 };
}
export function warMapTileV128(map:WarSourceMapV128,x:number,y:number):WarMapTileV128|null{
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=map.width||y<0||y>=map.height)return null;
 return map.tiles[y*map.width+x]??null;
}
export function warMapWalkableV128(map:WarSourceMapV128,p:WarMapPointV128){
 const tile=warMapTileV128(map,p.x,p.y);
 return Boolean(tile&&!tile.solid);
}
/** Public 4-way BFS, never treats a wall as a legal path or teleport. */
export function warMapFindPathV128(
 map:WarSourceMapV128,from:WarMapPointV128,to:WarMapPointV128,
 occupied:readonly WarMapPointV128[]=[],
):WarMapPointV128[]|null {
 if(!warMapWalkableV128(map,from)||!warMapWalkableV128(map,to))return null;
 const occupiedIds=new Set(occupied.map(key));occupiedIds.delete(key(from));occupiedIds.delete(key(to));
 const queue=[from],parents=new Map<string,string|null>([[key(from),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(key(p)===key(to))break;
  for(const m of moves){
   const next=point(p.x+m.x,p.y+m.y),id=key(next);
   if(parents.has(id)||occupiedIds.has(id)||!warMapWalkableV128(map,next))continue;
   parents.set(id,key(p));queue.push(next);
  }
 }
 if(!parents.has(key(to)))return null;
 const path:WarMapPointV128[]=[];let current:string|null=key(to);
 while(current){const [x,y]=current.split(",").map(Number);path.push(point(x,y));current=parents.get(current)??null;}
 return path.reverse();
}
export function warMapLineOfSightV128(
 map:WarSourceMapV128,a:WarMapPointV128,b:WarMapPointV128,
):boolean{
 if(!warMapWalkableV128(map,a)||!warMapWalkableV128(map,b))return false;
 let x=a.x,y=a.y;
 const dx=Math.abs(b.x-x),dy=Math.abs(b.y-y);
 const sx=x<b.x?1:-1,sy=y<b.y?1:-1;
 let error=dx-dy;
 while(x!==b.x||y!==b.y){
  const twice=2*error;
  if(twice>-dy){error-=dy;x+=sx;}
  if(twice<dx){error+=dx;y+=sy;}
  if(x===b.x&&y===b.y)break;
  if(warMapTileV128(map,x,y)?.opaque)return false;
 }
 return true;
}
function sourceForEnemy(map:WarSourceMapV128,id:number):string{
 return map.unitRoles[id%map.unitRoles.length];
}
function spawnEnemy(map:WarSourceMapV128,id:number){
 const route=map.mandatoryPaths[id%2===0?0:1];
 // A real defined roster is attached at the start: no free wave on each turn.
 const preferred=route[Math.max(0,route.length-5-id*2)];
 const candidate=warMapWalkableV128(map,preferred)?preferred:map.goal;
 return {
  id:map.id+"-GUARD-"+(id+1),unitId:sourceForEnemy(map,id),
  x:candidate.x,y:candidate.y,hp:id===0?7:5,
  status:"active" as const,acknowledged:false,lastSeenTurn:-1,
 };
}
export function createWarMapPracticeV128(id:string,rules:WarRulesV6):WarMapPracticeV128{
 const map=createWarSourceMapV128(id,rules);
 const enemies=[spawnEnemy(map,0),spawnEnemy(map,1)];
 return {
  version:128,map,scenarioId:"W128-EXERCISE-"+id,
  player:{...map.start,hp:24,cloaked:false,energy:7,observed:false},
  enemies,turn:0,alarm:0,power:true,airlockStable:id!=="W3-MAP12",objectiveDone:false,
  report:null,log:["Reconnaissance d'exercice : "+map.name],lastMessage:"Atteignez le dispositif puis revenez physiquement à l'extraction.",
 };
}
const fail=(state:WarMapPracticeV128,message:string):WarMapUpdateV128=>({accepted:false,state,message});
const ok=(state:WarMapPracticeV128,message:string):WarMapUpdateV128=>({accepted:true,state,message});
function report(state:WarMapPracticeV128,outcome:WarMissionMapOutcomeV128,notes:string):WarMapPracticeV128{
 if(state.report)return state;
 return {...state,report:{
  id:state.scenarioId+"-"+state.turn,scenarioId:state.scenarioId,mapId:state.map.id,
  sourceCells:[...state.map.sourceCells],outcome,turn:state.turn,playerHp:state.player.hp,
  opposingUnitIds:state.enemies.map(x=>x.unitId),notes,campaignMutation:false,
 }};
}
function hazardActive(state:WarMapPracticeV128):boolean {
 return (state.turn%8)>=3&&(state.turn%8)<=4;
}
function handleOpposition(state:WarMapPracticeV128):WarMapPracticeV128{
 const player={...state.player};let alarm=state.alarm;
 const rivals=state.enemies.map(e=>({...e}));
 let message=state.lastMessage;
 const occupied=()=>rivals.filter(e=>e.hp>0).map(e=>point(e.x,e.y));
 for(const enemy of rivals){
  if(enemy.hp<=0)continue;
  const sight=state.map.eventClass==="vent-de-cendres"&&hazardActive(state)?3:7;
  const see=dist(enemy,player)<=sight&&warMapLineOfSightV128(state.map,enemy,player)&&!player.cloaked;
  if(see){alarm=Math.min(5,alarm+1);enemy.acknowledged=true;enemy.lastSeenTurn=state.turn;}
  if(see&&dist(enemy,player)<=2){
   const cover=warMapTileV128(state.map,player.x,player.y)?.cover;
   player.hp=Math.max(0,player.hp-(cover?1:2));
   message="Tir adverse détecté : "+enemy.unitId+(cover?" (couvert actif)":"");
  }else if(see){
   const path=warMapFindPathV128(state.map,enemy,player,
    occupied().filter(p=>key(p)!==key(enemy)));
   const next=path?.[1];
   if(next&&!rivals.some(other=>other.id!==enemy.id&&other.hp>0&&key(other)===key(next))){
    enemy.x=next.x;enemy.y=next.y;
   }
  }
 }
 const next={...state,player,enemies:rivals,alarm,lastMessage:message};
 return player.hp<=0?report(next,"defeat","Équipe d'exercice neutralisée, aucun gain de territoire."):next;
}
export function commandWarMapPracticeV128(
 state:WarMapPracticeV128,action:WarMissionMapActionV128,
):WarMapUpdateV128{
 if(state.report)return fail(state,"La mission a déjà un résultat unique.");
 if(!["up","down","left","right","wait","cloak","observe","interact","attack","power","stabilize","retreat"].includes(action))
  return fail(state,"Commande non reconnue.");
 const player={...state.player};
 const enemies=state.enemies.map(e=>({...e}));let objectiveDone=state.objectiveDone,power=state.power,
  airlockStable=state.airlockStable;
 let message="";
 const delta=action==="up"?point(0,-1):action==="down"?point(0,1):
  action==="left"?point(-1,0):action==="right"?point(1,0):null;
 if(delta){
  const destination=point(player.x+delta.x,player.y+delta.y);
  if(!warMapWalkableV128(state.map,destination))return fail(state,"Mur, eau profonde ou lave : passage physiquement impossible.");
  if(!state.power&&state.map.poweredDoors.some(door=>key(door)===key(destination)))
   return fail(state,"Porte motorisée fermée : aucune traversée pendant la panne. Empruntez une route non motorisée.");
  if(enemies.some(e=>e.hp>0&&key(e)===key(destination)))return fail(state,"Position occupée par un adversaire actif.");
  player.x=destination.x;player.y=destination.y;
  message="Progression d'une case vers "+key(destination)+".";
 }else if(action==="cloak"){
  if(!player.cloaked&&player.energy<=0)return fail(state,"Batterie de camouflage épuisée.");
  player.cloaked=!player.cloaked;
  message=player.cloaked?"Camouflage engagé.":"Camouflage coupé.";
 }else if(action==="observe"){
  if(dist(player,state.map.observation)>2&&
    !(dist(player,state.map.goal)<=6&&warMapLineOfSightV128(state.map,player,state.map.goal)))
   return fail(state,"Point de reconnaissance trop éloigné : impossible d'observer toute la carte depuis le départ.");
  player.observed=true;
  message="Plan des accès relevé, sans découverte des ennemis au-delà de la vision.";
 }else if(action==="interact"){
  if(dist(player,state.map.goal)>1)return fail(state,"Dispositif trop éloigné. Rejoignez la zone d'objectif.");
  if(!player.observed)return fail(state,"Reconnaissance préalable obligatoire pour identifier le bon dispositif.");
  if(state.map.id==="W3-MAP12"&&!airlockStable)
   return fail(state,"Sas sous pression non stabilisée : impossible de franchir ou valider l'interface.");
  objectiveDone=true;
  message="Dispositif W3 confirmé : preuve conservée jusqu'à une vraie extraction.";
 }else if(action==="attack"){
  const ranged=state.map.eventClass==="rafales-sur-le-phare"&&hazardActive(state)?1:3;
  const visible=enemies.filter(e=>e.hp>0&&dist(e,player)<=ranged&&warMapLineOfSightV128(state.map,player,e))
   .sort((a,b)=>dist(a,player)-dist(b,player)||a.id.localeCompare(b.id));
  if(!visible.length)return fail(state,"Aucune cible ennemie visible dans la portée de l'arme d'exercice.");
  const target=visible[0],cover=warMapTileV128(state.map,target.x,target.y)?.cover;
  target.hp=Math.max(0,target.hp-(cover?2:4));
  if(!target.hp)target.status="down";
  message="Tir source W3 sur "+target.unitId+" ; "+(cover?"dégâts limités par couvert.":"position engagée.");
  player.cloaked=false;
 }else if(action==="stabilize"){
  if(state.map.id!=="W3-MAP12")return fail(state,"Cette carte ne possède pas de sas sous pression.");
  if(!power)return fail(state,"Alimentation du sas indisponible : stabilisation impossible.");
  if(dist(player,state.map.goal)>3)return fail(state,"Valve de pression hors de portée.");
  airlockStable=true;
  message="Sas W3-MAP12 stabilisé. La pression est désormais compatible avec l'interaction.";
 }else if(action==="power"){
  if(dist(player,state.map.goal)>3)return fail(state,"Les commandes d'alimentation sont à proximité du dispositif, pas téléportées.");
  power=!power;
  message=power?"Alimentation du site rétablie.":"Réseau du site coupé ; systèmes dépendants hors service.";
 }else if(action==="retreat"){
  if(dist(player,state.map.extraction)>1)return fail(state,"Repli refusé : rejoignez la vraie sortie.");
  const next=report({...state,player,enemies}, "retreat","Retraite enregistrée, sans preuve d'objectif ni conquête.");
  return ok(next,"Repli réalisé depuis le point d'extraction.");
 }else message="Tour d'observation, sans déplacement.";
 const turn=state.turn+1;
 if(player.cloaked)player.energy=Math.max(0,player.energy-1);
 if(player.cloaked&&player.energy===0)player.cloaked=false;
 const announced=turn%8===2&&state.map.hazards.length>0?
   " Attention : "+state.map.sourceEvent:"";
 if(state.map.eventClass==="proie-au-bruit"&&turn%5===0&&!player.cloaked){
  message+=" Bruit excessif sous la canopée : vigilance des patrouilles.";
 }
 const stepped={...state,player,enemies,objectiveDone,power,airlockStable,turn,
  lastMessage:message+announced,log:[...state.log,message+announced].slice(-50)};
 if(stepped.map.hazards.some(h=>key(h)===key(player))&&hazardActive(stepped))
  stepped.player.hp=Math.max(0,stepped.player.hp-2);
 let next=stepped.player.hp>0?handleOpposition(stepped):
   report(stepped,"defeat","Danger physique du terrain, aucune téléportation autorisée.");
 if(!next.report&&objectiveDone&&key(next.player)===key(next.map.extraction))
  next=report(next,"victory","Dispositif vérifié et retour physique à l'extraction. Aucun effet sur la sauvegarde de campagne.");
 return ok(next,next.report?"Mission terminée : "+next.report.outcome+".":next.lastMessage);
}
export function auditWarSourceMapsV128(rules:WarRulesV6){
 const ids=Object.keys(settings),problems:string[]=[];
 for(const id of ids){
  let map:WarSourceMapV128;
  try{map=createWarSourceMapV128(id,rules);}catch(e){problems.push(id+" "+String(e));continue;}
  if(map.tiles.length!==map.width*map.height)problems.push(id+" bad grid area");
  if(map.mandatoryPaths.length!==3)problems.push(id+" missing alternatives");
  if(map.mandatoryPaths.some(path=>path.some(p=>!warMapWalkableV128(map,p))))
   problems.push(id+" claimed route across obstacle");
  if(!warMapFindPathV128(map,map.start,map.goal))problems.push(id+" no objective route");
  if(!warMapFindPathV128(map,map.goal,map.extraction))problems.push(id+" no return");
  if(!map.sourceCells.length)problems.push(id+" lost source provenance");
  if(!map.planetName||!map.worldCode||!map.accessGate)problems.push(id+" world provenance missing");
  if(id==="W3-MAP12"&&map.worldStratum!=="orbital-vessel")problems.push("Ship hull erroneously on ground");
  if(id==="W3-MAP10"&&map.worldStratum!=="subsurface")problems.push("Heated ice-world gallery erroneously in exposed atmosphere");
  if(map.tiles.filter(x=>x.kind==="wall").length<map.width)problems.push(id+" lacks terrain architecture");
 }
 return {maps:ids.length,sourceCells:ids.length*11,problems};
}
