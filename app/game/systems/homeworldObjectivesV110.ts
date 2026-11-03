import type {SaveGame} from '../types';
import {homeworldAtlasLandmarksV109} from './homeworldAtlasLandmarksV109';
import {homeworldAtlasTargetV83,type HomeworldAtlasLandmarkV83} from './homeworldAtlasLandmarksV83';
import {homeworldWayfindingRecommendedV75} from './homeworldWayfindingV75';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as plaque} from './homeworldArchivePlaqueDefinitionV109';
import {normalizeHomeworldArchivePlaqueV109} from './homeworldArchivePlaqueLedgerV109';
import {HOMEWORLD_CARGO_V108 as cargo} from './homeworldCargoDefinitionV108';
import {normalizeHomeworldCargoV108} from './homeworldCargoLedgerV108';
import {HOMEWORLD_ARCHIVE_COMPARISON_V107 as comparison} from './homeworldArchiveComparisonDefinitionV107';
import {normalizeHomeworldArchiveComparisonV107} from './homeworldArchiveComparisonLedgerV107';
import {HOMEWORLD_ARCHIVE_V106 as archive} from './homeworldArchiveDefinitionV106';
import {normalizeHomeworldArchiveV106} from './homeworldArchiveLedgerV106';
import {HOMEWORLD_CARTOGRAPHY_V105 as high} from './homeworldCartographyDefinitionV105';
import {normalizeHomeworldCartographyV105} from './homeworldCartographyLedgerV105';
import {HOMEWORLD_CARTOGRAPHY_V104 as local} from './homeworldCartographyDefinitionV104';
import {normalizeHomeworldCartographyV104} from './homeworldCartographyLedgerV104';
import type {HomeworldLevelV77} from './homeworldWorldV77';

export interface HomeworldCurrentObjectiveV110 {
  destinationId:string;
  instruction:string;
  operation:'plaque'|'cargo'|'comparison'|'archive'|'cartography-high'|'cartography-local'|'intro';
  interrupted:boolean;
  landmark:HomeworldAtlasLandmarkV83;
}
type Point={readonly x:number;readonly y:number};
type Candidate=HomeworldCurrentObjectiveV110&{priority:number};

/** The atlas reads only strict receipts belonging to the displayed slot.
 * Rejected/foreign receipts cannot supply positions, steps or a continuation. */
function verifiedSave(save:SaveGame):SaveGame {
  const owned=<T extends {ownerCreatedAt:string;receipt:null|{phase:string}}>(ledger:T|null)=>{
    if(!ledger||ledger.ownerCreatedAt!==save.createdAt)return undefined;
    // Some historical schemas compare String(phase). The live objective must
    // not interpret an array/lookalike as a current operation discriminant.
    const r=ledger.receipt;
    if(r&&(typeof r.phase!=='string'||'resumePhase' in r&&r.resumePhase!==null&&typeof r.resumePhase!=='string'))return undefined;
    return ledger;
  };
  const h=save.homeworld,known=h.visitedDistrictIds.includes('port');
  const archiveV106=known?owned(normalizeHomeworldArchiveV106(h.archiveV106)):undefined;
  return {...save,homeworld:{...h,
    archivePlaqueV109:known?owned(normalizeHomeworldArchivePlaqueV109(h.archivePlaqueV109)):undefined,
    cargoV108:known?owned(normalizeHomeworldCargoV108(h.cargoV108)):undefined,
    archiveComparisonV107:archiveV106?.receipt?.phase==='completed'?owned(normalizeHomeworldArchiveComparisonV107(h.archiveComparisonV107)):undefined,
    archiveV106,
    cartographyV105:known?owned(normalizeHomeworldCartographyV105(h.cartographyV105)):undefined,
    cartographyV104:known?owned(normalizeHomeworldCartographyV104(h.cartographyV104)):undefined,
  }};
}

function operationObjective(save:SaveGame):Candidate|null {
  const candidates:Candidate[]=[];
  const add=(operation:Candidate['operation'],phase:string,step:string,label:string,stand:Point,instruction:string,levelId:HomeworldLevelV77='0')=>{
    if(phase==='completed')return;
    const interrupted=phase==='interrupted';
    const id=`objective-${operation}-${step}-v110`;
    const landmark:HomeworldAtlasLandmarkV83={id,label,detail:instruction,levelId,district:'Quai · opération en cours',category:'service',buildingId:null,pointId:null,regionId:null,
      // The exterior route planner approaches a marker 55 units from its
      // displayed centre. Store the real action stand, without moving it.
      position:{x:stand.x,y:stand.y-55},access:'open',reason:'Rejoins ce point à pied. Le guide ne reprend, ne manipule et ne valide aucune opération.',keywords:['objectif','étape','reprise',operation]};
    candidates.push({destinationId:id,instruction,operation,interrupted,landmark,priority:phase==='offer'?3:interrupted?1:['choice','ready'].includes(phase)?2:0});
  };
  const p=save.homeworld.archivePlaqueV109?.receipt;
  if(p&&p.phase!=='completed'){
    const host=(step:string,instruction:string)=>add('plaque',p.phase,step,'K-17 · archiviste',plaque.post,instruction);
    const support=(id:string,step:string,instruction:string)=>{const s=plaque.supports.find(s=>s.id===id);if(s)add('plaque',p.phase,step,'K-17 · '+s.label,s.stand,instruction);};
    if(p.phase==='interrupted'){
      if(p.failureSpoken&&!p.resumeSpoken)host('resume-source','Rejoins l’archiviste et demande volontairement la reprise du bord manquant.');
      else add('plaque',p.phase,'resume','K-17 · dernier point confirmé',p.last,'Reviens exactement au dernier point confirmé, puis reprends volontairement la même étude.');
    }else if(['offer','choice','ready','return'].includes(p.phase))host(p.phase,p.phase==='return'?'Rapporte le constat à l’archiviste ; les pièces restent séparées.':'Rejoins l’archiviste pour écouter, choisir ou autoriser l’étude K-17.');
    else if(p.carrier)support(p.carrier,'deposit-'+p.carrier,'Porte la pièce jusqu’à sa propre surface, puis dépose-la séparément.');
    else {
      const missing=p.objects.slice(0,2).find(o=>o.place!=='support')??(p.resumeSpoken?p.objects.find(o=>o.id==='fragment'&&o.place!=='support'):undefined);
      if(missing){const d=plaque.objects.find(o=>o.id===missing.id);if(!d)return null;const stand=missing.place==='source'?d.stand:{x:missing.x,y:missing.y+60};
        const action=!p.observations.includes(missing.id)?'observe':!p.provenances.includes(missing.id)?'copy':'take';
        add('plaque',p.phase,action+'-'+missing.id,'K-17 · '+d.label,stand,action==='observe'?'Observe la pièce sur place avant de relever son lieu.':action==='copy'?'Copie le lieu de découverte avant de prendre cette pièce.':'Prends la pièce avec son relevé, puis porte-la jusqu’à sa surface.');
      }else if(p.option==='A'&&!p.edgeObserved)support('plaque','edge','Observe le bord manquant de la plaque, sans annoncer de réparation.');
      else if(p.option==='A'&&!p.mismatchObserved)support('plaque','compare','Compare les deux appuis sans forcer ni fusionner les pièces.');
      else if(p.option==='A'&&!p.failureSpoken)host('mismatch','Rapporte à l’archiviste l’écart réellement observé.');
      else if(p.option==='A'&&!p.resumeSpoken)host('request-reprise','Interromps volontairement l’étude, puis demande sa reprise à l’archiviste.');
      else support('plaque',p.option==='A'&&!p.fragmentCompared?'fragment-compare':'conclude',p.option==='A'&&!p.fragmentCompared?'Examine le fragment candidat sans le fusionner avec la plaque.':'Conserve le constat et prépare le retour à l’archiviste.');
    }
  }
  const c=save.homeworld.cargoV108?.receipt;
  if(c&&c.phase!=='completed'){
    const host=(step:string,instruction:string)=>add('cargo',c.phase,step,cargo.npcName,cargo.post,instruction);
    if(c.phase==='interrupted')add('cargo',c.phase,'resume','Lots du quai · dernier point confirmé',c.last,'Reviens exactement au dernier point confirmé, puis reprends les mêmes lots.');
    else if(['choice','ready','return'].includes(c.phase))host(c.phase,c.phase==='return'?'Rapporte la traverse réellement éprouvée à l’intendante.':'Rejoins l’intendante pour écouter l’approche retenue et commencer.');
    else if(!c.ownerConsents)host('owner-consent','Demande l’accord de la responsable avant de déplacer un lot.');
    else if(c.option==='B'&&!c.depositConsent)add('cargo',c.phase,'depot-consent','Gardien des lots du quai',cargo.guardian.post,'Demande au gardien l’autorisation du dépôt avant de prendre le lot large.');
    else if(c.carrier){const rack=cargo.racks.find(r=>r.id===c.carrier),depot=c.option==='B'&&c.carrier==='wide';if(rack)add('cargo',c.phase,'deposit-'+c.carrier,depot?cargo.depot.label:rack.label,depot?cargo.depot.stand:rack.stand,'Porte ce lot jusqu’à son emplacement compatible, puis dépose-le.');}
    else {const lot=c.lots.find(l=>l.place==='source'||l.place==='ground');
      if(lot){const d=cargo.lots.find(l=>l.id===lot.id);if(d)add('cargo',c.phase,'take-'+lot.id,d.label,lot.place==='source'?d.stand:{x:lot.x,y:lot.y+60},'Rejoins le lot identifié, puis prends-le avec l’accord de sa responsable.');}
      else add('cargo',c.phase,c.passageStartWalked===null?'passage-start':'passage-end','Traverse du quai',c.passageStartWalked===null?cargo.passage.start:cargo.passage.end,c.passageStartWalked===null?'Rejoins le départ et lance le contrôle physique de la traverse.':'Parcours la traverse à pied jusqu’à son extrémité orientale.');
    }
  }
  const co=save.homeworld.archiveComparisonV107?.receipt;
  if(co&&co.phase!=='completed'){
    if(co.phase==='interrupted')add('comparison',co.phase,'resume','Étude C · dernier point confirmé',co.last,'Reviens exactement au dernier point confirmé, puis reprends C et son relevé.');
    else if(['choice','ready','return'].includes(co.phase))add('comparison',co.phase,co.phase,'Archiviste · étude C',comparison.post,co.phase==='return'?'Rapporte la comparaison située sans attribuer d’origine commune.':'Rejoins l’archiviste pour écouter et commencer l’étude C.');
    else if(co.phase==='search')add('comparison',co.phase,!co.discovery?'discover':!co.provenanceCopied?'copy':'take',comparison.evidence.label,co.evidence.place==='source'?comparison.evidence.stand:{x:co.evidence.x,y:co.evidence.y+55},!co.discovery?'Relève sur place le lieu du contenant C.':!co.provenanceCopied?'Copie le lieu découvert avant de déplacer C.':'Prends le contenant C avec son relevé.');
    else if(co.phase==='carrying')add('comparison',co.phase,'deposit',comparison.table.label,comparison.table.stand,'Porte C jusqu’au pupitre et dépose-le avec sa provenance.');
    else {const reference=comparison.references.find(s=>!co.observations.some(o=>o.supportId===s.caseId));
      add('comparison',co.phase,reference?'observe-'+reference.caseId:'compare',reference?'Dossier '+reference.caseId:comparison.table.label,reference?.stand??comparison.table.stand,reference?'Observe physiquement ce dossier conservé avant la comparaison.':'Confronte les deux observations au pupitre, sans déclarer de lignée.');}
  }
  const a=save.homeworld.archiveV106?.receipt;
  if(a&&a.phase!=='completed'){
    if(a.phase==='interrupted')add('archive',a.phase,'resume','Dossiers A/B · dernier point confirmé',a.last,'Reviens exactement au dernier point confirmé, puis reprends les dossiers.');
    else if(['choice','ready','return'].includes(a.phase))add('archive',a.phase,a.phase,archive.npcName,archive.post,a.phase==='return'?'Rapporte les deux dépôts séparés à l’archiviste.':'Rejoins l’archiviste pour écouter et commencer le dépôt séparé.');
    else if(a.carrier){const s=archive.supports[a.carrier==='A'?0:1];add('archive',a.phase,'deposit-'+a.carrier,s.label,s.stand,'Porte le dossier jusqu’à son propre support, puis dépose-le séparément.');}
    else {const item=a.cases.find(c=>c.place==='ground');if(item)add('archive',a.phase,'take-'+item.id,'Dossier d’étude '+item.id,{x:item.x,y:item.y+55},'Rejoins ce dossier et prends-le sans déplacer l’autre.');}
  }
  const h=save.homeworld.cartographyV105?.receipt;
  if(h&&h.phase!=='completed'){
    if(h.phase==='interrupted')add('cartography-high',h.phase,'resume','Relevé du viaduc · dernier point',h.last,'Reviens au dernier point confirmé, au même étage, puis reprends le relevé.',h.last.levelId);
    else if(['choice','ready','return'].includes(h.phase))add('cartography-high',h.phase,h.phase,'Cartographe du quai',high.post,h.phase==='return'?'Redescends par l’escalier du Conseil et rapporte le relevé daté.':'Rejoins le cartographe pour écouter et commencer le relevé depuis le point haut.');
    else add('cartography-high',h.phase,h.phase==='walking'?'high-point':h.compared===0?'compare-first':h.compared===1?'compare-second':'date','Point haut du viaduc',high.highPoint,h.phase==='walking'?'Rejoins le point haut par le véritable escalier du Conseil.':h.compared===0?'Compare le premier repère depuis ce point haut.':h.compared===1?'Compare le second repère depuis ce point haut.':'Date le relevé de ces deux repères observés.','+1');
  }
  const l=save.homeworld.cartographyV104?.receipt;
  if(l&&l.phase!=='completed'){
    if(l.phase==='interrupted')add('cartography-local',l.phase,'resume','Relevé local · dernier point',l.last,'Reviens au dernier point confirmé, puis reprends le relevé.');
    else if(l.phase==='walking'){const waypoint=local.waypoints[l.nextWaypoint];if(waypoint)add('cartography-local',l.phase,'waypoint-'+l.nextWaypoint,waypoint.label,waypoint,'Rejoins à pied le prochain repère du relevé local.');}
    else add('cartography-local',l.phase,l.phase,'Cartographe du quai',local.post,l.phase==='return'?'Rapporte au pupitre le relevé réellement parcouru.':'Rejoins le cartographe pour écouter et commencer le relevé local.');
  }
  return candidates.sort((a,b)=>a.priority-b.priority)[0]??null;
}

/** Read-only next action. No object, discovery, consent or receipt is changed. */
export function homeworldCurrentObjectiveV110(save?:SaveGame):HomeworldCurrentObjectiveV110|null {
  if(!save)return null;
  const checked=verifiedSave(save),operation=operationObjective(checked);
  if(operation)return {destinationId:operation.destinationId,instruction:operation.instruction,operation:operation.operation,interrupted:operation.interrupted,landmark:operation.landmark};
  const landmark=homeworldAtlasTargetV83(homeworldAtlasLandmarksV109(checked),homeworldWayfindingRecommendedV75(checked));
  return landmark?{destinationId:landmark.id,instruction:landmark.detail,operation:'intro',interrupted:false,landmark}:null;
}

export function homeworldAtlasLandmarksV110(save?:SaveGame):readonly HomeworldAtlasLandmarkV83[] {
  if(!save)return homeworldAtlasLandmarksV109();
  const checked=verifiedSave(save),records=homeworldAtlasLandmarksV109(checked),current=operationObjective(checked);
  return current?[...records,current.landmark]:records;
}
