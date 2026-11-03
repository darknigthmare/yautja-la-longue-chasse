import {HOMEWORLD_INTERIORS_V64} from './homeworldInteriorsV64';
import {HOMEWORLD_BUILDINGS} from './homeworldCity';
import {HOMEWORLD_FURNITURE_ART_V72,homeworldFurnitureFootprintV72} from './homeworldFurnitureV72';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';

/** Public records are derived from the same 37 live floor plans as navigation.
 * Original fittings are never advertised as canonical customs or new rewards. */
export const HOMEWORLD_SECONDARY_INTERIOR_CODEX_V74:readonly HomeworldElementRecordV64[]=HOMEWORLD_INTERIORS_V64.filter(room=>room.secondaryLayoutV74).flatMap(room=>{
  const building=HOMEWORLD_BUILDINGS.find(candidate=>candidate.id===room.buildingId)!;
  const layout=room.secondaryLayoutV74!;
  const common={districtId:building.districtId,spaceId:room.buildingId,lore:layout.lore,door:null,source:[
    {label:'RPG Maker · intérieurs',url:'https://rpgmakerweb.com/blog/tutorial-mapping-interior',note:'Enveloppe, fonction des pièces, accès et mobilier ; inspiration de conception uniquement.'},
    {label:'RPG Maker · villes',url:'https://www.rpgmakerweb.com/blog/mapping-towns',note:'Desserte et identité des lieux ; aucun usage domestique yautja canonique n’en est déduit.'},
  ]};
  return [
    {...common,id:'v74-layout:'+room.buildingId,label:room.title,category:'interior' as const,
      position:{x:0,y:0,z:0},dimensions:{width:room.width,depth:room.depth,height:building.wallHeight},
      footprint:{left:0,right:room.width,top:0,bottom:room.depth},asset:null,
      constraints:[layout.purpose,'Plan original '+layout.archetype+'. Façade, enveloppe et seuil existants conservés.',
        room.portComplexV84?`${room.zones!.length} espaces, ${room.partitions!.length} écrans/parois et ${layout.passages.length} traversées composées V84 ; corps et rendu de ce nouveau plan non vérifiés.`:
          `${room.zones!.length} espaces, ${room.partitions!.length} écrans/parois et ${layout.passages.length} passages ; tous reliés à pied avec le corps entier du protagoniste.`,
        'Aucune récompense, soin, arme, rang ou nouveau service accordé par l’entrée. Les logements ne créent aucun point d’interaction.']},
    ...room.partitions!.map(wall=>({...common,id:'v74-partition:'+wall.id,label:'Paroi en coupe · '+room.title,category:'panel' as const,
      position:{x:wall.x,y:wall.y,z:0},dimensions:{width:wall.width,depth:wall.depth,height:wall.cutawayHeight},
      footprint:{left:wall.x,right:wall.x+wall.width,top:wall.y,bottom:wall.y+wall.depth},asset:'/game/homeworld/v64/interior-panels.png',
      constraints:['Paroi basse en coupe, module PNG natif masqué à longueur utile, sans étirement.',
        'Même rectangle au sol dans le dessin et la collision du corps entier.',
        'Les ouvertures de ce plan sont décrites dans leurs propres fiches, sans inventer des portes communes à toutes les maisons.']})),
    ...room.zones!.map(zone=>({...common,id:'v74-zone:'+zone.id,label:zone.label,category:'interior' as const,
      position:{x:zone.x,y:zone.y,z:0},dimensions:{width:zone.width,depth:zone.depth,height:building.wallHeight},
      footprint:{left:zone.x,right:zone.x+zone.width,top:zone.y,bottom:zone.y+zone.depth},asset:null,
      constraints:[room.portComplexV84?'Espace public composé dans le runtime V84, à vérifier visuellement et avec le corps entier.':'Espace fonctionnel réellement visitable dans l’enveloppe de ce bâtiment.',
        'Travée ouverte ou alcôve selon le plan ; une limite de zone seule n’ajoute aucun mur invisible.',
        'Aménagement original de cette cité, non présenté comme une coutume universelle de l’espèce.']})),
    ...layout.passages.map(passage=>({...common,id:'v74-passage:'+passage.id,label:'Passage · '+room.title,category:room.portComplexV84?'floor' as const:'door' as const,
      position:{x:passage.x,y:passage.y,z:0},dimensions:{width:passage.orientation==='horizontal'?passage.width:10,depth:passage.orientation==='vertical'?passage.width:10,height:128},
      footprint:null,door:room.portComplexV84?null:{threshold:{x:passage.x,y:passage.y},approach:{x:passage.x+(passage.orientation==='vertical'?36:0),y:passage.y+(passage.orientation==='horizontal'?36:0)},clearWidth:passage.width,clearHeight:128},asset:null,
      constraints:[room.portComplexV84?`Repère de traversée ${passage.orientation} de ${passage.width} unités de composition ; aucun seuil ou plancher physique ajouté.`:
          `Ouverture ${passage.orientation==='horizontal'?'sur l’axe est-ouest':'sur l’axe nord-sud'} de ${passage.width} unités entre les parois réelles.`,
        'Passage libre sans portail de téléportation ni action de déblocage.',
        room.portComplexV84?'V84 implémentée, non vérifiée : aucune largeur libre effective ou recette corporelle de ce nouveau plan certifiée.':'Largeur utile testée avec l’empreinte corporelle et les vrais meubles adjacents.']})),
    ...room.furniture!.map(item=>{
      const art=HOMEWORLD_FURNITURE_ART_V72[item.artId],scale=item.scale??1;
      return {...common,id:'v74-furniture:'+item.id,label:item.artId+' · '+room.title,category:'prop' as const,
        position:{x:item.x,y:item.y,z:0},dimensions:{width:art.footprintWorld.width*scale,depth:art.footprintWorld.depth*scale,height:art.heightWorld*scale},
        footprint:homeworldFurnitureFootprintV72(item),asset:art.src,
        constraints:[art.lore,`Échelle uniforme ${scale}; cellule native ${JSON.stringify(art.sourceRect)}; pivot avant ${JSON.stringify(art.pivot)}; SHA256 ${art.sha256}.`,
          'Module raster indépendant ; projection appliquée une fois par le renderer, sans déformer sa silhouette.',
          'Empreinte solide à l’arrière du pivot ; aucun objet récupérable ni service implicite.']};
    }),
  ];
});
