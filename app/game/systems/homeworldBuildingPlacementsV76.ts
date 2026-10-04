/** Native angled volumes need genuine forecourt clearance. Stable building,
 * room and service IDs stay intact; no coordinate is stored in campaign saves.
 * Five measured placements preserve the authored citizen routes, regional
 * corridors and neighboring solid houses, without weakening useful scale. */
export const HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76:Readonly<Record<string,{x:number;y:number;reason:string}>>={
  'dock-control':{x:-110,y:20,reason:'Passage conservé entre les deux routines du port, ancien signe des Cendres et maisons du quai.'},
  'trophy-mausoleum':{x:-240,y:-50,reason:'Libération de la promenade des archives, du porteur de l’esplanade et de la route vers les Ruines.'},
  'rite-sanctum':{x:330,y:-191,reason:'V81 : le Conseil natif occupe une parcelle soutenue dans la galerie haute ; son parvis et les annexes domestiques restent distincts.'},
  'convoy-workshop':{x:120,y:-40,reason:'Balise de sol QUAIS dégagée avec la marge corporelle du guidage, et routine de manutention libre autour du vrai socle oblique.'},
  'convoy-store':{x:-20,y:-60,reason:'Allée de la messagère des convois libre devant la réserve orientée et ses deux meubles.'},
  'residence-terraces-4':{x:0,y:-50,reason:'V81 : alcôve de la traverse occidentale, rupture de la baseline du cercle et seuil à l’écart de l’entraînement.'},
  'residence-enforcers-1':{x:60,y:15,reason:'V81 : annexe de relève adossée au bastion, dégagement de la galerie des preuves conservé.'},
  'residence-citadel-1':{x:-50,y:65,reason:'V81 : annexe de l’audience en retrait de l’axe cérémoniel et de la future pyramide.'},
  'residence-undercity-1':{x:80,y:45,reason:'V81 : aile orientale de la galerie basse ; la façade suit la poche habitée plutôt que la baseline du refuge.'},
  'residence-memory-1':{x:60,y:25,reason:'V81 : aile de la cour des scribes ; passage de service et accès au registre restent distincts.'},
  'residence-arenas-1':{x:45,y:20,reason:'V81 : logement du cercle à l’angle de la ruelle haute ; la traverse nord conserve128u entre les deux fondations.'},
  'residence-market-1':{x:0,y:55,reason:'V81 : profondeur du petit îlot marchand, entrée domestique séparée de la halte clients.'},
  'residence-convoy-works-2':{x:35,y:-35,reason:'V81 : logement technique ramené contre la travée de service, hors boucle des convoyeurs.'},
  'residence-forges-1':{x:-130,y:-80,reason:'V81 : parcelle oblique de l’artisan remontée contre la terrasse ;112u entre les fondations des maisons et grande forge dégagée.'},
  'residence-undercity-2':{x:-160,y:0,reason:'V81 : aile du refuge déplacée vers le revers occidental ;136u de passage entre les fondations natives.'},
  'residence-convoy-works-1':{x:-150,y:0,reason:'V81 : façade d’entretien contre le quai ouest ; aire de service dégagée devant l’abri sud.'},
  'residence-market-2':{x:200,y:25,reason:'V81 : maison du marchand dans l’alcôve orientale ;138u entre les deux fondations et134u vers la forge.'},
  'residence-esplanade-2':{x:150,y:-65,reason:'V81 : logement de la promenade tourné vers son parvis, éloigné du passage du porteur de prises et du meuble de repos.'},
  'residence-clans-1':{x:150,y:0,reason:'V81 : maison des délégations dans la cour orientale ; ancienne traverse du coursier libérée.'},
};
