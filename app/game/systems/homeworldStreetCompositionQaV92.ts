import authored from '../data/homeworldStreetCompositionsV92.json';
import {HOMEWORLD_STREET_COMPOSITION_PROPS_V92} from './homeworldStreetCompositionMountV92';
import {homeworldStreetCompositionUsageV92} from './homeworldStreetCompositionV92';
import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_SPACEPORT_V77} from './homeworldWorldV77';
import {homeworldBuildingDoorwayV64} from './homeworldGeometryV64';

/** Observational fixtures only. Working faces use their actual native band;
 * a planter uses its existing building approach (or the existing port spawn).
 * No extra arrival, terrain, actor, save or travel permission is introduced. */
export const HOMEWORLD_STREET_COMPOSITION_QA_V92=authored.compositions.flatMap(composition=>{
 const members=HOMEWORLD_STREET_COMPOSITION_PROPS_V92.filter(item=>item.compositionId===composition.id);
 const first=members[0];if(!first)return[];
 const usage=homeworldStreetCompositionUsageV92(first),building=HOMEWORLD_BUILDINGS_V77.find(item=>item.id===first.buildingId);
 const arrival=usage?{x:usage.reduce((sum,p)=>sum+p.x,0)/usage.length,y:usage.reduce((sum,p)=>sum+p.y,0)/usage.length}:
  building?homeworldBuildingDoorwayV64(building).approach:HOMEWORLD_SPACEPORT_V77.spawn;
 return[{id:'composition-v92:'+composition.id,label:composition.label,detail:composition.detail,
  anchorElementId:first.id,memberIds:members.map(item=>item.id),anchor:{x:first.x,y:first.y},arrival:{...arrival},levelId:first.levelId,
  observationLabel:usage?'Face de travail native':building?'Approche existante du bâtiment':'Point existant du port'}];
});
