import source from '../data/bibleCargoSceneV108.json';
/** New declared local cargo staging, using existing native pixels. These are
 * independent study loads, never the painted/fused contents of an old prop. */
export const HOMEWORLD_CARGO_V108={
 sceneId:'D6-W-PNJ-ROLE-19',operationId:'port-compatible-cargo-v108',levelId:'0',districtId:'port',
 npcId:'cargo-steward-v108',npcName:'Intendante du quai',host:{x:7070,y:5335},post:{x:7070,y:5395},radius:74,
 guardian:{id:'cargo-guardian-v108',host:{x:6500,y:5350},post:{x:6500,y:5415},radius:74},
 cart:{id:'cargo-cart-v108',artId:'port-cargo-sorting-cart',x:6780,y:5420,height:115},
 racks:[
  {id:'wide',label:'Rack large',x:6960,y:5370,stand:{x:6960,y:5460},artId:'cargo-rack-right',scale:.6,capacity:92},
  {id:'narrow',label:'Rack étroit',x:6600,y:5370,stand:{x:6600,y:5460},artId:'cargo-rack-right',scale:.6,capacity:54},
 ],
 lots:[
  {id:'wide',label:'Lot large',ownerId:'local-quay-return-team',origin:{x:6790,y:5480},stand:{x:6790,y:5540},height:54,width:80,halfDepth:27},
  {id:'narrow',label:'Lot étroit',ownerId:'local-quay-maintenance-team',origin:{x:6740,y:5420},stand:{x:6740,y:5490},height:34,width:51,halfDepth:19},
 ],
 caseArtId:'court-native-v80:sealed-cargo-case-left',
 depot:{id:'cargo-authorized-depot-v108',label:'Dépôt autorisé du lot large',x:6520,y:5460,stand:{x:6520,y:5520}},
 passage:{start:{x:6670,y:5510},end:{x:7000,y:5510},halfDepth:34,minWalk:300},
} as const;
export const HOMEWORLD_CARGO_SOURCE_V108=source;
const cell=(r:{number:number;cells:{address:string;value?:unknown}[]},c:string)=>String(r.cells.find(v=>v.address===c+r.number)?.value??'');
export const HOMEWORLD_CARGO_LINES_V108=source.sheets.find(s=>s.name==='Répliques V6')!.rows.map(r=>({id:cell(r,'A'),kind:cell(r,'C'),option:cell(r,'D'),speaker:cell(r,'F'),text:cell(r,'G'),address:`Répliques V6!A${r.number}:K${r.number}`}));
export const HOMEWORLD_CARGO_OPTIONS_V108=source.sheets.find(s=>s.name==='Choix et actions V6')!.rows.map(r=>({option:cell(r,'C'),action:cell(r,'F'),conditions:cell(r,'G'),consequence:cell(r,'H'),address:`Choix et actions V6!A${r.number}:I${r.number}`}));
