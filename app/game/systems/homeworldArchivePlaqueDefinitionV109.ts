import source from '../data/bibleArchiveSceneV106.json';
import art from '../data/homeworldArchivePlaqueArtV109.json';

/** Original local study station. K-17 is an operational label, not a canonical
 * ancestor, a historical attribution or a newly awarded campaign object. */
export const HOMEWORLD_ARCHIVE_PLAQUE_V109 = {
  sceneId: 'D6-W-PNJ-ROLE-03', operationId: 'port-k17-separated-plaque-study-v109',
  levelId: '0', districtId: 'port', npcId: 'archive-plaque-steward-v109',
  npcName: 'Archiviste · poste K-17', post: {x:7520,y:5350}, host:{x:7520,y:5285}, radius:74,
  objects: [
    {id:'plaque',label:'Plaque K-17',origin:{x:7760,y:5260},stand:{x:7760,y:5320},height:28},
    {id:'trace',label:'Empreinte distincte',origin:{x:7880,y:5260},stand:{x:7880,y:5320},height:25},
    {id:'fragment',label:'Fragment candidat',origin:{x:7520,y:5470},stand:{x:7520,y:5530},height:18},
  ],
  supports: [
    {id:'plaque',label:'Surface séparée · plaque',x:7760,y:5410,stand:{x:7760,y:5470}},
    {id:'trace',label:'Surface séparée · empreinte',x:7880,y:5410,stand:{x:7880,y:5470}},
    {id:'fragment',label:'Surface séparée · fragment',x:7640,y:5410,stand:{x:7640,y:5470}},
  ],
} as const;
export type ArchivePlaqueIdV109 = typeof HOMEWORLD_ARCHIVE_PLAQUE_V109.objects[number]['id'];
export const HOMEWORLD_ARCHIVE_PLAQUE_SOURCE_V109 = source;
export const HOMEWORLD_ARCHIVE_PLAQUE_ART_V109 = art;
export const archivePlaqueArtAdmittedV109 = () => art.status === 'admitted' && art.width > 0 && art.height > 0;
const cell = (row:{number:number;cells:{address:string;value?:unknown}[]},column:string) => String(row.cells.find(c=>c.address===column+row.number)?.value??'');
export const HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109 = source.sheets.find(s=>s.name==='Répliques V6')!.rows.map(row=>({id:cell(row,'A'),kind:cell(row,'C'),option:cell(row,'D'),speaker:cell(row,'F'),text:cell(row,'G'),address:`Répliques V6!A${row.number}:K${row.number}`}));
export const archivePlaqueSourceLineV109 = (kind:string,option?:string|null) => HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109.find(l=>l.kind===kind&&(option?l.option===option:true))!;
