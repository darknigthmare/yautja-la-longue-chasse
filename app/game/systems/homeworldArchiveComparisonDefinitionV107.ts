import source from '../data/bibleArchiveSceneV106.json';
import {HOMEWORLD_ARCHIVE_V106} from './homeworldArchiveDefinitionV106';
/** A separate local study follows the preserved B deposit. Its sealed study
 * object is visible; no unpainted named plaque, footprint or lineage is claimed. */
export const HOMEWORLD_ARCHIVE_COMPARISON_V107={
  sceneId:'D6-W-PNJ-ROLE-03',operationId:'port-situated-study-comparison-v107',levelId:'0',districtId:'port',
  post:HOMEWORLD_ARCHIVE_V106.post,host:HOMEWORLD_ARCHIVE_V106.host,radius:HOMEWORLD_ARCHIVE_V106.radius,
  npcId:HOMEWORLD_ARCHIVE_V106.npcId,
  evidence:{id:'archive-study-c-v107',label:'Contenant d’étude C',origin:{x:7100,y:5480},stand:{x:7100,y:5524},artId:HOMEWORLD_ARCHIVE_V106.caseArtId,height:34},
  table:{id:'archive-comparison-table-v107',label:'Pupitre de comparaison',x:7350,y:5450,stand:{x:7350,y:5512},artId:'court-native-v80:clan-lectern-right',height:76},
  references:HOMEWORLD_ARCHIVE_V106.supports.map((s,i)=>({...s,caseId:i===0?'A':'B'})),
  map:{left:7020,top:5050,width:840,height:650},
} as const;
export const HOMEWORLD_ARCHIVE_COMPARISON_SOURCE_V107=source;
const value=(row:{number:number;cells:{address:string;value?:unknown}[]},column:string)=>String(row.cells.find(c=>c.address===column+row.number)?.value??'');
export const HOMEWORLD_ARCHIVE_COMPARISON_LINES_V107=source.sheets.find(s=>s.name==='Répliques V6')!.rows.filter(r=>[3184,3187,3188].includes(r.number)).map(r=>({id:value(r,'A'),kind:value(r,'C'),option:value(r,'D'),speaker:value(r,'F'),text:value(r,'G'),address:`Répliques V6!A${r.number}:K${r.number}`}));
const option=source.sheets.find(s=>s.name==='Choix et actions V6')!.rows.find(r=>r.number===788)!;
export const HOMEWORLD_ARCHIVE_COMPARISON_OPTION_V107={action:value(option,'F'),conditions:value(option,'G'),consequence:value(option,'H'),address:'Choix et actions V6!A788:I788'};
