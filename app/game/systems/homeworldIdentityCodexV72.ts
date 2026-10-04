import {HOMEWORLD_INTERIORS_V64} from './homeworldInteriorsV64';
import {HOMEWORLD_BUILDINGS} from './homeworldCity';
import {HOMEWORLD_FURNITURE_ART_V72,homeworldFurnitureFootprintV72} from './homeworldFurnitureV72';
import {homeworldBuildingIdentityV72} from './homeworldIdentityV72';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
/** Additional codex entries are derived from the exact furniture/partition models.
 * None of these fittings is a reward or an implicitly available service. */
export const HOMEWORLD_IDENTITY_CODEX_V72:readonly HomeworldElementRecordV64[]=HOMEWORLD_INTERIORS_V64.filter(room=>homeworldBuildingIdentityV72(room.buildingId)!==null).flatMap(room=>{
  const building=HOMEWORLD_BUILDINGS.find(b=>b.id===room.buildingId)!;
  const common={districtId:building.districtId,spaceId:room.buildingId,lore:'original-adaptation' as const,door:null,source:[
    {label:'RPG Maker · intérieurs',url:'https://rpgmakerweb.com/blog/tutorial-mapping-interior',note:'Fonction des pièces, enveloppe extérieure, accès et mobilier. Inspiration mécanique seulement.'},
    {label:'RPG Maker · villes',url:'https://www.rpgmakerweb.com/blog/mapping-towns',note:'Repères visuels par fonction, seuil et desserte. Aucun canon yautja déduit.'},
  ]};
  return [
    ...(room.partitions??[]).map(wall=>({...common,id:'v72-partition:'+wall.id,label:'Paroi en coupe · '+room.title,category:'panel' as const,
      position:{x:wall.x,y:wall.y,z:0},dimensions:{width:wall.width,depth:wall.depth,height:wall.cutawayHeight},
      footprint:{left:wall.x,right:wall.x+wall.width,top:wall.y,bottom:wall.y+wall.depth},asset:'/game/homeworld/v64/interior-panels.png',
      constraints:['Empreinte physique complète contrôlée par le déplacement intérieur.','Mur bas en coupe avec module natif réemployé, sans étirement.',room.publicComplexV83
        ?`${room.publicComplexV83.passages.length} traversées authored desservent cinq zones fonctionnelles ; état V83 implémenté, non vérifié.`
        :room.monumentLayoutV81
        ?`${room.monumentLayoutV81.passages.length} passages de 200 unités relient ${room.zones?.length??0} espaces publics du complexe monumental V81.`
        :'Deux passages distincts de 112 unités relient les trois espaces publics.']})),
    ...(room.zones??[]).map(zone=>({...common,id:'v72-zone:'+zone.id,label:zone.label,category:'interior' as const,
      position:{x:zone.x,y:zone.y,z:0},dimensions:{width:zone.width,depth:zone.depth,height:building.wallHeight},
      footprint:{left:zone.x,right:zone.x+zone.width,top:zone.y,bottom:zone.y+zone.depth},asset:null,
      constraints:[room.publicComplexV83?'Zone publique composée V83 dans la même enveloppe ; trajet et rendu de ce lot non vérifiés.':'Zone visitable dans la même enveloppe, reliée à pied.','Plan de l’aile publique uniquement : les appartements et étages privés ne sont pas simulés.','Fonction locale originale ; aucun accès, arme ou rang gratuit.']})),
    ...(room.furniture??[]).map(item=>{const art=HOMEWORLD_FURNITURE_ART_V72[item.artId],scale=item.scale??1;return {...common,id:'v72-furniture:'+item.id,label:item.artId+' · '+room.title,category:'prop' as const,
      position:{x:item.x,y:item.y,z:0},dimensions:{width:art.footprintWorld.width*scale,depth:art.footprintWorld.depth*scale,height:art.heightWorld*scale},
      footprint:homeworldFurnitureFootprintV72(item),asset:art.src,constraints:[art.lore,`Échelle uniforme ${scale}; pivot avant natif ${JSON.stringify(art.pivot)}; SHA256 ${art.sha256}.`,
        'Même empreinte pour dessin et collision ; le rectangle s’étend derrière le pivot au sol.','Mobilier indépendant non collectable et sans récompense implicite.']};}),
  ];
});
