/** Justice procedure invented for this fan game. Honour and THE PIT never generate crimes here. */
export type JusticeJurisdictionId = "homeworld" | "clan-core" | "frontier" | "neutral-station" | "renegade-port";
export type JusticeOriginChoice = "investigator" | "resale" | "rupture";
export type JusticeIncidentKind = "ritual-trophy-resale" | "false-accusation" | "detention-escape";
export type JusticeDeclaration = "recognized" | "exiled" | "accused" | "bad-blood" | "conditional";
export type JusticeResolution = "restitution" | "exoneration" | "conditional-release";
export type JusticeStage = "none" | "identity-requested" | "summoned" | "detained";
export const JUSTICE_JURISDICTIONS: readonly { id: JusticeJurisdictionId; label: string; acceptsHomeworldWarrants: boolean; description: string }[] = [
  { id:"homeworld", label:"Cité des Premiers Trophées", acceptsHomeworldWarrants:true, description:"L'autorité du dossier est locale à cette cité." },
  { id:"clan-core", label:"Routes des clans alliés", acceptsHomeworldWarrants:true, description:"Les alliés acceptent les mandats explicitement transmis." },
  { id:"frontier", label:"Frontière", acceptsHomeworldWarrants:true, description:"Un mandat ne s'y applique qu'après sa transmission." },
  { id:"neutral-station", label:"Station neutre", acceptsHomeworldWarrants:false, description:"Aucune arrestation sur un mandat étranger sans autorisation locale." },
  { id:"renegade-port", label:"Port clandestin", acceptsHomeworldWarrants:false, description:"Une route de repli reste ouverte ; elle n'efface aucun dossier." },
];
export const JUSTICE_ORIGIN_CHOICES: readonly { id:JusticeOriginChoice; label:string; description:string }[] = [
  { id:"investigator", label:"Enquêter sur la marque falsifiée", description:"Tu ouvres un dossier où une signature falsifiée t'accuse. Une enquête aux archives peut établir ton innocence. Aucune faute réelle n'est attribuée à ton chasseur." },
  { id:"resale", label:"Participer à la revente rituelle", description:"Choix délibéré : autoriser l'intermédiaire à revendre un trophée rituel qui ne lui appartient pas. Un enregistrement peut être transmis, puis relié à ton identité. Aucun objet personnel n'est retiré et aucune monnaie n'est créditée." },
  { id:"rupture", label:"Rompre publiquement avec le clan", description:"Tu choisis l'exil et gagnes un premier contact clandestin. Cette rupture ne suffit pas à créer un crime ou un mandat ; elle ne te déclare pas automatiquement Bad Blood." },
];
export const JUSTICE_ENFORCER_ROLES = [
  {id:"tracker",label:"Traqueur",description:"Cherche des indices et leur dernière position connue."},
  {id:"captor",label:"Capteur",description:"Cherche une ouverture pour immobiliser puis capturer vivant."},
  {id:"provost",label:"Prévôt",description:"Identifie, expose le mandat et respecte une reddition acceptée."},
] as const;
export interface JusticeIncident { id:string; kind:JusticeIncidentKind; jurisdictionId:JusticeJurisdictionId; actualOffender:"player"|"unknown"; resolved:boolean; resolution:JusticeResolution|null }
export interface JusticeEvidence { id:string; incidentId:string; kind:"cargo-recording"|"forged-signature"|"archive-alibi"|"custody-record"; reliability:"authentic"|"forged"|"exculpatory"; transmittedTo:JusticeJurisdictionId[] }
export interface JusticeIdentification { jurisdictionId:JusticeJurisdictionId; source:"transponder"|"biomask" }
export interface JusticeWarrant { id:string; incidentId:string; authority:"citadel-enforcers"; jurisdictionIds:JusticeJurisdictionId[]; policy:"capture-alive"; status:"active"|"resolved"; resolution:JusticeResolution|null }
export interface JusticeProgress {
  version:1; originChoice:JusticeOriginChoice|null; declaration:JusticeDeclaration;
  incidents:JusticeIncident[]; evidence:JusticeEvidence[]; identifications:JusticeIdentification[]; warrants:JusticeWarrant[];
  pressure:Record<JusticeJurisdictionId,number>; clandestineNotoriety:number;
  detention:{ jurisdictionId:JusticeJurisdictionId; warrantIds:string[]; equipmentPolicy:"retained" }|null;
  intervention:{ stage:JusticeStage; jurisdictionId:JusticeJurisdictionId|null; remainingBudget:number; cooldownTicks:number };
}
const jurisdictionIds=JUSTICE_JURISDICTIONS.map(j=>j.id);
const incidentKinds:readonly JusticeIncidentKind[]=["ritual-trophy-resale","false-accusation","detention-escape"];
const incidentIds=["ritual-trophy-case","falsified-mark-case","custody-escape-case"] as const;
const declarations:readonly JusticeDeclaration[]=["recognized","exiled","accused","bad-blood","conditional"];
const resolutions:readonly JusticeResolution[]=["restitution","exoneration","conditional-release"];
const finite=(v:unknown,fallback=0)=>typeof v==="number"&&Number.isFinite(v)?v:fallback;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const jurisdiction=(v:unknown):v is JusticeJurisdictionId=>jurisdictionIds.includes(v as JusticeJurisdictionId);
export function defaultJusticeProgress():JusticeProgress{return {version:1,originChoice:null,declaration:"recognized",incidents:[],evidence:[],identifications:[],warrants:[],pressure:Object.fromEntries(jurisdictionIds.map(id=>[id,0])) as Record<JusticeJurisdictionId,number>,clandestineNotoriety:0,detention:null,intervention:{stage:"none",jurisdictionId:null,remainingBudget:2,cooldownTicks:0}};}
export function normalizeJusticeProgress(value:unknown):JusticeProgress{
  const p=defaultJusticeProgress();if(!record(value)||value.version!==1)return p;
  if(JUSTICE_ORIGIN_CHOICES.some(c=>c.id===value.originChoice))p.originChoice=value.originChoice as JusticeOriginChoice;
  if(declarations.includes(value.declaration as JusticeDeclaration))p.declaration=value.declaration as JusticeDeclaration;
  if(Array.isArray(value.incidents))for(const raw of value.incidents.slice(0,8)){
    if(!record(raw)||!incidentIds.includes(raw.id as typeof incidentIds[number])||!incidentKinds.includes(raw.kind as JusticeIncidentKind)||!jurisdiction(raw.jurisdictionId)||p.incidents.some(i=>i.id===raw.id))continue;
    const kind=raw.kind as JusticeIncidentKind;const id=raw.id as string;
    if((id==="ritual-trophy-case"&&kind!=="ritual-trophy-resale")||(id==="falsified-mark-case"&&kind!=="false-accusation")||(id==="custody-escape-case"&&kind!=="detention-escape"))continue;
    const resolution=resolutions.includes(raw.resolution as JusticeResolution)?raw.resolution as JusticeResolution:null;
    p.incidents.push({id,kind,jurisdictionId:raw.jurisdictionId,actualOffender:kind==="false-accusation"?"unknown":"player",resolved:raw.resolved===true&&resolution!==null,resolution:raw.resolved===true?resolution:null});
  }
  if(Array.isArray(value.evidence))for(const raw of value.evidence.slice(0,12)){
    if(!record(raw)||typeof raw.id!=="string"||p.evidence.some(e=>e.id===raw.id))continue;
    const incident=p.incidents.find(i=>i.id===raw.incidentId);if(!incident)continue;
    const valid = (raw.id==="cargo-recording"&&incident.kind==="ritual-trophy-resale"&&raw.kind==="cargo-recording"&&raw.reliability==="authentic") ||
      (raw.id==="forged-signature"&&incident.kind==="false-accusation"&&raw.kind==="forged-signature"&&raw.reliability==="forged") ||
      (raw.id==="archive-alibi"&&incident.kind==="false-accusation"&&raw.kind==="archive-alibi"&&raw.reliability==="exculpatory") ||
      (raw.id==="custody-record"&&incident.kind==="detention-escape"&&raw.kind==="custody-record"&&raw.reliability==="authentic");
    if(!valid)continue;
    p.evidence.push({id:raw.id,incidentId:incident.id,kind:raw.kind as JusticeEvidence["kind"],reliability:raw.reliability as JusticeEvidence["reliability"],transmittedTo:Array.isArray(raw.transmittedTo)?jurisdictionIds.filter(id=>(raw.transmittedTo as unknown[]).includes(id)):[]});
  }
  // Imported resolutions must still satisfy the evidence and incident contract.
  for(const incident of p.incidents){
    const invalidInnocence=incident.resolution==="exoneration"&&(incident.actualOffender==="player"||!p.evidence.some(e=>e.incidentId===incident.id&&e.reliability==="exculpatory"));
    const invalidRestitution=incident.resolution==="restitution"&&incident.kind!=="ritual-trophy-resale";
    if(invalidInnocence||invalidRestitution){incident.resolved=false;incident.resolution=null;}
  }
  if(Array.isArray(value.identifications))for(const raw of value.identifications.slice(0,10)){
    if(record(raw)&&jurisdiction(raw.jurisdictionId)&&(raw.source==="transponder"||raw.source==="biomask")&&!p.identifications.some(i=>i.jurisdictionId===raw.jurisdictionId))p.identifications.push({jurisdictionId:raw.jurisdictionId,source:raw.source});
  }
  if(Array.isArray(value.warrants))for(const raw of value.warrants.slice(0,8)){
    if(!record(raw)||raw.authority!=="citadel-enforcers"||raw.policy!=="capture-alive"||p.warrants.some(w=>w.id===raw.id))continue;
    const incident=p.incidents.find(i=>i.id===raw.incidentId);if(!incident||raw.id!=="warrant-"+incident.id)continue;
    // A warrant needs both a transmitted allegation and an identified subject.
    if(!p.identifications.some(i=>i.jurisdictionId==="homeworld")||!p.evidence.some(e=>e.incidentId===incident.id&&e.reliability!=="exculpatory"&&e.transmittedTo.includes("homeworld")))continue;
    const allowed=Array.isArray(raw.jurisdictionIds)?JUSTICE_JURISDICTIONS.filter(j=>j.acceptsHomeworldWarrants&&(raw.jurisdictionIds as unknown[]).includes(j.id)).map(j=>j.id):["homeworld" as const];
    if(!allowed.includes("homeworld"))allowed.unshift("homeworld");
    p.warrants.push({id:raw.id as string,incidentId:incident.id,authority:"citadel-enforcers",policy:"capture-alive",jurisdictionIds:allowed,status:incident.resolved?"resolved":"active",resolution:incident.resolved?incident.resolution:null});
  }
  if(record(value.pressure))for(const id of jurisdictionIds)p.pressure[id]=clamp(Math.trunc(finite(value.pressure[id])),0,5);
  p.clandestineNotoriety=clamp(Math.trunc(finite(value.clandestineNotoriety)),0,20);
  if(record(value.intervention)){
    const raw=value.intervention;
    p.intervention.remainingBudget=clamp(Math.trunc(finite(raw.remainingBudget,2)),0,2);
    p.intervention.cooldownTicks=clamp(Math.trunc(finite(raw.cooldownTicks)),0,1800);
    if(jurisdiction(raw.jurisdictionId)&&["identity-requested","summoned"].includes(raw.stage as string)){
      p.intervention.stage=raw.stage as JusticeStage;p.intervention.jurisdictionId=raw.jurisdictionId;
      if(raw.stage==="summoned"&&!activeWarrants(p,raw.jurisdictionId).length){p.intervention.stage="none";p.intervention.jurisdictionId=null;}
    }
  }
  if(record(value.detention)&&jurisdiction(value.detention.jurisdictionId)&&Array.isArray(value.detention.warrantIds)){
    const rawDetention=value.detention;
    const ids=p.warrants.filter(w=>w.status==="active"&&w.jurisdictionIds.includes(rawDetention.jurisdictionId as JusticeJurisdictionId)&&(rawDetention.warrantIds as unknown[]).includes(w.id)).map(w=>w.id);
    if(ids.length){p.detention={jurisdictionId:value.detention.jurisdictionId,warrantIds:ids,equipmentPolicy:"retained"};p.intervention.stage="detained";p.intervention.jurisdictionId=value.detention.jurisdictionId;}
  }
  if(!p.warrants.some(w=>w.status==="active")&&p.declaration==="accused")p.declaration=p.originChoice==="rupture"?"exiled":"recognized";
  if(p.originChoice==="rupture"&&p.declaration==="recognized")p.declaration="exiled";
  return p;
}
function activeWarrants(p:JusticeProgress,id:JusticeJurisdictionId){return p.warrants.filter(w=>w.status==="active"&&w.jurisdictionIds.includes(id));}
function identify(p:JusticeProgress,id:JusticeJurisdictionId,source:JusticeIdentification["source"]){if(!p.identifications.some(i=>i.jurisdictionId===id))p.identifications.push({jurisdictionId:id,source});}
function issueEligibleWarrants(p:JusticeProgress){
  if(!p.identifications.some(i=>i.jurisdictionId==="homeworld"))return;
  for(const incident of p.incidents){
    if(incident.resolved||p.warrants.some(w=>w.incidentId===incident.id)||!p.evidence.some(e=>e.incidentId===incident.id&&e.reliability!=="exculpatory"&&e.transmittedTo.includes("homeworld")))continue;
    p.warrants.push({id:"warrant-"+incident.id,incidentId:incident.id,authority:"citadel-enforcers",jurisdictionIds:["homeworld"],policy:"capture-alive",status:"active",resolution:null});
    if(p.declaration!=="bad-blood")p.declaration="accused";p.pressure.homeworld=Math.max(2,p.pressure.homeworld);
  }
}
function endIntervention(p:JusticeProgress){p.intervention.stage="none";p.intervention.jurisdictionId=null;p.intervention.cooldownTicks=1800;}
export function getJusticeStatus(value:JusticeProgress){const p=normalizeJusticeProgress(value);const labels:Record<JusticeDeclaration,string>={recognized:"Chasseur reconnu",exiled:"Exilé volontaire",accused:"Accusé sous mandat","bad-blood":"Déclaré Bad Blood",conditional:"Libération sous conditions"};return {declaration:p.declaration,label:labels[p.declaration],activeWarrantCount:p.warrants.filter(w=>w.status==="active").length,notoriety:p.clandestineNotoriety,detained:p.detention!==null};}
export function getJusticeRouteControl(value:JusticeProgress,id:JusticeJurisdictionId){
  const p=normalizeJusticeProgress(value);const warrants=activeWarrants(p,id);const identified=p.identifications.some(i=>i.jurisdictionId===id);
  const kind=p.detention?"detained":!warrants.length?"clear":p.intervention.cooldownTicks>0||p.intervention.remainingBudget===0?"cooldown":identified?"summons":"identity-check";
  const labels={detained:"Détention : une résolution immédiate reste disponible.",clear:"Aucun mandat applicable dans cette juridiction.","identity-check":"Contrôle connu : l'identification reste nécessaire.",summons:"Mandat de capture vivante connu de ce contrôle.",cooldown:"Intervention en pause ; le mandat reste enregistré."};
  return {kind:kind as "detained"|"clear"|"identity-check"|"summons"|"cooldown",label:labels[kind],activeWarrantIds:warrants.map(w=>w.id),canContinue:true as const,covertRouteAvailable:true};
}
export type JusticeAction =
 |{type:"choose-origin";choice:JusticeOriginChoice}
 |{type:"transmit-evidence";evidenceId:string;jurisdictionId:JusticeJurisdictionId}
 |{type:"identify";jurisdictionId:JusticeJurisdictionId;source:JusticeIdentification["source"]}
 |{type:"inspect-alibi"}
 |{type:"share-warrant";warrantId:string;jurisdictionId:JusticeJurisdictionId}
 |{type:"request-control";jurisdictionId:JusticeJurisdictionId}
 |{type:"answer-control";response:"cooperate"|"contest"|"evade"|"surrender"}
 |{type:"resolve-case";incidentId:string;method:JusticeResolution}
 |{type:"defy-warrant"}
 |{type:"escape"}
 |{type:"break-contact";jurisdictionId:JusticeJurisdictionId};
export interface JusticeActionResult{progress:JusticeProgress;changed:boolean;ok:boolean;message:string}
export function applyJusticeAction(value:JusticeProgress,action:JusticeAction):JusticeActionResult{
  const p=normalizeJusticeProgress(value);const before=JSON.stringify(p);
  const reply=(ok:boolean,message:string):JusticeActionResult=>({progress:p,changed:JSON.stringify(p)!==before,ok,message});
  switch(action.type){
    case "choose-origin":{
      if(!JUSTICE_ORIGIN_CHOICES.some(c=>c.id===action.choice))return reply(false,"Choix inconnu.");
      if(p.originChoice)return reply(p.originChoice===action.choice,"Ce premier choix est déjà enregistré.");
      p.originChoice=action.choice;
      if(action.choice==="rupture"){p.declaration="exiled";p.clandestineNotoriety=1;return reply(true,"La rupture publique est reconnue : exil volontaire, sans mandat ni changement d'apparence.");}
      const guilty=action.choice==="resale";const id=guilty?"ritual-trophy-case":"falsified-mark-case";
      p.incidents.push({id,kind:guilty?"ritual-trophy-resale":"false-accusation",actualOffender:guilty?"player":"unknown",jurisdictionId:"homeworld",resolved:false,resolution:null});
      p.evidence.push({id:guilty?"cargo-recording":"forged-signature",incidentId:id,kind:guilty?"cargo-recording":"forged-signature",reliability:guilty?"authentic":"forged",transmittedTo:[]});
      if(guilty)p.clandestineNotoriety=2;
      return reply(true,guilty?"L'intermédiaire a reçu ton accord de revente. Un enregistrement existe, mais aucun mandat ne naît avant transmission et identification.":"Une signature accuse ton chasseur. L'accusation n'est pas un fait de culpabilité ; les archives peuvent la contredire.");
    }
    case "transmit-evidence":{
      const e=p.evidence.find(e=>e.id===action.evidenceId);if(!e||!jurisdiction(action.jurisdictionId))return reply(false,"Transmission impossible.");
      if(e.transmittedTo.includes(action.jurisdictionId))return reply(true,"Cette autorité a déjà reçu la preuve ; détruire le relais ne l'effacerait pas.");
      e.transmittedTo.push(action.jurisdictionId);p.pressure[action.jurisdictionId]=Math.max(1,p.pressure[action.jurisdictionId]);issueEligibleWarrants(p);
      return reply(true,"Le relais a transmis la pièce. Une autorité doit encore relier le dossier à une identité avant d'agir.");
    }
    case "identify":{
      if(!jurisdiction(action.jurisdictionId)||!["transponder","biomask"].includes(action.source))return reply(false,"Identification inconnue.");
      identify(p,action.jurisdictionId,action.source);issueEligibleWarrants(p);
      return reply(true,"L'identité est vérifiée ici. Seuls les dossiers transmis et les mandats applicables peuvent déclencher une sommation.");
    }
    case "inspect-alibi":{
      const incident=p.incidents.find(i=>i.kind==="false-accusation");if(!incident)return reply(false,"Aucune marque falsifiée à comparer dans ce dossier.");
      if(p.evidence.some(e=>e.id==="archive-alibi"))return reply(true,"L'attestation contradictoire est déjà au dossier.");
      p.evidence.push({id:"archive-alibi",incidentId:incident.id,kind:"archive-alibi",reliability:"exculpatory",transmittedTo:[]});
      return reply(true,"La comparaison des registres établit que la signature a été copiée. Cette attestation permet une contestation recevable.");
    }
    case "share-warrant":{
      const warrant=p.warrants.find(w=>w.id===action.warrantId&&w.status==="active");
      const destination=JUSTICE_JURISDICTIONS.find(j=>j.id===action.jurisdictionId);
      if(!warrant||!destination?.acceptsHomeworldWarrants)return reply(false,"Cette juridiction ne reconnaît pas ce mandat étranger.");
      if(!warrant.jurisdictionIds.includes(destination.id))warrant.jurisdictionIds.push(destination.id);
      return reply(true,"Le mandat a été partagé avec cette autorité ; la patrouille doit toujours identifier le sujet.");
    }
    case "request-control":{
      if(!jurisdiction(action.jurisdictionId))return reply(false,"Juridiction inconnue.");
      if(p.detention)return reply(false,"La détention propose déjà des issues sans attente réelle.");
      if(p.intervention.stage!=="none")return reply(false,"Une procédure est déjà en cours.");
      if(p.intervention.cooldownTicks>0||p.intervention.remainingBudget<1)return reply(false,"Le budget commun impose une pause entre interventions. Le mandat reste actif.");
      p.intervention.remainingBudget--;p.intervention.jurisdictionId=action.jurisdictionId;p.intervention.stage="identity-requested";
      return reply(true,"Contrôle annoncé : décliner ton identité, présenter une contestation ou quitter cette route. Aucune équipe n'est créée sur le joueur.");
    }
    case "answer-control":{
      const id=p.intervention.jurisdictionId;if(!id||!["identity-requested","summoned"].includes(p.intervention.stage))return reply(false,"Aucun contrôle n'attend de réponse.");
      if(action.response==="cooperate"){
        identify(p,id,"transponder");issueEligibleWarrants(p);
        const applicable=activeWarrants(p,id);
        if(!applicable.length){endIntervention(p);return reply(true,"Identité vérifiée : aucun mandat applicable. Le contrôle te laisse poursuivre.");}
        p.intervention.stage="summoned";return reply(true,"Le prévôt présente le mandat de capture vivante et accepte une reddition. Le dossier explique ses issues.");
      }
      if(action.response==="evade"){p.pressure[id]=clamp(p.pressure[id]+1,0,5);endIntervention(p);return reply(true,"Tu quittes la procédure par une route de repli. La pression augmente ici ; aucun mandat n'est effacé et aucun abordage fictif n'est lancé.");}
      if(action.response==="contest"){
        const alleged=p.incidents.find(i=>!i.resolved&&i.kind==="false-accusation");
        if(!JUSTICE_JURISDICTIONS.find(j=>j.id===id)?.acceptsHomeworldWarrants)return reply(false,"Cette station ne peut pas classer un dossier détenu par une autorité étrangère ; présente les preuves au prévôt de la cité.");
        if(!alleged||!p.evidence.some(e=>e.incidentId===alleged.id&&e.reliability==="exculpatory"))return reply(false,"La contestation demande une pièce contradictoire : compare les registres de la marque.");
        alleged.resolved=true;alleged.resolution="exoneration";
        for(const w of p.warrants.filter(w=>w.incidentId===alleged.id)){w.status="resolved";w.resolution="exoneration";}
        if(!p.warrants.some(w=>w.status==="active")&&p.declaration!=="bad-blood")p.declaration=p.originChoice==="rupture"?"exiled":"recognized";
        p.pressure[id]=0;endIntervention(p);return reply(true,"Le prévôt accepte l'attestation : cette fausse accusation est classée. Elle ne déclenchera plus d'arrestation.");
      }
      if(action.response==="surrender"){
        identify(p,id,"transponder");issueEligibleWarrants(p);const applicable=activeWarrants(p,id);
        if(!applicable.length){endIntervention(p);return reply(true,"Aucun mandat n'autorise cette capture. Tu restes libre.");}
        p.detention={jurisdictionId:id,warrantIds:applicable.map(w=>w.id),equipmentPolicy:"retained"};p.intervention.stage="detained";
        return reply(true,"Reddition acceptée. La procédure remplace toute sommation ; ton inventaire reste intact. Choisis une issue du dossier, sans attente réelle.");
      }
      return reply(false,"Réponse inconnue.");
    }
    case "resolve-case":{
      const incident=p.incidents.find(i=>i.id===action.incidentId);
      if(!incident||!resolutions.includes(action.method))return reply(false,"Résolution inconnue.");
      if(incident.resolved)return reply(incident.resolution===action.method,"Ce dossier est déjà résolu ; aucune récompense ni sanction n'est dupliquée.");
      if(!p.detention||!p.warrants.some(w=>w.incidentId===incident.id&&p.detention?.warrantIds.includes(w.id)))return reply(false,"Présente cette résolution au prévôt dans la procédure de détention.");
      if(action.method==="exoneration"&&(incident.actualOffender==="player"||!p.evidence.some(e=>e.incidentId===incident.id&&e.reliability==="exculpatory")))return reply(false,"Une faute réelle ne devient pas une fausse accusation. Il faut une preuve recevable d'innocence.");
      if(action.method==="restitution"&&incident.kind!=="ritual-trophy-resale")return reply(false,"La restitution concerne la prise rituelle, pas cette affaire.");
      incident.resolved=true;incident.resolution=action.method;
      for(const w of p.warrants.filter(w=>w.incidentId===incident.id)){w.status="resolved";w.resolution=action.method;}
      p.detention.warrantIds=p.detention.warrantIds.filter(id=>p.warrants.some(w=>w.id===id&&w.status==="active"));
      if(!p.detention.warrantIds.length){p.pressure[p.detention.jurisdictionId]=0;p.detention=null;endIntervention(p);}
      if(!p.warrants.some(w=>w.status==="active"))p.declaration=action.method==="exoneration"?(p.originChoice==="rupture"?"exiled":"recognized"):"conditional";
      return reply(true,action.method==="exoneration"?"L'innocence est reconnue sur cette affaire. Ton équipement est inchangé.":action.method==="restitution"?"L'intermédiaire remet la prise sous contrôle des archives. Tu es libéré sous conditions ; ce dossier ne provoquera plus d'arrestation. Aucun trophée personnel ni crédit n'est retiré.":"Libération sous conditions enregistrée pour ce dossier. Elle ne constitue pas une réhabilitation générale et n'efface pas les autres affaires.");
    }
    case "defy-warrant":{
      if(!p.warrants.some(w=>w.status==="active"))return reply(false,"Aucun jugement de retour n'est en cours ; l'exil seul n'est pas un crime.");
      if(p.declaration==="bad-blood")return reply(true,"La déclaration Bad Blood est déjà inscrite.");
      p.declaration="bad-blood";p.clandestineNotoriety=clamp(p.clandestineNotoriety+3,0,20);
      // This public refusal is relayed to allied routes. Neutral ports and frontier authorities are not subscribed.
      for(const warrant of p.warrants.filter(w=>w.status==="active"))if(!warrant.jurisdictionIds.includes("clan-core"))warrant.jurisdictionIds.push("clan-core");
      return reply(true,"Tu refuses publiquement le retour ordonné. Cette autorité te déclare Bad Blood ; le relais public transmet les mandats actifs aux routes des clans alliés. Les territoires neutres et la frontière ne les reçoivent pas automatiquement. La capture vivante reste la doctrine. Ni l'honneur ni l'apparence ne sont modifiés.");
    }
    case "escape":{
      if(!p.detention)return reply(false,"Tu n'es pas détenu.");
      if(p.incidents.some(i=>i.id==="custody-escape-case"))return reply(false,"Cette sortie clandestine a déjà été utilisée ; une résolution du dossier reste disponible.");
      const id=p.detention.jurisdictionId;
      p.incidents.push({id:"custody-escape-case",kind:"detention-escape",jurisdictionId:id,actualOffender:"player",resolved:false,resolution:null});
      p.evidence.push({id:"custody-record",incidentId:"custody-escape-case",kind:"custody-record",reliability:"authentic",transmittedTo:["homeworld"]});
      identify(p,"homeworld","biomask");p.detention=null;p.pressure[id]=Math.max(3,p.pressure[id]);p.clandestineNotoriety=clamp(p.clandestineNotoriety+2,0,20);issueEligibleWarrants(p);endIntervention(p);
      return reply(true,"Le contact clandestin ouvre la sortie de la procédure. Un dossier d'évasion distinct est transmis ; l'ancienne affaire n'est pas dupliquée. Ton inventaire reste intact.");
    }
    case "break-contact":{
      if(!jurisdiction(action.jurisdictionId)||p.detention)return reply(false,"La détention ne peut pas être effacée par une perte de contact.");
      p.pressure[action.jurisdictionId]=Math.max(0,p.pressure[action.jurisdictionId]-1);
      if(p.intervention.jurisdictionId===action.jurisdictionId)endIntervention(p);
      return reply(true,"La pression locale retombe ; les pièces transmises et les mandats restent conservés.");
    }
    default:return reply(false,"Action judiciaire inconnue.");
  }
}
/** Shared cooldown covers route and future ground interventions; elapsed time never deletes a warrant. */
export function advanceJusticeTime(value:JusticeProgress,elapsedTicks:number):JusticeProgress{
  const p=normalizeJusticeProgress(value);const ticks=clamp(Math.trunc(finite(elapsedTicks)),0,3600);
  if(ticks===0||p.detention)return p;
  const wasCooling=p.intervention.cooldownTicks>0;p.intervention.cooldownTicks=Math.max(0,p.intervention.cooldownTicks-ticks);
  if(wasCooling&&p.intervention.cooldownTicks===0)p.intervention.remainingBudget=Math.min(2,p.intervention.remainingBudget+1);
  return p;
}
