/** First authored Homeworld region. Fixed 60Hz local simulation, no save access. */
export const ASH_MARCHES = { width: 3200, height: 1120, floor: 920, tickRate: 60, speed: 300, jumpSpeed: 620, gravity: 1300 } as const;
export interface AshPlatform { id: string; x: number; y: number; width: number; height: number }
export const ASH_PLATFORMS: readonly AshPlatform[] = [
  {id:"port-path",x:0,y:920,width:700,height:90},
  {id:"lower-trail",x:800,y:880,width:680,height:130},
  {id:"arena",x:1540,y:920,width:860,height:90},
  {id:"convoy",x:2460,y:920,width:740,height:90},
  {id:"upper-step",x:380,y:800,width:190,height:28},
  {id:"ash-balcony",x:620,y:680,width:180,height:28},
  {id:"secret-overlook",x:870,y:600,width:210,height:28},
  {id:"upper-return",x:1150,y:730,width:180,height:28},
  {id:"grazer-cover",x:1650,y:800,width:180,height:28},
  {id:"grazer-bait",x:2040,y:790,width:140,height:28},
];
export const ASH_POINTS = [
  {id:"true-trail",x:450,y:920,label:"Piste du convoi",hint:"Cendres tassées sous des roues, empreintes irrégulières et poussière fraîche."},
  {id:"false-trail",x:1080,y:880,label:"Piste suspecte",hint:"Empreintes identiques à intervalles réguliers, déposées au-dessus de la cendre : une fausse piste."},
  {id:"relic",x:980,y:600,label:"Relais oublié",hint:"Une marque de navigateur cachée sur la corniche."},
  {id:"rest",x:1390,y:880,label:"Relais de terrain",hint:"Reprendre souffle et fixer un point de retour local."},
  {id:"shortcut",x:2530,y:920,label:"Treuil du convoi",hint:"Déployer les passerelles de retour au-dessus des ravines."},
  {id:"convoy",x:2770,y:920,label:"Transport disparu",hint:"Comparer le sceau de transport au dossier du port."},
  {id:"extraction",x:3040,y:920,label:"Navette du port",hint:"Rapporter les observations à la cité sans s’attribuer le trophée transporté."},
] as const;
export type AshPointId=(typeof ASH_POINTS)[number]["id"];
export interface AshActor { x:number;y:number;vx:number;vy:number;grounded:boolean;facing:-1|1;health:number;invulnerableTicks:number }
export interface AshGrazer { x:number;phase:"watch"|"telegraph"|"charge"|"recover";ticks:number;direction:-1|1 }
export interface HomeworldExpeditionProof {
  expeditionId:"ash-marches";trueTrailInspected:true;falseTrailRejected:true;
  obstacleMoved:true;convoyRecovered:true;shortcutOpened:true;secretFound:boolean;ticks:number;
}
/** Accept only a complete, bounded report. This validates save data, not an anti-cheat signature. */
export function normalizeHomeworldExpeditionProof(value:unknown):HomeworldExpeditionProof|null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const proof=value as Record<string,unknown>;
  if(proof.expeditionId!=="ash-marches"||proof.trueTrailInspected!==true||
    proof.falseTrailRejected!==true||proof.obstacleMoved!==true||proof.convoyRecovered!==true||
    proof.shortcutOpened!==true||typeof proof.secretFound!=="boolean"||
    typeof proof.ticks!=="number"||!Number.isSafeInteger(proof.ticks)||proof.ticks<1)return null;
  return {expeditionId:"ash-marches",trueTrailInspected:true,falseTrailRejected:true,
    obstacleMoved:true,convoyRecovered:true,shortcutOpened:true,secretFound:proof.secretFound,ticks:proof.ticks};
}
export interface AshExpeditionState {
  tick:number;actor:AshActor;grazer:AshGrazer;scanTicks:number;
  trueTrailInspected:boolean;falseTrailRejected:boolean;obstacleMoved:boolean;
  convoyRecovered:boolean;shortcutOpened:boolean;secretFound:boolean;
  checkpoint:{x:number;y:number};falls:number;message:string;
}
export interface AshInput { moveX?:number;jumpPressed?:boolean;scanPressed?:boolean;interactPressed?:boolean }
export function createAshExpedition():AshExpeditionState {
  return {tick:0,actor:{x:100,y:920,vx:0,vy:0,grounded:true,facing:1,health:3,invulnerableTicks:0},
    grazer:{x:1880,phase:"watch",ticks:0,direction:-1},scanTicks:0,
    trueTrailInspected:false,falseTrailRejected:false,obstacleMoved:false,convoyRecovered:false,
    shortcutOpened:false,secretFound:false,checkpoint:{x:100,y:920},falls:0,
    message:"Retrouvez le convoi. Le scanner distingue les traces recouvertes des empreintes fabriquées."};
}
export function ashPlatforms(state:Pick<AshExpeditionState,"shortcutOpened">): readonly AshPlatform[] {
  return state.shortcutOpened ? [...ASH_PLATFORMS,
    {id:"return-bridge-west",x:700,y:920,width:100,height:20},
    {id:"return-bridge-mid",x:1480,y:920,width:60,height:20},
    {id:"return-bridge-east",x:2400,y:920,width:60,height:20},
  ] : ASH_PLATFORMS;
}
export function nearestAshPoint(state:AshExpeditionState) {
  return ASH_POINTS.find(point=>Math.abs(point.x-state.actor.x)<84 && Math.abs(point.y-state.actor.y)<65)??null;
}
export function ashMarchesCompletion(state:AshExpeditionState):HomeworldExpeditionProof|null {
  if(!state.trueTrailInspected||!state.falseTrailRejected||!state.obstacleMoved||
    !state.convoyRecovered||!state.shortcutOpened) return null;
  return {expeditionId:"ash-marches",trueTrailInspected:true,falseTrailRejected:true,obstacleMoved:true,
    convoyRecovered:true,shortcutOpened:true,secretFound:state.secretFound,ticks:state.tick};
}
export function interactAshPoint(current:AshExpeditionState):AshExpeditionState {
  const point=nearestAshPoint(current);
  if(!point) return {...current,message:"Approchez une trace, un relais ou le convoi pour interagir."};
  const next={...current};
  if(point.id==="true-trail"||point.id==="false-trail"){
    if(current.scanTicks===0) return {...current,message:"Activez le scanner près de la piste, puis relevez les indices."};
    if(point.id==="true-trail"){next.trueTrailInspected=true;next.message="Piste naturelle relevée : les roues ont tassé la cendre. Le convoi a suivi le passage inférieur.";}
    else{next.falseTrailRejected=true;next.message="Fausse piste écartée : mêmes empreintes, aucun poids dans la cendre. Quelqu’un a brouillé le trajet.";}
  }else if(point.id==="relic"){
    next.secretFound=true;next.message="Secret relevé : une ancienne balise des Navigateurs. Elle confirme l’existence du relais supérieur.";
  }else if(point.id==="rest"){
    next.checkpoint={x:point.x,y:point.y};
    next.actor={...current.actor,health:3};
    next.message="Relais atteint. En cas de chute, vous reviendrez ici pendant cette expédition.";
  }else if(point.id==="shortcut"){
    if(!current.obstacleMoved) return {...current,message:"Le mécanisme reste sous tension. Faites déplacer le bloc par le brouteur."};
    next.shortcutOpened=true;next.message="Passerelles abaissées : les trois ravines peuvent maintenant être franchies à pied.";
  }else if(point.id==="convoy"){
    if(!current.obstacleMoved) return {...current,message:"Le transport est bloqué par le basalte. Attirez la charge du brouteur vers l’obstacle."};
    if(!current.trueTrailInspected||!current.falseTrailRejected) return {...current,message:"Le sceau seul ne suffit pas : comparez la piste réelle et la fausse piste avant d’établir le rapport."};
    next.convoyRecovered=true;next.message="Convoi retrouvé. Le sceau correspond au transfert suspect ; ce relevé ne désigne pas encore de coupable.";
  }else{
    next.message=ashMarchesCompletion(current)?"Rapport prêt. Confirmez le retour au port : la progression ne sera annoncée qu’après sauvegarde.":"Le rapport reste incomplet : pistes, obstacle, convoi et treuil doivent être vérifiés.";
  }
  return next;
}
function respawn(state:AshExpeditionState):void {
  state.actor={...state.actor,...state.checkpoint,vx:0,vy:0,health:3,grounded:true,invulnerableTicks:90};
  state.falls+=1;state.message="Retour au relais local. Les observations de cette sortie sont conservées, pas encore sauvegardées.";
}
/** Exactly one simulation tick. Rendering speed and wall clock cannot alter the result. */
export function stepAshExpedition(current:AshExpeditionState,input:AshInput={}):AshExpeditionState {
  const state:AshExpeditionState={...current,actor:{...current.actor},grazer:{...current.grazer},checkpoint:{...current.checkpoint},tick:current.tick+1};
  const actor=state.actor, dt=1/ASH_MARCHES.tickRate;
  const move=Number.isFinite(input.moveX)?Math.max(-1,Math.min(1,input.moveX!)):0;
  actor.vx=move*ASH_MARCHES.speed;
  if(move) actor.facing=move<0?-1:1;
  if(input.jumpPressed&&actor.grounded){actor.vy=-ASH_MARCHES.jumpSpeed;actor.grounded=false;}
  const previousY=actor.y;
  actor.vy+=ASH_MARCHES.gravity*dt;
  actor.x=Math.max(24,Math.min(ASH_MARCHES.width-24,actor.x+actor.vx*dt));
  actor.y+=actor.vy*dt;actor.grounded=false;
  if(actor.vy>=0) for(const platform of ashPlatforms(state)){
    if(actor.x+22>platform.x&&actor.x-22<platform.x+platform.width&&previousY<=platform.y+.01&&actor.y>=platform.y){
      actor.y=platform.y;actor.vy=0;actor.grounded=true;
    }
  }
  if(!state.obstacleMoved&&actor.y>660&&actor.y-96<920){
    if(current.actor.x<=2208&&actor.x+22>2230) actor.x=2208;
    else if(current.actor.x>=2322&&actor.x-22<2300) actor.x=2322;
  }
  actor.invulnerableTicks=Math.max(0,actor.invulnerableTicks-1);
  state.scanTicks=input.scanPressed?240:Math.max(0,state.scanTicks-1);
  const grazer=state.grazer;
  grazer.ticks+=1;
  if(grazer.phase==="watch"){
    if(actor.x>1540&&Math.abs(actor.x-grazer.x)<380&&Math.abs(actor.y-920)<185){
      grazer.phase="telegraph";grazer.ticks=0;grazer.direction=actor.x<grazer.x?-1:1;
      state.message="Le brouteur gratte le sol : charge annoncée. Sa direction est fixée ; gagnez une corniche.";
    }
  }else if(grazer.phase==="telegraph"){
    if(grazer.ticks>=75){grazer.phase="charge";grazer.ticks=0;}
  }else if(grazer.phase==="charge"){
    const oldX=grazer.x;
    grazer.x=Math.max(1565,Math.min(2350,grazer.x+grazer.direction*650*dt));
    if(!state.obstacleMoved&&grazer.direction===1&&grazer.x+60>=2230){
      state.obstacleMoved=true;grazer.x=2180;grazer.phase="recover";grazer.ticks=0;
      state.message="La charge déplace le bloc et fait tomber les pierres. Le passage du convoi est libéré.";
    }else if(grazer.ticks>=64||oldX===grazer.x){grazer.phase="recover";grazer.ticks=0;}
    if(Math.abs(actor.x-grazer.x)<78&&actor.y>850&&actor.y-96<920&&actor.invulnerableTicks===0){
      actor.health-=1;actor.invulnerableTicks=100;actor.vy=-340;actor.grounded=false;
      actor.x=Math.max(24,Math.min(3176,actor.x+grazer.direction*65));
      state.message="Charge reçue. La corniche permet d’éviter la trajectoire annoncée.";
    }
  }else if(grazer.ticks>=110){grazer.phase="watch";grazer.ticks=0;}
  if(actor.y>ASH_MARCHES.height||actor.health<=0) respawn(state);
  return input.interactPressed?interactAshPoint(state):state;
}
