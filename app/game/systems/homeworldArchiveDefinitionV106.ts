import source from '../data/bibleArchiveSceneV106.json';

/** Local study containers, never a named historical plaque or a campaign clue.
 * The existing native furniture and body are reused without new painted art. */
export const HOMEWORLD_ARCHIVE_V106 = {
  sceneId:'D6-W-PNJ-ROLE-03', operationId:'port-separated-study-records-v106',
  npcId:'archive-steward-v106', npcName:'Archiviste · dossiers séparés',
  levelId:'0', districtId:'port', post:{x:7350,y:5260}, host:{x:7350,y:5175}, radius:74,
  supports:[
    {id:'archive-support-a-v106',label:'Support A',x:7240,y:5180,stand:{x:7240,y:5242},artId:'court-native-v80:clan-lectern-right'},
    {id:'archive-support-b-v106',label:'Support B',x:7470,y:5180,stand:{x:7470,y:5242},artId:'court-native-v80:clan-lectern-right'},
  ],
  cases:[
    {id:'A',label:'Dossier d’étude A',origin:{x:7140,y:5280},stand:{x:7140,y:5324}},
    {id:'B',label:'Dossier d’étude B',origin:{x:7610,y:5280},stand:{x:7610,y:5324}},
  ],
  caseArtId:'court-native-v80:sealed-cargo-case-left',caseHeight:34,
} as const;
export const HOMEWORLD_ARCHIVE_SOURCE_V106=source;
const cell=(r:{number:number;cells:{address:string;value?:unknown}[]},column:string)=>String(r.cells.find(c=>c.address===column+r.number)?.value??'');
export const HOMEWORLD_ARCHIVE_LINES_V106=source.sheets.find(s=>s.name==='Répliques V6')!.rows.map(r=>({
  id:cell(r,'A'),kind:cell(r,'C'),option:cell(r,'D'),speaker:cell(r,'F'),text:cell(r,'G'),address:`Répliques V6!A${r.number}:K${r.number}`,
}));
const option=source.sheets.find(s=>s.name==='Choix et actions V6')!.rows.find(r=>cell(r,'C')==='B')!;
export const HOMEWORLD_ARCHIVE_OPTION_V106={action:cell(option,'F'),conditions:cell(option,'G'),address:`Choix et actions V6!A${option.number}:I${option.number}`};
