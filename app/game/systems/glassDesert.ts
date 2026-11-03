/** Original local investigation adapted from the Homeworld brief; no canon fauna claim. */
export const GLASS_DESERT={width:3600,height:1120,floor:900,tickRate:60,speed:290,carefulSpeed:100,jumpSpeed:610,gravity:1400} as const;
export type GlassCrossingRoute="stepping-stones"|"decoy-corridor";
export type GlassBeaconDisposition="preserve"|"disable";
export interface GlassDesertProof {
  expeditionId:"glass-desert";terrainSurveyed:true;transportLogRecovered:true;diversionCorroborated:true;safePassageOpened:true;
  crossingRoute:GlassCrossingRoute;beaconDisposition:GlassBeaconDisposition;secretFound:boolean;ticks:number;
}
export function normalizeGlassDesertProof(value:unknown):GlassDesertProof|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const p=value as Record<string,unknown>;
  if(p.expeditionId!=="glass-desert"||p.terrainSurveyed!==true||p.transportLogRecovered!==true||p.diversionCorroborated!==true||p.safePassageOpened!==true||
    !["stepping-stones","decoy-corridor"].includes(p.crossingRoute as string)||!["preserve","disable"].includes(p.beaconDisposition as string)||
    typeof p.secretFound!=="boolean"||typeof p.ticks!=="number"||!Number.isSafeInteger(p.ticks)||p.ticks<1||p.ticks>5_184_000)return null;
  return {expeditionId:"glass-desert",terrainSurveyed:true,transportLogRecovered:true,diversionCorroborated:true,safePassageOpened:true,
    crossingRoute:p.crossingRoute as GlassCrossingRoute,beaconDisposition:p.beaconDisposition as GlassBeaconDisposition,secretFound:p.secretFound,ticks:p.ticks};
}
export interface GlassPlatform {id:string;x:number;y:number;width:number;height:number;surface:"rock"|"glass"|"bridge"}
export const GLASS_PLATFORMS:readonly GlassPlatform[]=[
 {id:"arrival",x:0,y:900,width:440,height:150,surface:"rock"},
 {id:"first-pan",x:440,y:900,width:640,height:150,surface:"glass"},
 {id:"refuge",x:1080,y:900,width:300,height:150,surface:"rock"},
 {id:"resonant-pan",x:1380,y:900,width:750,height:150,surface:"glass"},
 {id:"station",x:2130,y:900,width:400,height:150,surface:"rock"},
 {id:"beacon-pan",x:2530,y:900,width:170,height:150,surface:"glass"},
 {id:"bridge-control",x:2700,y:900,width:240,height:150,surface:"rock"},
 {id:"shuttle",x:3240,y:900,width:360,height:150,surface:"rock"},
 {id:"intro-step",x:520,y:790,width:170,height:34,surface:"rock"},
 {id:"intro-arch",x:740,y:710,width:180,height:34,surface:"rock"},
 {id:"spine-step",x:1420,y:790,width:170,height:34,surface:"rock"},
 {id:"spine-high",x:1630,y:680,width:180,height:34,surface:"rock"},
 {id:"spine-return",x:1850,y:755,width:180,height:34,surface:"rock"},
 {id:"secret-step",x:2400,y:790,width:140,height:34,surface:"rock"},
 {id:"secret-ledge",x:2570,y:680,width:160,height:34,surface:"rock"},
];
export const GLASS_POINTS=[
 {id:"survey",x:320,y:900,label:"Lecture du terrain",hint:"Scanner les stries : les plaques vitrifiées transmettent les vibrations, les roches stables les amortissent."},
 {id:"relay",x:1200,y:900,label:"Relais des expéditions",hint:"Repos et recharge des leurres. Choisir une traversée après la lecture du terrain."},
 {id:"cairn",x:1740,y:680,label:"Cairn des corniches",hint:"Un passage supérieur stable. Le relever valide la traversée par les rochers."},
 {id:"log",x:2310,y:900,label:"Site de transit abandonné",hint:"Scanner le journal et comparer les cages vides avec les trajets déclarés."},
 {id:"secret",x:2640,y:680,label:"Composant de traçabilité",hint:"Une ancienne pièce rare porte le même raccord que les balises récentes. Relevé documentaire, sans récompense d’inventaire inventée."},
 {id:"beacon",x:2760,y:900,label:"Balise de rabattage",hint:"Comparer sa fréquence au journal : le dispositif attire des proies vers une route non déclarée."},
 {id:"bridge",x:2890,y:900,label:"Passage du relais",hint:"Ouvrir le pont de service après avoir sécurisé et documenté la traversée."},
 {id:"extraction",x:3450,y:900,label:"Navette de la cité",hint:"Remettre les preuves de détournement ; aucun instigateur n’est encore identifié."},
] as const;
export type GlassPointId=(typeof GLASS_POINTS)[number]["id"];
export interface GlassActor {x:number;y:number;vx:number;vy:number;grounded:boolean;facing:-1|1;health:number;invulnerableTicks:number}
export interface GlassBurrower {x:number;targetX:number;phase:"listening"|"warning"|"breach"|"settle";ticks:number;target:"hunter"|"decoy"|"beacon"}
export interface GlassDesertState {
 tick:number;actor:GlassActor;burrower:GlassBurrower;checkpoint:{x:number;y:number};scanTicks:number;vibration:number;
 decoy:{x:number;ticks:number}|null;decoys:number;decoyCooldown:number;successfulDecoys:number;hits:number;falls:number;
 terrainSurveyed:boolean;transportLogRecovered:boolean;diversionCorroborated:boolean;safePassageOpened:boolean;secretFound:boolean;
 crossingRoute:GlassCrossingRoute|null;crossingResolved:boolean;beaconDisposition:GlassBeaconDisposition|null;message:string;
}
export interface GlassInput {moveX?:number;careful?:boolean;jumpPressed?:boolean;scanPressed?:boolean;decoyPressed?:boolean;interactPressed?:boolean}
export function createGlassDesertExpedition(previous:GlassDesertProof|null=null):GlassDesertState{
 const preserved=normalizeGlassDesertProof(previous);
 return {tick:0,actor:{x:110,y:900,vx:0,vy:0,grounded:true,facing:1,health:3,invulnerableTicks:0},burrower:{x:1730,targetX:1730,phase:"listening",ticks:0,target:"hunter"},
 checkpoint:{x:110,y:900},scanTicks:0,vibration:0,decoy:null,decoys:3,decoyCooldown:0,successfulDecoys:0,hits:0,falls:0,
 terrainSurveyed:false,transportLogRecovered:false,diversionCorroborated:false,safePassageOpened:false,secretFound:false,
 crossingRoute:preserved?.crossingRoute??null,crossingResolved:false,beaconDisposition:preserved?.beaconDisposition??null,
 message:"Le désert transmet les pas. Relevez le terrain au scanner avant de gagner le relais."};
}
export function glassPlatforms(state:Pick<GlassDesertState,"safePassageOpened">):readonly GlassPlatform[]{
 return state.safePassageOpened?[...GLASS_PLATFORMS,{id:"safe-return",x:2940,y:900,width:300,height:45,surface:"bridge"}]:GLASS_PLATFORMS;
}
export function glassSurfaceAt(state:GlassDesertState):GlassPlatform["surface"]|null{
 if(!state.actor.grounded)return null;
 return glassPlatforms(state).find(p=>state.actor.x>=p.x&&state.actor.x<=p.x+p.width&&Math.abs(state.actor.y-p.y)<1)?.surface??null;
}
export function nearestGlassPoint(state:GlassDesertState){
 let nearest:(typeof GLASS_POINTS)[number]|null=null;let distance=82;
 for(const point of GLASS_POINTS){const d=Math.hypot(point.x-state.actor.x,(point.y-state.actor.y)*1.4);if(d<distance){nearest=point;distance=d;}}
 return nearest;
}
export function chooseGlassRoute(state:GlassDesertState,choice:GlassCrossingRoute):GlassDesertState{
 if(nearestGlassPoint(state)?.id!=="relay"||!state.terrainSurveyed||!["stepping-stones","decoy-corridor"].includes(choice))return {...state,message:"Le relais demande d’abord une lecture du terrain."};
 if(state.crossingRoute)return {...state,message:"La traversée choisie reste inscrite à cette enquête. Une revisite ne réécrit pas le choix du rapport."};
 return {...state,crossingRoute:choice,message:choice==="stepping-stones"?"Traversée par les corniches : relevez le cairn supérieur. Les sauts doivent retomber sur la roche.":"Traversée par diversion : lancez un leurre devant vous et attendez que le fouisseur frappe cette source avant de traverser."};
}
export function chooseGlassBeacon(state:GlassDesertState,choice:GlassBeaconDisposition):GlassDesertState{
 if(nearestGlassPoint(state)?.id!=="beacon"||!state.diversionCorroborated||!["preserve","disable"].includes(choice))return {...state,message:"Comparez le signal au journal avant de décider."};
 if(state.beaconDisposition)return {...state,message:"Le sort de la balise est déjà fixé dans cette enquête."};
 return {...state,beaconDisposition:choice,message:choice==="preserve"?"Canal conservé : la cité pourra remonter son signal, mais les impulsions attirent encore le fouisseur.":"Balise coupée : plus d’impulsion de rabattage ici. Le journal et la fréquence sont relevés, mais le canal vivant est perdu."};
}
export function glassDesertCompletion(state:GlassDesertState):GlassDesertProof|null{
 if(!state.terrainSurveyed||!state.transportLogRecovered||!state.diversionCorroborated||!state.safePassageOpened||!state.crossingResolved||!state.crossingRoute||!state.beaconDisposition||state.tick<1)return null;
 return normalizeGlassDesertProof({expeditionId:"glass-desert",terrainSurveyed:true,transportLogRecovered:true,diversionCorroborated:true,safePassageOpened:true,
 crossingRoute:state.crossingRoute,beaconDisposition:state.beaconDisposition,secretFound:state.secretFound,ticks:state.tick});
}
export function interactGlassPoint(current:GlassDesertState):GlassDesertState{
 const point=nearestGlassPoint(current);
 if(!point)return {...current,message:"Approchez un indice ou un relais pour interagir."};
 const next={...current};
 if(["survey","log","beacon"].includes(point.id)&&!current.scanTicks)return {...current,message:"Activez le scanner puis relevez cet indice."};
 switch(point.id){
  case "survey":next.terrainSurveyed=true;next.message="Les veines brillantes transmettent les impacts. Les dalles rocheuses et les pas mesurés réduisent les vibrations ; courir ou atterrir sur le verre les amplifie.";break;
  case "relay":next.checkpoint={x:1200,y:900};next.actor={...current.actor,health:3};next.decoys=3;next.message=current.terrainSurveyed?"Relais sûr : santé et trois leurres restaurés. Choisissez corniches stables ou corridor avec diversion.":"Relais sûr. Revenez au relevé de terrain près de l’arrivée avant de choisir la traversée.";break;
  case "cairn":
   if(current.crossingRoute!=="stepping-stones")return {...current,message:"Ce cairn révèle le passage des rochers ; votre rapport suit la route choisie au relais."};
   next.crossingResolved=true;next.message="Corniche reconnue : la succession de roches stables contourne le bassin résonnant.";break;
  case "log":
   if(!current.terrainSurveyed||!current.crossingRoute||!current.crossingResolved)return {...current,message:"Le journal ne remplace pas la traversée : relevez le terrain et accomplissez la route choisie au relais."};
   next.transportLogRecovered=true;next.checkpoint={x:2290,y:900};next.actor={...current.actor,health:3};next.decoys=3;
   next.message="Journal relevé : cages vides, poids déclaré incohérent et composants de traçabilité remplacés. Une fréquence de rabattage mène au relais oriental ; ce constat n’identifie pas encore un coupable.";break;
  case "secret":next.secretFound=true;next.message="Pièce rare documentée : un raccord d’ancienne expédition a été réutilisé pour les balises récentes. Aucun objet de l’inventaire n’est créé par ce relevé.";break;
  case "beacon":
   if(!current.transportLogRecovered)return {...current,message:"Il faut le journal du site abandonné pour interpréter cette fréquence."};
   next.diversionCorroborated=true;next.message="La fréquence correspond au journal. Les proies sont rabattues vers un transfert non déclaré : conservez le canal pour l’enquête ou coupez-le pour cesser l’attraction locale.";break;
  case "bridge":
   if(!current.diversionCorroborated||!current.beaconDisposition||!current.crossingResolved)return {...current,message:"Le pont de service exige le relevé des transferts, une traversée sûre et une décision sur la balise."};
   next.safePassageOpened=true;next.message="Pont de service abaissé. La navette est accessible sans traverser la faille vitrifiée.";break;
  case "extraction":next.message=glassDesertCompletion(current)?"Rapport complet : retour seulement après confirmation d’enregistrement.":"Le rapport reste incomplet. Le terrain, la traversée, le journal, la balise et le pont doivent être relevés.";break;
 }
 return next;
}
function returnToRelay(state:GlassDesertState){
 state.actor={...state.actor,...state.checkpoint,vx:0,vy:0,grounded:true,health:3,invulnerableTicks:100};
 state.falls++;state.vibration=0;state.decoy=null;state.decoys=3;state.burrower={...state.burrower,phase:"settle",ticks:0};
 state.message="Retour au relais local. Les indices de cette sortie sont conservés, mais ne sont pas encore un rapport sauvegardé.";
}
/** Exactly one 60Hz simulation tick; no DOM, wall clock, saves or unrelated rewards. */
export function stepGlassDesert(current:GlassDesertState,input:GlassInput={}):GlassDesertState{
 const state:GlassDesertState={...current,tick:Math.min(5_184_000,current.tick+1),actor:{...current.actor},burrower:{...current.burrower},checkpoint:{...current.checkpoint},decoy:current.decoy?{...current.decoy}:null};
 const a=state.actor,dt=1/60;const move=typeof input.moveX==="number"&&Number.isFinite(input.moveX)?Math.max(-1,Math.min(1,input.moveX)):0;
 a.vx=move*(input.careful?GLASS_DESERT.carefulSpeed:GLASS_DESERT.speed);if(move)a.facing=move<0?-1:1;
 if(input.jumpPressed&&a.grounded){a.vy=-GLASS_DESERT.jumpSpeed;a.grounded=false;}
 const oldY=a.y;a.vy+=GLASS_DESERT.gravity*dt;a.x=Math.max(24,Math.min(3576,a.x+a.vx*dt));a.y+=a.vy*dt;a.grounded=false;
 if(a.vy>=0)for(const p of glassPlatforms(state))if(a.x+20>p.x&&a.x-20<p.x+p.width&&oldY<=p.y+.01&&a.y>=p.y){a.y=p.y;a.vy=0;a.grounded=true;}
 a.invulnerableTicks=Math.max(0,a.invulnerableTicks-1);state.scanTicks=input.scanPressed?240:Math.max(0,state.scanTicks-1);state.decoyCooldown=Math.max(0,state.decoyCooldown-1);
 if(state.decoy&&--state.decoy.ticks<=0)state.decoy=null;
 if(input.decoyPressed&&state.decoyCooldown===0&&state.decoys>0){state.decoy={x:Math.max(460,Math.min(2910,a.x+a.facing*240)),ticks:360};state.decoys--;state.decoyCooldown=100;state.message="Leurre vibratoire lancé. Son cercle cyan est la source ; gardez vos distances pendant l’approche du fouisseur.";}
 const glass=glassSurfaceAt(state)==="glass";const landed=!current.actor.grounded&&a.grounded;
 const vibration=glass?(Math.abs(a.vx)>140?1.45:Math.abs(a.vx)>0?.08:-.65):-.9;
 state.vibration=Math.max(0,Math.min(100,state.vibration+vibration+(glass&&landed?24:0)));
 const b=state.burrower;b.ticks++;
 if(b.phase==="listening"){
  const beacon=state.diversionCorroborated&&state.beaconDisposition==="preserve"&&state.tick%240===0;
  if(state.decoy||beacon||(state.vibration>=35&&a.x>440&&a.x<2940)){
   b.target=state.decoy?"decoy":beacon?"beacon":"hunter";b.targetX=state.decoy?.x??(beacon?2670:a.x);b.phase="warning";b.ticks=0;
   state.message="Le sable se soulève : la cible du fouisseur est annoncée. Quittez le cercle vers une roche stable.";
  }
 }else if(b.phase==="warning"){
  b.x+=Math.sign(b.targetX-b.x)*Math.min(Math.abs(b.targetX-b.x),18);
  if(b.ticks>=70){b.x=b.targetX;b.phase="breach";b.ticks=0;
   if(b.target==="decoy"){state.successfulDecoys++;state.decoy=null;if(state.crossingRoute==="decoy-corridor")state.crossingResolved=true;state.message="Le fouisseur a frappé le leurre. Sa récupération ouvre une fenêtre de traversée.";}
   if(Math.abs(a.x-b.x)<90&&a.y>820&&glass&&a.invulnerableTicks===0){a.health--;a.invulnerableTicks=100;a.vy=-280;a.grounded=false;state.hits++;state.message="Vibration interceptée. Rejoignez une roche, réduisez vos pas ou détournez la cible avec un leurre.";}
  }
 }else if(b.phase==="breach"&&b.ticks>=28){b.phase="settle";b.ticks=0;}
 else if(b.phase==="settle"&&b.ticks>=120){b.phase="listening";b.ticks=0;state.vibration=Math.min(state.vibration,15);}
 if(a.y>GLASS_DESERT.height||a.health<=0)returnToRelay(state);
 return input.interactPressed?interactGlassPoint(state):state;
}
