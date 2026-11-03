import art from '../data/homeworldFaunaHabitatV77.json';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';
export const HOMEWORLD_FAUNA_HABITAT_ART_V77=art;
export const HOMEWORLD_FAUNA_HABITAT_CODEX_V77:HomeworldElementRecordV64={
  id:art.id,label:'Ressaut basaltique natif · appui des observations',category:'prop',districtId:'fauna-reference',spaceId:'reference:fauna-habitat-v77',
  position:{x:0,y:0,z:0},dimensions:{width:art.sourceWidth,depth:0,height:art.sourceHeight},footprint:null,door:null,
  asset:art.src,lore:'original-adaptation',source:[{label:'Module rocheux OpenAI natif',url:art.src,note:'SHA256 '+art.sha256}],
  constraints:[
    'Module séparé : plateau rocheux et masse de falaise, pas un disque de sol flottant ni une créature peinte dans le décor.',
    'Point source800,278 mesuré visuellement sur le plateau. Largeur peinte350u, une seule échelle ; la profondeur et les hauteurs demeurent une métrologie visuelle, pas une reconstruction3D.',
    'L’image source reste entière, transparente et intacte. Aucun miroir, rotation, découpe de fond ou étirement.',
    'Support de décor extérieur au corridor : aucune extension du terrain praticable, permission, découverte ou récompense.',
    'Les dimensions de cette fiche sont en pixels source ; les placements régionaux sont répertoriés dans leurs propres fiches.',
    'Formation géologique originale pour le jeu ; aucune falaise officielle ou fidélité canonique1:1 revendiquée.',
  ],
};
