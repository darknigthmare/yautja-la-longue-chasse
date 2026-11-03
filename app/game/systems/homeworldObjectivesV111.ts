import type {SaveGame} from '../types';
import type {HomeworldAtlasLandmarkV83} from './homeworldAtlasLandmarksV83';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109} from './homeworldArchivePlaqueDefinitionV109';
import {archiveContinuationViewV111,normalizeHomeworldArchiveContinuationV111} from './homeworldArchiveContinuationLedgerV111';
import {homeworldAtlasLandmarksV110,homeworldCurrentObjectiveV110,type HomeworldCurrentObjectiveV110} from './homeworldObjectivesV110';

export interface HomeworldCurrentObjectiveV111 extends Omit<HomeworldCurrentObjectiveV110,'operation'> {
  operation:HomeworldCurrentObjectiveV110['operation']|'continuation';
}

/** The old B receipt is never rewritten or passed back to the save. Only the
 * atlas's read-only view uses the later study's real object placements. */
function continuationContext(save?:SaveGame){
  if(!save||!save.homeworld.visitedDistrictIds.includes('port'))return null;
  const raw=(save.homeworld as SaveGame['homeworld']&{archiveContinuationV111?:unknown}).archiveContinuationV111;
  const ledger=normalizeHomeworldArchiveContinuationV111(raw,save.homeworld.archivePlaqueV109);
  if(!ledger?.receipt||ledger.ownerCreatedAt!==save.createdAt)return null;
  const view=archiveContinuationViewV111(ledger);
  if(!view)return null;
  const projected:SaveGame={...save,homeworld:{...save.homeworld,archivePlaqueV109:view}};
  const legacy=homeworldCurrentObjectiveV110(projected);
  let objective:HomeworldCurrentObjectiveV111|null=legacy;
  if(ledger.receipt.phase==='active'){
    if(legacy?.operation==='plaque'){
      const id=legacy.destinationId.replace(/^objective-plaque-/,'objective-continuation-').replace(/-v110$/,'-v111');
      objective={...legacy,operation:'continuation',destinationId:id,landmark:{...legacy.landmark,id}};
    }
  }else if(!legacy||legacy.operation==='intro'){
    const phase=ledger.receipt.phase;
    const step=phase==='offer'?'offer':phase==='choice'?'reply':ledger.receipt.ownerConsent?'start':'authorize';
    const instruction=step==='offer'?'Rejoins l’archiviste et choisis volontairement de poursuivre l’étude différée.':step==='reply'?'Écoute l’archiviste avant cette nouvelle approche.':step==='authorize'?'Reçois l’accord de l’archiviste avant de reprendre les pièces conservées.':'Reprends volontairement l’étude ; les deux premières pièces restent sur leurs surfaces.';
    const id=`objective-continuation-${step}-v111`;
    const landmark:HomeworldAtlasLandmarkV83={id,label:'K-17 · reprise du constat différé',detail:instruction,levelId:'0',district:'Quai oriental',category:'service',buildingId:null,pointId:null,regionId:null,
      position:{x:HOMEWORLD_ARCHIVE_PLAQUE_V109.post.x,y:HOMEWORLD_ARCHIVE_PLAQUE_V109.post.y-55},access:'open',reason:'Le guide indique le poste ; la reprise et son accord restent des actions sur place.',keywords:['objectif','étape','reprise','continuation','K-17']};
    objective={destinationId:id,instruction,operation:'continuation',interrupted:false,landmark};
  }
  return {projected,legacy,objective};
}

export function homeworldCurrentObjectiveV111(save?:SaveGame):HomeworldCurrentObjectiveV111|null {
  return continuationContext(save)?.objective??homeworldCurrentObjectiveV110(save);
}

export function homeworldAtlasLandmarksV111(save?:SaveGame):readonly HomeworldAtlasLandmarkV83[]{
  const context=continuationContext(save);
  if(!context)return homeworldAtlasLandmarksV110(save);
  const records=homeworldAtlasLandmarksV110(context.projected);
  if(context.objective?.operation!=='continuation')return records;
  return [...records.filter(record=>record.id!==context.legacy?.destinationId),context.objective.landmark];
}
