import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';
import {HOMEWORLD_CIVILIAN_MOTION_V74} from './homeworldCivilianMotionV74';
import type {HomeworldCivilianRoleV72} from './homeworldIdentityV72';
const labels:Record<HomeworldCivilianRoleV72,string>={chief:'Chef local',artisan:'Artisane',healer:'Soignante',archivist:'Archiviste',guard:'Garde civil',courier:'Courrier',instructor:'Maître instructeur',apprentice:'Apprenti','dock-officer':'Officier du quai','forge-master':'Maîtresse de forge',witness:'Témoin des galeries',herald:'Héraut','arena-steward':'Intendant de l’arène','rite-keeper':'Gardienne des rites'};
/** Source-animation parents. They are not fictitious fixed citizens at world0,0.
 * The population's separate records carry real routes and phase0 coordinates. */
export const HOMEWORLD_CIVILIAN_MOTION_CODEX_V74:HomeworldElementRecordV64[]=Object.values(HOMEWORLD_CIVILIAN_MOTION_V74.roles).map(actor=>{
  const frames=[...actor.clips.right,...actor.clips.left],ids=[...new Set(frames.map(f=>f.sourceId))];
  return {id:`civilian-motion-v74:${actor.role}`,label:`Marche civique · ${labels[actor.role as HomeworldCivilianRoleV72]}`,category:'npc',districtId:'',spaceId:'animation-library-v74',position:{x:0,y:0,z:0},
    dimensions:{width:Math.max(...frames.map(f=>f.alphaBounds.width))*actor.heightWorld/actor.nativeHeight,depth:20,height:actor.heightWorld},footprint:null,door:null,lore:'original-adaptation',
    asset:HOMEWORLD_CIVILIAN_MOTION_V74.sources[ids[0] as keyof typeof HOMEWORLD_CIVILIAN_MOTION_V74.sources].src,
    source:[{label:'OpenAI · PNG natif V74',url:'',note:'Costumes originaux du clan adaptés des portraits V72 ; aucune institution universelle canonique affirmée.'},
      {label:'Animation Mentor · cycle de marche',url:'https://www.animationmentor.com/blog/tutorial-animating-human-walk-cycle/',note:'Référence des phases de locomotion seulement, pas une référence de lore.'}],
    constraints:['Fiche parente de source d’animation, origine locale de bibliothèque ; aucune apparition au point0,0 dans la ville.',
      'Quatre dessins natifs droite et quatre gauche ; pas de miroir CSS pendant la marche. Portrait V72 conservé au repos et pour les habitants nommés.',
      'PARTIAL_ART : quatre poses stylisées fonctionnelles ; l’alternance anatomique de la jambe proche et éloignée n’est pas artistiquement certifiée pour tous les rôles. Ne pas annoncer quatorze cycles de marche finalisés.',
      `Hauteur native constante ${actor.nativeHeight}px pour ce rôle ; hauteur monde ${actor.heightWorld}u. Appui au même point sol pour chaque phase, sans étirement selon alpha.`,
      'Corps visuel de la populace non bloquant, aucune collision créée. Trajets, fonctions, accès et dialogues V68/V69 inchangés.',
      'Horloge de ville et phaseSeconds existants ; pause fige la case. Cadence ajustée à la vitesse existante, quatre poses clés sans prétendre à un solveur de pieds IK.',
      ...ids.map(id=>{const s=HOMEWORLD_CIVILIAN_MOTION_V74.sources[id as keyof typeof HOMEWORLD_CIVILIAN_MOTION_V74.sources];return `PNG préservé ${s.src}, ${s.sourceWidth}×${s.sourceHeight}, SHA256 ${s.sha256}.`;}),
      ...frames.map(f=>`${f.row%2===0?'droite':'gauche'} case${f.col}: fenêtre ${JSON.stringify(f.sourceRect)}, alpha ${JSON.stringify(f.alphaBounds)}, pivot ${JSON.stringify(f.pivot)}.`)]};
});
