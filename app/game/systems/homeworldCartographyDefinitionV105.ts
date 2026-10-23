import {HOMEWORLD_CARTOGRAPHY_V104,HOMEWORLD_CARTOGRAPHY_LINES_V104,HOMEWORLD_CARTOGRAPHY_SOURCE_V104} from './homeworldCartographyDefinitionV104';

/** Local staging of V6 option A on the already playable public viaduct.
 * This is a measured comparison of two known objects, not a revealed district. */
export const HOMEWORLD_CARTOGRAPHY_V105={
 sceneId:HOMEWORLD_CARTOGRAPHY_V104.sceneId,routeId:'port-high-viaduct-v105',option:'A',
 post:HOMEWORLD_CARTOGRAPHY_V104.post,connectorId:'council-stair',
 lower:{x:4500,y:2900},upper:{x:4500,y:2720},
 highPoint:{x:6580,y:3440},highLevel:'+1',radius:64,
 landmarks:[
  {id:'street-v92:port-registers:basalt-planter-left',label:'Bac de basalte du registre',x:6130,y:4930,levelId:'0'},
  {id:'urban-v81:port-4:light',label:'Lampe de la cour du registre',x:6280,y:5180,levelId:'0'},
 ],
} as const;
const source=HOMEWORLD_CARTOGRAPHY_SOURCE_V104;
const row=source.sheets.find(s=>s.name==='Choix et actions V6')!.rows.find(r=>r.number===806)!;
const cell=(column:string)=>String(row.cells.find(c=>c.address===column+row.number)?.value??'');
export const HOMEWORLD_CARTOGRAPHY_OPTION_V105={option:'A',action:cell('F'),conditions:cell('G'),consequence:cell('H'),address:'Choix et actions V6!A806:I806'} as const;
export const HOMEWORLD_CARTOGRAPHY_LINES_V105=HOMEWORLD_CARTOGRAPHY_LINES_V104.filter(l=>l.option==='A'||['REPRISE','SUCCES','ECHEC'].includes(l.kind));
export function cartographyBearingsV105(){
 return HOMEWORLD_CARTOGRAPHY_V105.landmarks.map(p=>({...p,
  distance:Math.round(Math.hypot(p.x-HOMEWORLD_CARTOGRAPHY_V105.highPoint.x,p.y-HOMEWORLD_CARTOGRAPHY_V105.highPoint.y)),
  bearing:Math.round((Math.atan2(p.x-HOMEWORLD_CARTOGRAPHY_V105.highPoint.x,HOMEWORLD_CARTOGRAPHY_V105.highPoint.y-p.y)*180/Math.PI+360)%360),
 }));
}
