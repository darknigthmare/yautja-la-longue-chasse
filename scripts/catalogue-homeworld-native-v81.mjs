import fs from 'node:fs/promises';
import {measureNativeV81} from './measure-homeworld-native-v81.mjs';

const file='app/game/data/homeworldNativeArchitectureV81.json';
const catalogue=JSON.parse(await fs.readFile(file,'utf8'));
const records=[
 {id:'industrial-residence-right',title:'Foyer des ateliers',role:'industrial-residence',width:480,depth:340,
  source:'exec-a38e1103-36bb-472f-b3d7-dd238fe30494.png',threshold:{x:488,y:962},
  foundationFront:{left:25,right:970,y:1108},doorway:{x:324,y:632,width:310,height:330},
  groundFrame:{frontLeft:{x:25,y:904},frontRight:{x:970,y:1108},doorLeft:{x:327,y:930},doorRight:{x:641,y:997},doorClearHeightPixels:330,yawDegrees:20.6},
  groundSupportPixelsV81:[{x:25,y:904},{x:970,y:1108},{x:1390,y:935},{x:650,y:738}]},
 {id:'distant-city-terraces',title:'Terrasses de la cité distante',role:'non-playable-background-city',width:0,depth:0,source:'exec-7f5b2b23-5e9a-4704-bede-ce8aae1c29e8.png'},
 {id:'basalt-city-foundation',title:'Fondation du canyon de basalte',role:'non-solid-visible-support',width:0,depth:0,source:'exec-eb698b3f-893b-41ed-a6b6-0c12dbef8b1d.png'},
 {id:'prime-sky',title:'Ciel des trois soleils',role:'opaque-far-sky',width:0,depth:0,source:'exec-05273587-a3b0-401d-afdf-8651d4a5eb9e.png'},
 {id:'spaceport-gantry',title:'Grue de maintenance du quai',role:'logistics-landmark',width:0,depth:0,source:'exec-9c82b330-1ad1-4edb-b788-717c6bb96114.png'},
 {id:'council-hall-left',title:'Conseil des Anciens · galerie des clans',role:'council-public-complex',width:850,depth:500,
  source:'exec-5e4afe67-cacb-40c6-af00-fcfa66904609.png',threshold:{x:1008,y:796},
  foundationFront:{left:618,right:1480,y:912},doorway:{x:951,y:475,width:109,height:321},
  groundFrame:{frontLeft:{x:618,y:912},frontRight:{x:1480,y:740},doorLeft:{x:955,y:800},doorRight:{x:1060,y:779},doorClearHeightPixels:300,yawDegrees:-19.2},
  groundSupportPixelsV81:[{x:24,y:731},{x:579,y:944},{x:1510,y:733},{x:976,y:535}]},
 {id:'clan-residence-left',title:'Maison des hôtes du clan',role:'civilian-residence',width:400,depth:300,
  source:'exec-077f9291-dab1-4377-9652-9e97a6a8abd1.png',threshold:{x:985,y:778},
  foundationFront:{left:495,right:1510,y:973},doorway:{x:865,y:365,width:240,height:413},
  groundFrame:{frontLeft:{x:495,y:973},frontRight:{x:1510,y:731},doorLeft:{x:863,y:803},doorRight:{x:1118,y:744},doorClearHeightPixels:410,yawDegrees:-22.6},
  groundSupportPixelsV81:[{x:18,y:619},{x:495,y:973},{x:1510,y:731},{x:1180,y:557}]},
 ...['paving-civic','paving-council','paving-undercity'].map(id=>({id,title:id,role:'opaque-ground-material',width:0,depth:0,source:id==='paving-civic'?'exec-b0c7e9b2-6961-4c30-8068-9a21c98eb927.png':id==='paving-council'?'exec-7dda2a14-7761-496f-b667-0312134664ec.png':'exec-91140533-d1de-4149-8576-8e067c11f896.png'})),
];
for(const spec of records){
 const m=await measureNativeV81('public/game/homeworld/v81/'+spec.id+'.png',spec.id==='prime-sky'||spec.id.startsWith('paving-'));
 const art={src:'/game/homeworld/v81/'+spec.id+'.png',sourceWidth:m.sourceWidth,sourceHeight:m.sourceHeight,
  alphaBounds:m.alphaBounds,...(spec.width?{opaqueRowsV76:m.opaqueRowsV76}:{}),
  foundationFront:spec.foundationFront??{left:m.alphaBounds.x,right:m.alphaBounds.x+m.alphaBounds.width,y:m.alphaBounds.y+m.alphaBounds.height-1},
  threshold:spec.threshold??{x:m.sourceWidth/2,y:m.alphaBounds.y+m.alphaBounds.height-1},
  doorway:spec.doorway??{x:0,y:0,width:0,height:0},footprintWorld:{width:spec.width,depth:spec.depth},wallHeightWorld:spec.width?m.alphaBounds.height*.46:0,
  ...(spec.groundFrame?{groundFrame:spec.groundFrame}:{}),sha256:m.sha256,
  ...(spec.groundSupportPixelsV81?{groundSupportPixelsV81:spec.groundSupportPixelsV81}:{}),
  measurementStatus:spec.width?'VISUAL_NATIVE_JAMBS_AND_ORIENTED_FRONT_SUPPORT;CONSERVATIVE_PHYSICAL_ENVELOPE':'NON_PLAYABLE_NATIVE_BACKGROUND_NO_COLLIDER'};
 const {opaqueRowsV76,...summary}=m;
 catalogue.assets[spec.id]={title:spec.title,role:spec.role,width:spec.width,depth:spec.depth,art,lore:'LORE_COMPATIBLE_ORIGINAL',
  measurement:{...summary,sourceOriginal:spec.source,tool:'OpenAI-built-in-imagegen',animation:'static-native-pixels; no action clip',
   geometry:spec.width?'Human-observed native support and open passage; same art consumed by physical foundation and renderer.':'Separate distant/scenery layer, not a new visitable building or physical prop.'}};
}
catalogue.buildings['residence-forges-1']='industrial-residence-right';
catalogue.buildings['residence-undercity-2']='industrial-residence-right';
catalogue.buildings['residence-convoy-works-1']='industrial-residence-right';
catalogue.buildings['rite-sanctum']='council-hall-left';
for(const id of ['residence-esplanade-2','residence-clans-1','residence-market-2','residence-terraces-1']) catalogue.buildings[id]='clan-residence-left';
await fs.writeFile(file,JSON.stringify(catalogue,null,2)+'\n');
console.log(JSON.stringify({assets:Object.keys(catalogue.assets),buildings:catalogue.buildings}));
