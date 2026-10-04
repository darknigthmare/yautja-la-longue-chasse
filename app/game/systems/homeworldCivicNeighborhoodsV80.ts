import {HOMEWORLD_BUILDINGS_V77,HOMEWORLD_SPACEPORT_V77,homeworldTerrainV77,homeworldLevelV77,type HomeworldLevelV77} from './homeworldWorldV77';
import type {HomeworldVec2} from './homeworldCity';
import {HOMEWORLD_AUTHORED_COURTS_V81} from './homeworldAuthoredLotsV81';

/** Local civic names describe this game's layout; they are not named official
 * Yautja settlements, new districts to unlock, or discoveries to persist. */
export const HOMEWORLD_CIVIC_NEIGHBORHOODS_V80=[
 {id:'lower-exchange',levelId:'-1A' as const,x:3150,y:3130,label:'Place des échanges bas',detail:'Des cours de service bordent la rue ; les maisons fermées restent du décor.'},
 {id:'lower-maintenance',levelId:'-1A' as const,x:4150,y:3020,label:'Cours de maintenance',detail:'Les postes de travail restent en retrait des rues et des passages.'},
 {id:'lower-rest',levelId:'-1A' as const,x:3070,y:4150,label:'Halte de la rue basse',detail:'Bancs et petites cours latérales laissent libre le chemin des galeries.'},
 {id:'lower-water',levelId:'-1A' as const,x:4840,y:4540,label:'Cour des citernes',detail:'La réserve d’eau civique marque l’extrémité orientale des cours.'},
 {id:'lower-forge',levelId:'-1A' as const,x:3600,y:4800,label:'Cour des artisans',detail:'Les outils de maintenance et les réserves bordent les devantures.'},
 {id:'lower-common',levelId:'-1A' as const,x:4210,y:4840,label:'Cour commune',detail:'La table et les haltes sont distinctes du passage public.'},
 ...HOMEWORLD_AUTHORED_COURTS_V81.filter(c=>c.levelId==='0').map((c,i)=>({id:'port-causeway-'+i,levelId:'0' as const,x:c.x,y:c.y,label:c.label,detail:'Cour '+c.composition.toLowerCase()+' : '+c.focus+'. L’axe piéton reste libre.'})),
] as const;
export function homeworldCivicNeighborhoodV80(levelId:HomeworldLevelV77,point:HomeworldVec2){
 const port=HOMEWORLD_SPACEPORT_V77,pad=port.pad,onPad=point.x>=pad.x-pad.width/2&&point.x<=pad.x+pad.width/2&&point.y>=pad.y-pad.depth/2&&point.y<=pad.y+pad.depth/2;
 if(levelId==='0'&&(onPad||Math.hypot(point.x-port.spawn.x,point.y-port.spawn.y)<520)&&homeworldTerrainV77('0',point,{halfWidth:0,halfDepth:0}))
  return{label:'Port des Chasses',detail:'La navette reste sur son pad. Le quai et son sas rejoignent les voies de la cité à pied.',id:'port-arrival'};
 const local=HOMEWORLD_CIVIC_NEIGHBORHOODS_V80.filter(p=>p.levelId===levelId).map(p=>({...p,distance:Math.hypot(point.x-p.x,point.y-p.y)})).sort((a,b)=>a.distance-b.distance)[0];
 if(local&&local.distance<620)return{label:local.label,detail:local.detail,id:local.id};
 const building=HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId===levelId).map(b=>({b,distance:Math.hypot(point.x-b.x,point.y-b.y)})).sort((a,b)=>a.distance-b.distance)[0];
 if(building&&building.distance<680)return{label:'Parvis · '+building.b.label,detail:'Le seuil du bâtiment se rejoint à pied. Les meubles de devanture restent hors de son approche.',id:'frontage:'+building.b.id};
 return{label:homeworldLevelV77(levelId).name,detail:'Les rues et passages publics relient les quartiers de la cité.',id:'floor:'+levelId};
}
