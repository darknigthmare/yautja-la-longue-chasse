import { DEFAULT_WAR_RULES_V6, type WarRulesV6 } from './clanWarBibleV6';
import { SPECIALIZED_AUDIO_V107, specializedDefinitionsV107, type SpecializedIdV107 } from './clanWarSpecializedV107';

export const CLAN_LOGISTICS_KEY_V108 = 'yautja.clan-logistics.v108.exercise.v1';
export const CLAN_LOGISTICS_CONTEXT_V108 = 'linked-physical-logistics-v108';
export const CLAN_LOGISTICS_DEPOT_V108 = { x: 100, y: 500 };
/** Explicit prototype envelope. None of these capacities, dimensions or loans is a campaign acquisition. */
export const CLAN_LOGISTICS_HYPOTHESES_V108 = 'Terrain local original de 1000 × 600, sans correspondance CON-T. Dotation finie : 120 RAV au dépôt et 480 dans la même coque prêtée (600 au total), capacité de soute 480, portage U19 20 et opérateur 6, casier 40. Contrats de 12 tours après intégration, sans renouvellement à distance. Deux montures déjà présentes, bidon 6 eaux, cellule 4 charges, navette prêtée 4 carburants. Traversées en 12/16 étapes ; duel de 3 touches, sans blessure de campagne. Aucun revenu, rang, propriété, XP ni ennemi attribué.';
export const CLAN_LOGISTICS_SITES_V108: Record<SpecializedIdV107, { x: number; y: number }> = {
  'W3-S09': {x:390,y:300}, 'W3-S10': {x:720,y:530}, 'W3-S13': {x:620,y:190},
  'W3-S14': {x:800,y:320}, 'W3-S15': {x:730,y:100}, 'W3-S18': {x:900,y:480},
};
export const CLAN_LOGISTICS_AUDIO_V108 = SPECIALIZED_AUDIO_V107.map((source,index)=>({...source,x:index?900:580,y:index?160:70}));
export const CLAN_LOGISTICS_WALLS_V108 = [{x:600,y:420,w:28,h:65},{x:600,y:530,w:28,h:70},{x:680,y:150,w:35,h:100}];
type SiteId = SpecializedIdV107;
export interface LogisticsActorV108 { id:string; unitId:string; members:string[]; x:number; y:number; rav:number; hired:boolean; readyAt:number; until:number; active:boolean; supplied:boolean; aboard:'boat'|'shuttle'|null; layer:'surface'|'transit'|'orbit' }
export interface LogisticsWorkV108 { id:SiteId; phase:'planned'|'reserved'|'carried'|'delivered'|'building'|'ready'; kitHolder:'depot'|'carrier'|'site'; supports:number[]; worked:number; bin:number; staffed:boolean; supplied:boolean }
export interface LogisticsStateV108 {
  version:1; context:typeof CLAN_LOGISTICS_CONTEXT_V108; sourceSha:string; rulesKey:string; revision:number; turn:number;
  depot:number; recruitment:number; construction:number; upkeep:number; actors:LogisticsActorV108[]; works:LogisticsWorkV108[];
  cargo:{item:'water'|'cell'|null; work:SiteId|null};
  boat:{id:string;pilotId:string;x:number;y:number;phase:'west'|'east'|'outbound'|'inbound';progress:number;cargo:number;passenger:string|null;trip:number};
  mounts:{id:string;x:number;y:number;fatigue:number;watered:number;leader:string|null}[];
  water:{id:string;holder:'depot'|'carrier'|'site';remaining:number;consumed:number};
  cell:{id:string;holder:'depot'|'carrier'|'site';charge:number;consumed:number}; screen:boolean;
  probe:{id:string;x:number;y:number;route:'north'|'south'|null;step:number;blocked:number;crossed:number};
  duel:{phase:'unsigned'|'accepted'|'active'|'interrupted'|'won'|'lost';signatures:string[];player:number;rival:number;round:number;winner:string|null;chestHolder:'site'|string};
  recordings:{id:string;sourceId:string;x:number;y:number;seconds:number;turn:number}[];compared:boolean;
  shuttle:{id:string;pilotId:string;x:number;y:number;phase:'surface'|'outbound'|'orbit'|'inbound';progress:number;fuel:number;cargo:number;passenger:string|null;trip:number;recon:boolean;authorized:boolean};
  receipts:string[];history:LogisticsCommandV108[];log:string[];
}
export type LogisticsActionV108 =
 | {kind:'move';actor:string;dx:number;dy:number}
 | {kind:'hire'|'contract'|'release';actor:string}
 | {kind:'wait'}
 | {kind:'reserve'|'load-kit'|'deliver-kit'|'return-kit'|'support-left'|'support-right'|'work'|'staff'|'cancel';work:SiteId}
 | {kind:'rav-load'|'rav-deposit';actor:string;location:'depot'|'boat'|SiteId;amount:number}
 | {kind:'load-object'|'install-object'|'recover-object'|'return-object';object:'water'|'cell'}
 | {kind:'lead'|'unlead'|'care';mount:string}
 | {kind:'boat-board'|'boat-depart'|'boat-step'|'boat-land'|'screen'|'probe-step'|'duel-start'|'duel-strike'|'duel-reply'|'duel-claim'|'duel-renegotiate'|'compare'|'recon'|'authorize'|'shuttle-board'|'shuttle-depart'|'shuttle-step'|'shuttle-land'}
 | {kind:'probe';route:'north'|'south'}
 | {kind:'sign';actor:string}
 | {kind:'record';sourceId:string;seconds:number};
export type LogisticsCommandV108 = LogisticsActionV108 & {operationId:string};
export interface LogisticsResultV108 { state:LogisticsStateV108;accepted:boolean;message:string }
const trusted = new WeakSet<object>();
function seal<T>(value:T):T { if(value&&typeof value==='object'){for(const v of Object.values(value))seal(v);Object.freeze(value);}return value; }
function finish(state:LogisticsStateV108){trusted.add(state);return seal(state);}
const copy=(state:LogisticsStateV108):LogisticsStateV108=>JSON.parse(JSON.stringify(state));
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:{x:number;y:number},b:{x:number;y:number},radius=48)=>dist(a,b)<=radius;
const actorId=(work:SiteId)=>`operator:${work}`;
const round=(n:number)=>Math.round(n*1000)/1000;
const key=(rules:WarRulesV6)=>JSON.stringify({protocol:'v108-linked-r1',sha:rules.metadata.sha256,definitions:specializedDefinitionsV107(rules),units:rules.units,pc:rules.parameters.pc_cap_1,hypotheses:CLAN_LOGISTICS_HYPOTHESES_V108});
const unit=(a:LogisticsActorV108,rules:WarRulesV6)=>rules.units.find(u=>u.id===a.unitId)!;
export const logisticsActorV108=(s:LogisticsStateV108,id:string)=>s.actors.find(a=>a.id===id);
export const logisticsWorkV108=(s:LogisticsStateV108,id:SiteId)=>s.works.find(w=>w.id===id)!;
export const logisticsPcV108=(s:LogisticsStateV108,rules=DEFAULT_WAR_RULES_V6)=>s.actors.filter(a=>a.active).reduce((sum,a)=>sum+unit(a,rules).commandPoints,0);
export function logisticsReadyV108(s:LogisticsStateV108,a:LogisticsActorV108){return a.active&&a.hired&&a.readyAt<=s.turn&&!a.aboard;}
export function logisticsFunctionalV108(s:LogisticsStateV108,id:SiteId){const w=logisticsWorkV108(s,id),a=logisticsActorV108(s,actorId(id))!;return w.phase==='ready'&&w.staffed&&w.supplied&&a.supplied&&a.until>=s.turn&&logisticsReadyV108(s,a)&&a.layer==='surface'&&near(a,CLAN_LOGISTICS_SITES_V108[id]);}
export function logisticsConservationV108(s:LogisticsStateV108){return s.depot+s.boat.cargo+s.shuttle.cargo+s.actors.reduce((sum,a)=>sum+a.rav,0)+s.works.reduce((sum,w)=>sum+w.bin,0)+s.recruitment+s.construction+s.upkeep===600;}
export function createLogisticsV108(rules:WarRulesV6=DEFAULT_WAR_RULES_V6):LogisticsStateV108|null {
 const defs=specializedDefinitionsV107(rules);if(defs.length!==6||!rules.units.some(u=>u.id==='W3-U19'))return null;
 const make=(id:string,unitId:string,index:number):LogisticsActorV108=>({id,unitId,members:Array.from({length:rules.units.find(u=>u.id===unitId)!.fullMembers},(_,i)=>`${id}:person-${i+1}`),x:76+(index%4)*16,y:470+Math.floor(index/4)*26,rav:0,hired:false,readyAt:0,until:0,active:false,supplied:false,aboard:null,layer:'surface'});
 const actors=[make('carrier','W3-U19',0),...defs.map((d,i)=>make(actorId(d.id),d.operator,i+1)),make('rival','W3-U08',7)];
 return finish({version:1,context:CLAN_LOGISTICS_CONTEXT_V108,sourceSha:rules.metadata.sha256,rulesKey:key(rules),revision:0,turn:0,depot:120,recruitment:0,construction:0,upkeep:0,actors,works:defs.map(d=>({id:d.id,phase:'planned',kitHolder:'depot',supports:[],worked:0,bin:0,staffed:false,supplied:false})),cargo:{item:null,work:null},boat:{id:'skiff-v108-one',pilotId:'civil-pilot-v108-water',x:390,y:300,phase:'west',progress:0,cargo:480,passenger:null,trip:0},mounts:[{id:'mount-v108-1',x:570,y:90,fatigue:60,watered:0,leader:null},{id:'mount-v108-2',x:650,y:90,fatigue:60,watered:0,leader:null}],water:{id:'water-v108-one',holder:'depot',remaining:6,consumed:0},cell:{id:'cell-v108-one',holder:'depot',charge:4,consumed:0},screen:false,probe:{id:'probe-v108-inert',x:560,y:190,route:null,step:0,blocked:0,crossed:0},duel:{phase:'unsigned',signatures:[],player:3,rival:3,round:0,winner:null,chestHolder:'site'},recordings:[],compared:false,shuttle:{id:'shuttle-v108-one',pilotId:'civil-pilot-v108-orbit',x:900,y:480,phase:'surface',progress:0,fuel:4,cargo:0,passenger:null,trip:0,recon:false,authorized:false},receipts:[],history:[],log:['Dotation d’exercice finie ; aucune acquisition de campagne.']});
}
export function logisticsCanStandV108(x:number,y:number,radius=9){return x>=radius&&x<=1000-radius&&y>=radius&&y<=600-radius&&!(x+radius>850&&y-radius<130)&&!(x+radius>430&&x-radius<540&&y-radius<410)&&!CLAN_LOGISTICS_WALLS_V108.some(w=>x+radius>w.x&&x-radius<w.x+w.w&&y+radius>w.y&&y-radius<w.y+w.h);}
function clear(a:{x:number;y:number},b:{x:number;y:number},radius=9){const steps=Math.ceil(dist(a,b)/3);for(let i=1;i<=steps;i++)if(!logisticsCanStandV108(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,radius))return false;return true;}
export function logisticsHearingV108(s:LogisticsStateV108,sourceId:string){const source=CLAN_LOGISTICS_AUDIO_V108.find(a=>a.id===sourceId),a=logisticsActorV108(s,actorId('W3-S15'))!;return !!source&&logisticsReadyV108(s,a)&&a.layer==='surface'&&dist(a,source)<=150&&clear(a,source,0);}
function pay(s:LogisticsStateV108,a:LogisticsActorV108,need:number){let paid=0;const take=(available:number)=>Math.min(available,need-paid);let n=take(a.rav);a.rav-=n;paid+=n;
 if(a.aboard){const hull=s[a.aboard];n=take(hull.cargo);hull.cargo-=n;paid+=n;}
 else if(near(a,CLAN_LOGISTICS_DEPOT_V108,70)){n=take(s.depot);s.depot-=n;paid+=n;}
 else for(const w of s.works)if(near(a,CLAN_LOGISTICS_SITES_V108[w.id],65)){n=take(w.bin);w.bin-=n;paid+=n;}
 s.upkeep+=paid;return paid===need;}
function advanceTurn(s:LogisticsStateV108,rules:WarRulesV6){s.turn++;for(const a of s.actors){a.supplied=a.active&&a.readyAt<=s.turn&&pay(s,a,unit(a,rules).upkeepRav);if(a.until<s.turn)for(const w of s.works)if(actorId(w.id)===a.id)w.staffed=false;}
 for(const w of s.works){w.supplied=false;if(w.phase!=='ready')continue;const d=specializedDefinitionsV107(rules).find(d=>d.id===w.id)!;const n=Math.min(w.bin,d.upkeep);w.bin-=n;s.upkeep+=n;w.supplied=n===d.upkeep;}
 if(!logisticsFunctionalV108(s,'W3-S13'))s.screen=false;
}
export function logisticsCommandV108(s:LogisticsStateV108,a:LogisticsActionV108):LogisticsCommandV108{return {...a,operationId:`v108:${s.revision+1}`};}
const actionFields:Record<string,string[]>={move:['actor','dx','dy'],hire:['actor'],contract:['actor'],release:['actor'],wait:[],reserve:['work'],'load-kit':['work'],'deliver-kit':['work'],'return-kit':['work'],'support-left':['work'],'support-right':['work'],work:['work'],staff:['work'],cancel:['work'],'rav-load':['actor','location','amount'],'rav-deposit':['actor','location','amount'],'load-object':['object'],'install-object':['object'],'recover-object':['object'],'return-object':['object'],lead:['mount'],unlead:['mount'],care:['mount'],probe:['route'],sign:['actor'],record:['sourceId','seconds']};
for(const id of ['boat-board','boat-depart','boat-step','boat-land','screen','probe-step','duel-start','duel-strike','duel-reply','duel-claim','duel-renegotiate','compare','recon','authorize','shuttle-board','shuttle-depart','shuttle-step','shuttle-land'])actionFields[id]=[];
function validAction(a:unknown):a is LogisticsCommandV108 {if(!a||typeof a!=='object'||Array.isArray(a))return false;const v=a as Record<string,unknown>;if(typeof v.kind!=='string'||!Object.hasOwn(actionFields,v.kind)||typeof v.operationId!=='string')return false;const keys=['kind','operationId',...actionFields[v.kind]];return Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))&&Object.entries(v).every(([k,v])=>k==='dx'||k==='dy'?typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=24:k==='seconds'?typeof v==='number'&&Number.isFinite(v)&&v>=.25&&v<=30:k==='amount'?typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<=120:typeof v==='string'&&v.length<=100);}
export function applyLogisticsV108(current:LogisticsStateV108,action:LogisticsCommandV108,rules=DEFAULT_WAR_RULES_V6):LogisticsResultV108 {
 const no=(message:string):LogisticsResultV108=>({state:current,accepted:false,message});
 if(!trusted.has(current)||current.rulesKey!==key(rules)||!validAction(action)||current.history.length>=10000)return no('Carnet, source ou commande incompatible.');
 const prior=current.history.find(a=>a.operationId===action.operationId);if(prior)return JSON.stringify(prior)===JSON.stringify(action)?{state:current,accepted:true,message:'Transaction déjà appliquée, aucun débit répété.'}:no('Identifiant déjà utilisé pour une autre intention.');
 if(action.operationId!==`v108:${current.revision+1}`)return no('Intention périmée.');
 const s=copy(current),carrier=logisticsActorV108(s,'carrier')!,defs=specializedDefinitionsV107(rules);
 const ready=(a:LogisticsActorV108|undefined):a is LogisticsActorV108=>!!a&&logisticsReadyV108(s,a);
 const at=(a:LogisticsActorV108|undefined,p:{x:number;y:number},radius=48):a is LogisticsActorV108=>ready(a)&&a.layer==='surface'&&near(a,p,radius);
 const service=(id:SiteId)=>logisticsFunctionalV108(s,id);
 let message='',turn=false;
 if(action.kind==='move'){
  const a=logisticsActorV108(s,action.actor);if(!ready(a)||Math.hypot(action.dx,action.dy)>24.001||Math.hypot(action.dx,action.dy)===0)return no('Équipe indisponible ou pas invalide.');
  const p={x:round(a.x+action.dx),y:round(a.y+action.dy)},mount=s.mounts.find(m=>m.leader===a.id);
  if(a.layer==='orbit'?!near(p,{x:930,y:60},45):!clear(a,p,mount?24:9))return no(mount?'Le gabarit de la monture exige le détour large.':'Eau, obstacle ou limite : détour physique requis.');
  a.x=p.x;a.y=p.y;if(mount){mount.x=p.x;mount.y=p.y;mount.fatigue=Math.min(100,mount.fatigue+1);}
  for(const w of s.works)if(actorId(w.id)===a.id&&w.staffed&&!near(a,CLAN_LOGISTICS_SITES_V108[w.id]))w.staffed=false;
  if(s.duel.phase==='active'&&((['operator:W3-S14','rival'].includes(a.id)&&!near(a,CLAN_LOGISTICS_SITES_V108['W3-S14'],65))||(a.id==='carrier'&&near(a,CLAN_LOGISTICS_SITES_V108['W3-S14'],65)))){s.duel.phase='interrupted';s.duel.signatures=[];}
  message='Même équipe déplacée avec sa charge.';
 }else if(action.kind==='hire'||action.kind==='contract'||action.kind==='release'){
  const a=logisticsActorV108(s,action.actor);if(!a||a.aboard||a.layer!=='surface'||!near(a,CLAN_LOGISTICS_DEPOT_V108,110))return no('Le même volontaire doit revenir physiquement au dépôt.');const u=unit(a,rules);
  if(action.kind==='release'){if(!a.active||a.rav||s.mounts.some(m=>m.leader===a.id)||(a.id==='carrier'&&(s.cargo.item||s.cargo.work)))return no('Déposer charges et longe avant de rejoindre la réserve.');a.active=false;a.supplied=false;for(const w of s.works)if(actorId(w.id)===a.id)w.staffed=false;message='Contrat clos au dépôt ; même personne en réserve.';}
  else{if(a.active||action.kind==='hire'&&a.hired||action.kind==='contract'&&!a.hired||logisticsPcV108(s,rules)+u.commandPoints>rules.parameters.pc_cap_1)return no('Contrat déjà actif, recrutement inadapté ou plafond PC dépassé.');if(!a.hired){if(s.depot<u.recruitmentRav)return no('Recrutement sans RAV disponibles refusé.');s.depot-=u.recruitmentRav;s.recruitment+=u.recruitmentRav;a.hired=true;a.readyAt=s.turn+u.delayTurns;}else a.readyAt=s.turn;a.active=true;a.until=a.readyAt+12;a.supplied=false;message=`${a.id} : contrat jusqu’au tour ${a.until}, ${u.delayTurns} tours d’intégration à la première embauche.`;}
 }else if(action.kind==='wait'){turn=true;message='Tour avancé ; entretien débité aux lieux accessibles.';
 }else if('work' in action){const w=s.works.find(w=>w.id===action.work);if(!w)return no('Chantier inconnu.');const d=defs.find(d=>d.id===w.id)!,p=CLAN_LOGISTICS_SITES_V108[w.id],op=logisticsActorV108(s,actorId(w.id))!;
  if(action.kind==='reserve'){if(w.phase!=='planned'||s.depot<d.cost)return no('Kit déjà réservé ou dépôt insuffisant.');s.depot-=d.cost;s.construction+=d.cost;w.phase='reserved';message='Pièces réservées une fois au dépôt.';}
  else if(action.kind==='load-kit'){if(w.phase!=='reserved'||!at(carrier,CLAN_LOGISTICS_DEPOT_V108)||s.cargo.item||s.cargo.work)return no('Porteurs intégrés et libres au dépôt requis.');s.cargo.work=w.id;w.kitHolder='carrier';w.phase='carried';message='Kit unique chargé par U19.';}
  else if(action.kind==='deliver-kit'){if(s.cargo.work!==w.id||!at(carrier,p))return no('Acheminer ce kit au vrai chantier.');s.cargo.work=null;w.kitHolder='site';w.phase='delivered';message='Kit posé à sa position réelle.';}
  else if(action.kind==='return-kit'){if(w.worked||!at(carrier,w.kitHolder==='site'?p:CLAN_LOGISTICS_DEPOT_V108)||s.cargo.item||s.cargo.work||!['reserved','delivered'].includes(w.phase))return no('Kit non travaillé et porteurs libres présents requis.');s.cargo.work=w.id;w.kitHolder='carrier';w.phase='carried';w.supports=[];message='Même kit repris ; son coût reste réservé pendant le retour.';}
  else if(action.kind==='cancel'){if(w.phase==='carried'&&s.cargo.work===w.id&&w.worked===0&&at(carrier,CLAN_LOGISTICS_DEPOT_V108)&&s.depot+d.cost<=120){s.cargo.work=null;w.kitHolder='depot';w.phase='planned';s.depot+=d.cost;s.construction-=d.cost;w.supports=[];message='Kit réellement revenu ; réservation libérée une seule fois.';}else{w.staffed=false;if(w.id==='W3-S13')s.screen=false;message='Service suspendu, travaux et charges conservés ; aucun remboursement à distance.';}}
  else if(action.kind==='support-left'||action.kind==='support-right'){const index=action.kind==='support-left'?0:1;if(!['delivered','building'].includes(w.phase)||w.supports.includes(index)||!at(op,{x:p.x+(index?24:-24),y:p.y},12))return no('Opérateur source présent sur cet appui non posé requis.');w.supports.push(index);message=`Appui ${index+1} réellement posé.`;}
  else if(action.kind==='work'){if(!['delivered','building'].includes(w.phase)||w.supports.length!==2||!at(op,p)||!op.supplied||op.until<s.turn)return no('Kit, appuis, contrat et opérateur ravitaillé requis.');w.worked++;w.phase=w.worked===d.turns?'ready':'building';turn=true;message=`Travail physique ${w.worked}/${d.turns} tours source.`;}
  else if(action.kind==='staff'){if(w.phase!=='ready'||!at(op,p)||!op.supplied||op.until<s.turn)return no('Ouvrage terminé, contrat et opérateur nourri présent requis.');w.staffed=!w.staffed;message=w.staffed?'Prise de service locale.':'Service quitté, même ouvrage conservé.';}
 }else if(action.kind==='rav-load'||action.kind==='rav-deposit'){
  const a=logisticsActorV108(s,action.actor),w=s.works.find(w=>w.id===action.location);if(!ready(a))return no('Équipe non disponible.');const location=action.location==='depot'?CLAN_LOGISTICS_DEPOT_V108:action.location==='boat'?s.boat:w?CLAN_LOGISTICS_SITES_V108[w.id]:null;if(!location||!at(a,location)||action.location==='boat'&&!['west','east'].includes(s.boat.phase))return no('Rejoindre le stock réellement disponible.');
  const available=action.location==='depot'?s.depot:action.location==='boat'?s.boat.cargo:w!.bin,load=action.kind==='rav-load',cap=a.id==='carrier'?20:6;
  if(load?(available<action.amount||a.rav+action.amount>cap):(a.rav<action.amount||available+action.amount>(action.location==='depot'?120:action.location==='boat'?480:40)))return no('Stock, charge ou capacité dépassés.');const delta=load?-action.amount:action.amount;a.rav-=delta;if(action.location==='depot')s.depot+=delta;else if(action.location==='boat')s.boat.cargo+=delta;else w!.bin+=delta;message='Lot transféré une seule fois par la personne présente.';
 }else if('object' in action){const object=action.object==='water'?s.water:action.object==='cell'?s.cell:null;if(!object)return no('Objet absent.');const work=action.object==='water'?'W3-S10':'W3-S13',p=CLAN_LOGISTICS_SITES_V108[work];
  if(action.kind==='load-object'){if(!at(carrier,CLAN_LOGISTICS_DEPOT_V108)||object.holder!=='depot'||s.cargo.item||s.cargo.work)return no('Objet au dépôt et porteurs libres requis.');object.holder='carrier';s.cargo.item=action.object;message='Objet fini chargé, aucun exemplaire créé.';}
  else if(action.kind==='install-object'){if(!at(carrier,p)||object.holder!=='carrier'||s.cargo.item!==action.object||logisticsWorkV108(s,work).phase!=='ready')return no('Livrer le même objet au chantier terminé.');object.holder='site';s.cargo.item=null;message='Objet livré avec son contenu restant.';}
  else if(action.kind==='recover-object'){if(!at(carrier,p)||object.holder!=='site'||s.cargo.item||s.cargo.work||action.object==='cell'&&s.screen)return no('Couper le service et reprendre physiquement l’objet avec U19 libre.');object.holder='carrier';s.cargo.item=action.object;message='Même objet repris, contenu consommé non restauré.';}
  else{if(!at(carrier,CLAN_LOGISTICS_DEPOT_V108)||object.holder!=='carrier'||s.cargo.item!==action.object)return no('Retour effectif de l’objet au dépôt requis.');object.holder='depot';s.cargo.item=null;message='Objet revenu au dépôt sans recharge ni eau créée.';}
 }else if(action.kind==='lead'||action.kind==='unlead'||action.kind==='care'){
  const m=s.mounts.find(m=>m.id===action.mount),op=logisticsActorV108(s,actorId('W3-S10'))!;if(!m)return no('Monture absente.');
  if(action.kind==='lead'){if(!at(op,m)||m.leader||s.mounts.some(m=>m.leader===op.id)||!clear(m,op,24))return no('Guide présent, longe libre et trajet large requis.');m.leader=op.id;m.x=op.x;m.y=op.y;message='Monture existante prise en longe.';}
  else if(action.kind==='unlead'){if(m.leader!==op.id)return no('La même longe doit être tenue.');m.leader=null;message='Monture laissée à son lieu réel.';}
  else{if(!service('W3-S10')||!near(m,CLAN_LOGISTICS_SITES_V108['W3-S10'],55)||s.water.holder!=='site'||s.water.remaining<2||m.fatigue===0)return no('Monture présente, aire tenue et eau réellement livrée requises.');s.water.remaining-=2;s.water.consumed+=2;m.watered+=2;m.fatigue=Math.max(0,m.fatigue-40);turn=true;message='Soin réel : deux eaux consommées ; fatigue conservée.';s.receipts.push(`care:${m.id}:${m.watered}`);}
 }else if(action.kind==='boat-board'||action.kind==='boat-depart'||action.kind==='boat-step'||action.kind==='boat-land'){
  const b=s.boat;if(action.kind==='boat-board'){if(!at(carrier,b)||!['west','east'].includes(b.phase)||b.passenger||b.cargo+carrier.rav>480||!service('W3-S09')||s.cargo.work||s.cargo.item)return no('Quai tenu, même U19 libre et coque arrivée requis.');b.passenger=carrier.id;carrier.aboard='boat';carrier.x=b.x;carrier.y=b.y;b.cargo+=carrier.rav;carrier.rav=0;message='U19 et son lot embarqués sur la même coque.';}
  else if(action.kind==='boat-depart'){if(!['west','east'].includes(b.phase)||!service('W3-S09')||s.turn%4>1)return no('Quai tenu et fenêtre de courant 0–1 modulo 4 requis.');b.phase=b.phase==='west'?'outbound':'inbound';b.progress=0;b.trip++;turn=true;message='Traversée engagée avec le pilote civil identifié.';}
  else if(action.kind==='boat-step'){if(!['outbound','inbound'].includes(b.phase))return no('Aucune traversée engagée.');const out=b.phase==='outbound';b.progress++;b.x=round(out?390+180*b.progress/12:570-180*b.progress/12);b.y=300-30*Math.sin(Math.PI*b.progress/12);if(b.passenger){carrier.x=b.x;carrier.y=b.y;}if(b.progress===12){b.phase=out?'east':'west';s.receipts.push(`boat:${b.trip}:${b.phase}`);turn=true;}message=`Même coque et manifeste : ${b.progress}/12.`;}
  else{if(!b.passenger||!['west','east'].includes(b.phase))return no('Arrivée effective requise avant de débarquer.');b.passenger=null;carrier.aboard=null;carrier.x=b.x+(b.phase==='west'?-20:20);carrier.y=b.y;message='Mêmes porteurs débarqués ; les RAV restent dans la soute identifiée.';}
 }else if(action.kind==='screen'){if(!service('W3-S13')||s.cell.holder!=='site'||s.cell.charge<1)return no('Écran tenu et cellule chargée installée requis.');s.screen=!s.screen;message=s.screen?'Seul le couloir nord est alimenté.':'Écran coupé.';
 }else if(action.kind==='probe'){if(s.probe.route||!['north','south'].includes(action.route))return no('Terminer le trajet de la même sonde.');s.probe.route=action.route;s.probe.step=0;s.probe.x=560;s.probe.y=action.route==='north'?190:370;message='Sonde inerte au départ connu du rail choisi.';
 }else if(action.kind==='probe-step'){const p=s.probe;if(!p.route)return no('Choisir le rail de la sonde.');p.step++;p.x+=15;if(p.route==='north'&&p.x>=620&&s.screen&&service('W3-S13')){s.cell.charge--;s.cell.consumed++;p.blocked++;p.route=null;if(!s.cell.charge)s.screen=false;turn=true;message='Sonde arrêtée au seul écran ; une charge consommée.';}else if(p.step===10){p.crossed++;p.route=null;turn=true;message='Sonde arrivée ; le passage adjacent reste libre.';}else message='Sonde avancée sur son rail.';
 }else if(action.kind==='sign'||action.kind.startsWith('duel-')){
  const duel=s.duel,op=logisticsActorV108(s,actorId('W3-S14'))!,rival=logisticsActorV108(s,'rival')!,p=CLAN_LOGISTICS_SITES_V108['W3-S14'];
  if(action.kind==='sign'){const a=logisticsActorV108(s,action.actor);if(!a||!['operator:W3-S14','rival'].includes(a.id)||!at(a,p)||!['unsigned','accepted'].includes(duel.phase)||duel.signatures.includes(a.members[0]))return no('Chaque signataire présent accepte une seule fois.');duel.signatures.push(a.members[0]);duel.phase=duel.signatures.length===2?'accepted':'unsigned';message='Accord limité au coffre identifié et aux deux signataires.';}
  else if(action.kind==='duel-renegotiate'){if(duel.phase!=='interrupted'||!at(op,p)||!at(rival,p)||near(carrier,p,65))return no('Les deux partenaires doivent se retrouver seuls dans l’aire.');duel.phase='unsigned';duel.signatures=[];message='Nouvel accord à signer ; touches déjà reçues conservées.';}
  else if(action.kind==='duel-start'){if(!service('W3-S14')||duel.phase!=='accepted'||!at(rival,p)||near(carrier,p,65))return no('Accord, service, deux signataires et tiers hors de l’aire requis.');duel.phase='active';message='Duel engagé ; trois touches d’exercice.';}
  else if(action.kind==='duel-claim'){const winner=s.actors.find(a=>a.members.includes(duel.winner??''));if(!winner||!at(winner,p)||duel.chestHolder!=='site')return no('Seul le vainqueur présent peut retirer ce coffre unique.');duel.chestHolder=winner.members[0];s.receipts.push('duel:chest');message='Coffre transféré une seule fois au membre vainqueur.';}
  else{if(duel.phase!=='active'||!at(op,p)||!at(rival,p))return no('Les signataires restent dans l’aire.');if(action.kind==='duel-strike'){if(duel.round%2||!near(op,rival,32))return no('Votre tour au contact requis.');duel.rival--;duel.round++;message='Touche au contact ; réponse adverse attendue.';}else{if(duel.round%2!==1)return no('Aucune réponse engagée.');if(near(op,rival,32))duel.player--;duel.round++;turn=true;message='Réponse évaluée à la distance physique actuelle.';}if(!duel.player||!duel.rival){duel.phase=duel.rival===0?'won':'lost';duel.winner=(duel.phase==='won'?op:rival).members[0];s.receipts.push('duel:result');}}
 }else if(action.kind==='record'){const op=logisticsActorV108(s,actorId('W3-S15'))!;if(!logisticsHearingV108(s,action.sourceId)||s.recordings.length>=12)return no('Portée, paroi, opérateur ou carnet incompatible.');s.recordings.push({id:`record:${s.recordings.length+1}`,sourceId:action.sourceId,x:op.x,y:op.y,seconds:action.seconds,turn:s.turn});message='Prise située après lecture du vrai fichier ; aucune identité adverse déduite.';
 }else if(action.kind==='compare'){if(!service('W3-S15')||new Set(s.recordings.map(r=>r.sourceId)).size<2||s.compared)return no('Deux fichiers distincts puis retour à la station tenue requis.');s.compared=true;turn=true;s.receipts.push('audio:comparison');message='Machinerie et impulsion comparées ; faune et météo toujours non enregistrées.';
 }else if(action.kind==='recon'||action.kind==='authorize'||action.kind.startsWith('shuttle-')){
  const h=s.shuttle,op=logisticsActorV108(s,actorId('W3-S18'))!;
  if(action.kind==='recon'){if(!at(op,CLAN_LOGISTICS_SITES_V108['W3-S18'])||logisticsWorkV108(s,'W3-S18').phase!=='ready'||h.recon)return no('Opérateur sur l’escale terminée requis.');h.recon=true;message='Aire réellement parcourue ; aucune sécurité ennemie supposée.';}
  else if(action.kind==='authorize'){if(!service('W3-S18')||!h.recon||h.authorized)return no('Reconnaissance et escale tenue requises.');h.authorized=true;message='Accord limité à cette coque et cette route surface–orbite.';}
  else if(action.kind==='shuttle-board'){if(!ready(carrier)||!near(carrier,h)||!['surface','orbit'].includes(h.phase)||!h.authorized||h.passenger||s.cargo.item||s.cargo.work||h.phase==='surface'&&!service('W3-S18'))return no('Coque arrivée autorisée, porteurs libres et escale tenue requis.');h.passenger=carrier.id;carrier.aboard='shuttle';h.cargo=carrier.rav;carrier.rav=0;carrier.x=h.x;carrier.y=h.y;message='Mêmes trois U19 et leur lot embarqués avec le pilote civil orbital.';}
  else if(action.kind==='shuttle-depart'){if(!['surface','orbit'].includes(h.phase)||!h.passenger||!h.authorized||!h.fuel||h.phase==='surface'&&!service('W3-S18'))return no('Route, manifeste, carburant et escale requis.');h.phase=h.phase==='surface'?'outbound':'inbound';h.progress=0;h.trip++;h.fuel--;carrier.layer='transit';turn=true;message='Départ réel ; une unité de carburant débitée une seule fois.';}
  else if(action.kind==='shuttle-step'){if(!['outbound','inbound'].includes(h.phase))return no('Aucun trajet engagé.');if(h.phase==='inbound'&&h.progress===15&&!service('W3-S18'))return no('Approche suspendue : rétablir le service au sol avant atterrissage.');const out=h.phase==='outbound';h.progress++;const t=h.progress/16;h.x=round(out?900+30*t:930-30*t);h.y=round(out?480-420*t:60+420*t);carrier.x=h.x;carrier.y=h.y;if(h.progress===16){h.phase=out?'orbit':'surface';carrier.layer=out?'orbit':'surface';s.receipts.push(`shuttle:${h.trip}:${h.phase}`);turn=true;}message=`Même navette, personnes et charge : ${h.progress}/16.`;}
  else{if(!h.passenger||!['surface','orbit'].includes(h.phase))return no('Arrivée effective requise avant débarquement.');h.passenger=null;carrier.aboard=null;carrier.rav=h.cargo;h.cargo=0;carrier.x=h.x-20;carrier.y=h.y;message='Même équipe et lot débarqués au lieu effectivement atteint.';}
 }
 if(!message)return no('Commande inconnue.');if(turn)advanceTurn(s,rules);if(!logisticsConservationV108(s))return no('Conservation des stocks refusée, état courant préservé.');s.revision++;s.history.push(copyAction(action));s.log=[...s.log,`T${s.turn} · ${message}`].slice(-30);return {state:finish(s),accepted:true,message};
}
const copyAction=(a:LogisticsCommandV108):LogisticsCommandV108=>JSON.parse(JSON.stringify(a));
export function exportLogisticsV108(state:LogisticsStateV108){return trusted.has(state)?JSON.stringify(state):null;}
export function importLogisticsV108(text:string,rules=DEFAULT_WAR_RULES_V6):{state:LogisticsStateV108|null;error:string|null}{try{if(new TextEncoder().encode(text).length>4*1024*1024)throw Error('Carnet supérieur à 4 Mo.');const v=JSON.parse(text);if(v?.context!==CLAN_LOGISTICS_CONTEXT_V108||v.version!==1||v.sourceSha!==rules.metadata.sha256||v.rulesKey!==key(rules)||!Array.isArray(v.history)||v.history.length>10000)throw Error('Contexte, version ou source incompatible.');let s=createLogisticsV108(rules);if(!s)throw Error('Source incomplète.');for(const a of v.history){const r=applyLogisticsV108(s,a,rules);if(!r.accepted)throw Error('Historique impossible.');s=r.state;}if(JSON.stringify(s)!==JSON.stringify(v))throw Error('Checkpoint différent de son historique physique.');return {state:s,error:null};}catch(e){return {state:null,error:e instanceof Error?e.message:'Carnet illisible.'};}}
