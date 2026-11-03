import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const compiled = await build({ stdin: { contents: "export * from './app/game/systems/homeworldRegionsV68';export * from './app/game/systems/homeworldGeometryV64';export * from './app/game/systems/homeworldArtV64';", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const themes = [
  ['Tri des charges cendrées', 'Réglage des balises', 'Mémoire des convois', 'Entretien des réserves', 'Les porteurs protègent les charges du souffle de cendres. Les coffrets sont fermés avant chaque départ.'],
  ['Tour des citernes', 'Inspection des conduits', 'Transmission des routes', 'Réserve du soir', 'Le Peuple des Citernes répartit les réserves avant les traversées. Le relevé des conduits distingue une fuite du passage du fouisseur.'],
  ['Ancrages des treuils', 'Inspection des charges', 'Lecture des écorces', 'Relève des hauteurs', 'Les charges montent par les treuils. Un ancrage entretenu ne devient pas un trophée ; les aspirants restent avec leurs maîtres.'],
  ['Relevé des crues', 'Entretien des socles', 'Observation des racines', 'Réserve hors des eaux', 'Les familles gardent les réserves sur les socles secs. Les veilleuses comparent la hauteur des eaux aux marques conservées.'],
  ['Réglage des lests', 'Inspection des harnais', 'Récit des traversées', 'Relève des guetteurs', 'Une traversée attend une accalmie. Les harnais et les lests passent entre plusieurs mains avant qu’un convoi quitte le refuge.'],
  ['Table des marées', 'Inspection des amarres', 'Lecture des algues', 'Réserve de la corniche', 'Les départs suivent les marques de marée. Les demeures restent au-dessus du ressac ; les charges descendent vers les quais séparés.'],
  ['Relevé des conduites', 'Réglage des outils', 'Tri des matériaux', 'Relève de la galerie froide', 'Les instruments rejoignent les poches fraîches après les relevés. Personne ne range une réserve familiale dans la galerie d’un foyer.'],
  ['Préparation des réserves', 'Inspection des joints', 'Lecture des routes enneigées', 'Relève des abris', 'Les joints sont vérifiés avant les départs. Les réserves restent sous abri et les cordes sont séchées avant une nouvelle traversée.'],
  ['Inventaire des fragments', 'Inspection des socles', 'Transmission des récits', 'Veille des archives', 'Le camp consigne les fragments sans déplacer les sépultures. Une copie accompagne le relevé ; l’original reste attribué à son lieu.'],
  ['Inventaire des caisses scellées', 'Réglage des signaux', 'Relève des observateurs', 'Réserve du poste extérieur', 'Les routines restent à l’extérieur des enclos. Les caisses sont inventoriées sans ouvrir un sas ni faire sortir une créature importée.'],
];
const artSets = [
  ['chest','beacon','locker','workshop'], ['chest','console','beacon','table'],
  ['rock-plant','chest','beacon','bench'], ['rock-plant','chest','beacon','locker'],
  ['beacon','locker','chest','bench'], ['chest','beacon','locker','table'],
  ['workshop','locker','chest','beacon'], ['locker','chest','bench','beacon'],
  ['console','table','chest','beacon'], ['locker','console','beacon','chest'],
];
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return distance(p,{x:a.x+t*dx,y:a.y+t*dy});};
const villages=api.HOMEWORLD_REGION_IDS_V68.map((regionId,index)=>{
  const definition=api.HOMEWORLD_REGIONS_V68[regionId], routes=[], residents=[];
  const doors=definition.buildings.map(api.homeworldBuildingDoorwayV64);
  const safe=p=>p.x<3950 && api.isHomeworldRegionWalkableV68(regionId,'village',p,0) && doors.every(d=>distance(p,d.approach)>120)
    && definition.residents.every(n=>n.route.length>1?segmentDistance(p,n.route[0],n.route.at(-1))>78:distance(p,n)>95)
    && distance(p,{x:520,y:2800})>130;
  const line=(a,b)=>{const count=Math.ceil(distance(a,b)/12);return Array.from({length:count+1},(_,i)=>({x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count})).every(p=>safe(p)&&routes.every(([a,b])=>segmentDistance(p,a,b)>86));};
  const candidates=[];for(let y=420;y<3730;y+=45)for(let x=360;x<3990;x+=45)if(safe({x,y}))candidates.push({x,y});
  const stations=['place-table','workshop','garden-b','storage'].map(id=>definition.props.find(p=>p.id===id));
  const scenes=stations.map((p,n)=>({id:`${regionId}-scene-${n+1}`,name:themes[index][n],x:p.x,y:p.y,description:themes[index][4],nativeStation:p.id}));
  const anchors=[...stations,...definition.buildings.filter(b=>b.role==='residence').slice(0,5).map(b=>({x:b.x+240,y:b.y+160}))];
  for(let n=0;n<18;n++){
    const anchor=anchors[Math.floor(n/2)%anchors.length], ordered=candidates.slice().sort((a,b)=>distance(a,anchor)-distance(b,anchor));
    let path=null;
    for(const a of ordered){for(const offset of [{x:0,y:220},{x:220,y:0},{x:0,y:-220},{x:-220,y:0},{x:150,y:150},{x:-150,y:150}]){const b={x:a.x+offset.x,y:a.y+offset.y};if(line(a,b)){path=[a,b];break;}}if(path)break;}
    assert(path,`${regionId}: resident ${n} has a clear whole-body local routine`);routes.push(path);
    const young=n===12||n===13,morphId=young?'young':n%5===0?'elder':n%2?'huntress':'classic';
    const sceneId=n<8?scenes[Math.floor(n/2)].id:null;
    const role=n<8?['Porteur des réserves','Artisane des conduits','Conservateur local','Veilleuse de relève'][Math.floor(n/2)]:young?'Aspirant accompagné':n>=16?'Accompagnateur des aspirants':n>=14?'Visiteur du clan':'Habitant des demeures';
    residents.push({id:`${regionId}-life-${n+1}`,name:['Kha’len','Nesh’ta','Vhar’esh','Osh’ra','Tor’vek','Sha’len'][n%6]+` ${index+1}-${Math.floor(n/6)+1}`,role,morphId,dreadStyleId:morphId==='elder'?'elder':morphId==='huntress'?'huntress':'classic',skinId:(index+n)%3===2?'dark-mottle':'ochre-mottle',dreadTintId:index%2?'umber':'obsidian',sceneId,path,speed:n<8?24+n%3*5:young?20:32,dwellSeconds:n<8?7+n%3*3:4+n%4,phaseSeconds:n*7+index*3,greeting:sceneId?`${scenes.find(s=>s.id===sceneId).name}. ${themes[index][4]}`:young?'Notre accompagnateur vérifie le parcours avant de quitter les demeures. Les sorties autonomes attendent la reconnaissance du clan.':`${themes[index][4]} Les services de la halte restent ouverts aux voyageurs qui respectent ces chemins.`});
  }
  const buildings=[...definition.buildings.filter(b=>b.role==='residence'),definition.buildings.find(b=>b.role==='forge')];
  const props=buildings.flatMap((b,n)=>[-1,1].map((side,k)=>{
    const door=api.homeworldBuildingDoorwayV64(b),maximumWidth=(b.width-door.clearWidth)/2-25;
    const preferred=artSets[index][(n+k)%4],artId=api.HOMEWORLD_PROP_ART_V64[preferred].footprintWorld.width<=maximumWidth?preferred:artSets[index].find(id=>api.HOMEWORLD_PROP_ART_V64[id].footprintWorld.width<=maximumWidth);
    assert(artId,'Native ledge object fits beside the actual painted doorway');
    const art=api.HOMEWORLD_PROP_ART_V64[artId],foot=api.homeworldBuildingFootprintV64(b),x=b.x+side*(b.width/2-art.footprintWorld.width/2-10),y=b.y-12;
    assert(x-art.footprintWorld.width/2>=foot.left && x+art.footprintWorld.width/2<=foot.right && y-art.footprintWorld.depth>=foot.top && y<=foot.bottom,'Adornment lies entirely inside the existing solid foundation');
    assert(Math.abs(x-b.x)-art.footprintWorld.width/2>door.clearWidth/2+14,'Painted doorway retains a clear visual passage');
    return{id:`${regionId}-life-prop-${n*2+k+1}`,artId,x,y,depth:b.y+1,buildingId:b.id,socket:'front-foundation-ledge',collisionPolicy:'existing-building-footprint',sceneId:n===8?scenes[1].id:null};
  }));
  return{regionId,residents,scenes,props};
});
const data={version:1,release:'V69',units:'V68 physical ground coordinates',savePolicy:'Derived local routines only. V68 checkpoints and evidence schema unchanged. No new collider replaces a formerly accessible saved position.',villages};
await writeFile('app/game/data/homeworldVillageLifeV69.json',JSON.stringify(data,null,2)+'\n');
await writeFile('docs/v69-homeworld-village-life-codex.json',JSON.stringify({...data,projection:api.HOMEWORLD_GEOMETRY_V64,nativeProps:Object.fromEntries(Object.entries(api.HOMEWORLD_PROP_ART_V64).map(([id,art])=>[id,art])),limits:['Existing registered body bitmaps translate along real ground paths; this is not a new full-body walking or tool-use atlas.','Original compatible fan-game communities, not canonically mapped 1:1 villages.','Twenty-five ordinary subzones and fifteen Elite territories remain outside this density delivery.']},null,2)+'\n');
console.log(JSON.stringify({villages:villages.length,residents:villages.reduce((n,v)=>n+v.residents.length,0),scenes:villages.reduce((n,v)=>n+v.scenes.length,0),props:villages.reduce((n,v)=>n+v.props.length,0)}));
