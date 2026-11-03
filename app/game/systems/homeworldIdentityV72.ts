import atlas from '../data/homeworldIdentityArtV72.json';
import type { HomeworldNativeBuildingArtV64 } from './homeworldGeometryV64';
const architecture=atlas['civic-identity-atlas'];
const design = {
  'throne-audience': {cell:0, depth:520, title:'Citadelle · aile des audiences', role:'chef-local', threshold:{x:282,y:488}, doorway:{x:246,y:350,width:72,height:138}, wallHeight:360},
  'training-hall': {cell:1, depth:360, title:'Dojo des maîtres', role:'entrainement', threshold:{x:245,y:486}, doorway:{x:205,y:362,width:79,height:124}, wallHeight:190},
  'memory-vault': {cell:2, depth:480, title:'Maison de la mémoire', role:'archives', threshold:{x:248,y:485}, doorway:{x:210,y:375,width:76,height:110}, wallHeight:280},
  'deep-forge': {cell:3, depth:340, title:'Forge · atelier des parures', role:'forge', threshold:{x:276,y:423}, doorway:{x:232,y:310,width:84,height:113}, wallHeight:220},
  'clan-lodge': {cell:4, depth:460, title:'Maison des délégations et des soins', role:'soins', threshold:{x:250,y:422}, doorway:{x:208,y:304,width:82,height:118}, wallHeight:220},
  'market-armory': {cell:5, depth:400, title:'Armurerie du marché', role:'commerce', threshold:{x:257,y:423}, doorway:{x:213,y:297,width:88,height:126}, wallHeight:220},
} as const;
export const HOMEWORLD_BUILDING_IDENTITIES_V72 = Object.fromEntries(Object.entries(design).map(([id,d])=>{
  const cell=architecture.cells[d.cell];
  const art:HomeworldNativeBuildingArtV64={...architecture,...cell,
    foundationFront:{left:cell.alphaBounds.x,right:cell.alphaBounds.x+cell.alphaBounds.width-1,y:cell.pivot.y},
    threshold:d.threshold,doorway:d.doorway,footprintWorld:{width:id==='throne-audience'?600:570,depth:d.depth},wallHeightWorld:d.wallHeight,
    measurementStatus:'v72-native-atlas-gutter-alpha-and-painted-door-socket'};
  return [id,{...d,art}];
})) as Record<string,{cell:number;depth:number;title:string;role:string;art:HomeworldNativeBuildingArtV64}>;
/** Keep every service/point and front threshold. Only the visited public wing is modelled.
 * This local clan city and ceremonial chief are original adaptations, not a canonical map or universal king. */
export function homeworldBuildingIdentityV72(id:string){return HOMEWORLD_BUILDING_IDENTITIES_V72[id]??null;}
export const HOMEWORLD_CIVILIAN_ROLES_V72 = ['chief','artisan','healer','archivist','guard','courier','instructor','apprentice','dock-officer','forge-master','witness','herald','arena-steward','rite-keeper'] as const;
export type HomeworldCivilianRoleV72=typeof HOMEWORLD_CIVILIAN_ROLES_V72[number];
export const HOMEWORLD_NPC_ROLES_V72:Readonly<Record<string,HomeworldCivilianRoleV72>>={
  'hunt-king':'chief','market-artisan':'artisan','forge-artisan':'forge-master','clan-healer':'healer','memory-keeper':'archivist',
  'enforcer-captain':'guard','terrace-instructor':'instructor','dock-officer':'dock-officer','undercity-witness':'witness',
  'trophy-herald':'herald','arena-steward':'arena-steward','rite-keeper':'rite-keeper',
};
export function homeworldCivilianArtV72(role:HomeworldCivilianRoleV72){
  const index=HOMEWORLD_CIVILIAN_ROLES_V72.indexOf(role),source=index<8?atlas['civilian-roles-atlas']:atlas['civic-specialists-atlas'];
  const cell=source.cells[index<8?index:index-8];
  return {...source,...cell,role,heightWorld:role==='chief'?112:role==='apprentice'?82:100};
}
/** Deterministic occupations follow the existing residents and routes; no new NPC colliders. */
export function homeworldResidentRoleV72(resident:{id:string;districtId:string;role:string;morphId:string}):HomeworldCivilianRoleV72{
  if(resident.morphId==='young')return 'apprentice';
  if(resident.morphId==='elder')return resident.districtId==='temple'?'rite-keeper':'archivist';
  const roles:Record<string,readonly HomeworldCivilianRoleV72[]>={port:['dock-officer','courier'],market:['artisan','courier'],forges:['artisan','forge-master'],clans:['healer','courier'],memory:['archivist','herald'],terraces:['instructor','apprentice'],temple:['rite-keeper','herald'],arenas:['arena-steward','instructor'],undercity:['witness','courier'],enforcers:['guard','dock-officer'],citadel:['guard','herald'],'convoy-works':['forge-master','courier'],'rampart-walk':['guard','courier'],esplanade:['herald','archivist']};
  const family=roles[resident.districtId]??['courier'];
  const hash=[...resident.id].reduce((value,c)=>value+c.charCodeAt(0),0);
  return family[hash%family.length];
}
