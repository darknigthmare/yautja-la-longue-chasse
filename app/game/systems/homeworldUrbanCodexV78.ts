import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
import {HOMEWORLD_URBAN_PROPS_V78,homeworldUrbanNativePlacementV78} from './homeworldStreetModulesV78';
import {HOMEWORLD_URBAN_GROUND_V78,HOMEWORLD_URBAN_LOTS_V78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_URBAN_EXTRAS_V78,homeworldUrbanExtraRoleV78} from './homeworldUrbanPopulationV78';
import {homeworldCivilianArtV72} from './homeworldIdentityV72';
import {HOMEWORLD_GROUND_ART_V64} from './homeworldArtV64';
import {HOMEWORLD_COURT_ART_V80 as HOMEWORLD_EXTERIOR_ART_V76} from './homeworldCourtArtV80';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import {homeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_FACADES_V78,homeworldUrbanFacadePlacementV78} from './homeworldUrbanFacadesV78';
const bounds=(polygon:readonly {x:number;y:number}[])=>({left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),top:Math.min(...polygon.map(p=>p.y)),bottom:Math.max(...polygon.map(p=>p.y)),polygon});
const common={spaceId:'world',door:null,lore:'original-adaptation' as const};
export const HOMEWORLD_URBAN_CODEX_V78:readonly HomeworldElementRecordV64[]=[
 ...HOMEWORLD_URBAN_FACADES_V78.map(facade=>{
  const measured=homeworldUrbanFacadePlacementV78(facade),b=bounds(measured.footprint);
  return{...common,id:facade.id,label:facade.label,category:'building' as const,districtId:facade.districtId,
   position:{x:facade.x,y:facade.y,z:measured.elevation},dimensions:{...facade.footprint,height:facade.wallHeight},
   footprint:b,asset:facade.art.src,
   source:[{label:'Façade native originale conservée',url:facade.art.src,note:'SHA256 '+facade.art.sha256+' ; source '+facade.sourceBuildingId+'.'}],
   constraints:['Façade décorative fermée et solide ; aucune porte active, pièce visitable, visite sauvegardée ou service nouveau.',
    'Échelle uniforme '+measured.scale+' ; fondation native entière contenue dans la parcelle. PNG frontal sans rotation ni miroir CSS.',
    'Ouverture peinte '+measured.paintedDoorWidth+'×'+measured.paintedDoorHeight+' ; convention128×80 pour adulte100u conservée.',
    'Image frontale existante de remplacement. Architecture oblique dédiée V78 encore requise ; cette fiche ne certifie pas sa production.',
    'Même empreinte SAT pour le dessin, les collisions, les chemins et la reprise de position V78.']};
 }),
 ...HOMEWORLD_URBAN_PROPS_V78.map(item=>{
  const measured=homeworldUrbanNativePlacementV78(item),b=bounds(measured.polygon),art=HOMEWORLD_EXTERIOR_ART_V76[item.artId];
  return{...common,id:item.id,label:item.label,category:'prop' as const,districtId:item.districtId,
   position:{x:item.x,y:item.y,z:measured.elevation},dimensions:{width:b.right-b.left,depth:b.bottom-b.top,height:Math.max(0,art.heightWorld*item.scale-(b.bottom-b.top)*HOMEWORLD_GEOMETRY_V64.depthScale)},
   footprint:b,asset:art.src,source:[{label:'PNG natif conservé V76',url:art.src,note:'SHA256 '+art.sha256+' ; appuis natifs deprojectés une seule fois.'}],
   constraints:['Échelle uniforme '+item.scale+' ; ni rotation ni miroir CSS.','Groupe '+item.groupId+' ; fonction décorative '+item.function+'.',
    'Solide réel partagé par les collisions V78 et le dessin ; toute base repose sur un sol appartenant au même niveau.',
    'Aucune interaction, visite, récompense ou institution canonique nouvelle.','43 seuils,98routines et raccords existants réservés avec leurs corps complets.']};
 }),
 ...HOMEWORLD_URBAN_GROUND_V78.map(ground=>{
  const b=bounds(ground.polygon);
  return{...common,id:ground.id,label:ground.label,category:'street' as const,districtId:ground.levelId==='-1A'?'undercity':'port',
   position:{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2,z:homeworldLevelV77(ground.levelId).elevation},
   dimensions:{width:b.right-b.left,depth:b.bottom-b.top,height:0},footprint:b,asset:HOMEWORLD_GROUND_ART_V64.src,
   source:[{label:'Dallage natif conservé',url:HOMEWORLD_GROUND_ART_V64.src,note:'Polygone de support V78 additif ; coordonnées au sol.'}],
   constraints:['Niveau physique '+ground.levelId+' ; aucune suppression de terrain V77.','Empreinte de support du sol, pas un mur ou un bloqueur supplémentaire.','Support du corps entier et même polygone pour modèle/rendu ; les anciens murs et volumes restent intacts.']};
 }),
 ...HOMEWORLD_URBAN_EXTRAS_V78.map(extra=>{
  const role=homeworldUrbanExtraRoleV78(extra),art=homeworldCivilianArtV72(role);
  return{...common,id:extra.id,label:'Figurant de cour · '+role,category:'npc' as const,districtId:extra.districtId,
   position:{x:extra.path[0].x,y:extra.path[0].y,z:homeworldLevelV77(extra.levelId).elevation},
   dimensions:{width:48,depth:28,height:100},footprint:null,asset:art.src,
   source:[{label:'Persona originale conservée',url:art.src,note:'Source '+extra.sourceResidentId+' ; costume '+role+' et atlas civil existants.'}],
   constraints:['Trajet propre de48unités hors des98routines existantes, avec corps complet validé.',
    'Figurant non solide comme la population mobile existante, sans service/dialogue ni ajout aux visites sauvegardées.',
    'Pose/horloge natives existantes ; aucune nouvelle planche8directions ou coutume canonique affirmée.']};
 }),
 ...HOMEWORLD_URBAN_LOTS_V78.map(lot=>({
  ...common,id:lot.id,label:'Art oblique dédié à produire · '+lot.label,category:'panel' as const,districtId:'undercity',
  position:{x:(lot.bounds.left+lot.bounds.right)/2,y:(lot.bounds.top+lot.bounds.bottom)/2,z:homeworldLevelV77(lot.levelId).elevation},
  dimensions:{width:lot.bounds.right-lot.bounds.left,depth:lot.bounds.bottom-lot.bounds.top,height:0},footprint:null,asset:null,
  source:[{label:'Concept fourni par le projet',url:'/game/homeworld/v77/reference/homeworld-macro-layout-latest.png',note:'Carte de conception originale, jamais un fond unique ni une topographie canonique1:1.'}],
  constraints:['Illustration oblique dédiée encore requise ; façade frontale native visible de remplacement référencée par '+lot.id+':facade.',
   'Cette réserve de conception n’ajoute aucune collision distincte ; seule la fondation mesurée de la façade visible est solide.',
   'Aucune porte interactive ni nouvel intérieur simulé. Le mobilier reste hors de la parcelle réservée.'],
 })),
];
