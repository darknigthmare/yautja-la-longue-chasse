/** Native angled volumes need genuine forecourt clearance. Stable building,
 * room and service IDs stay intact; no coordinate is stored in campaign saves.
 * Five measured placements preserve the authored citizen routes, regional
 * corridors and neighboring solid houses, without weakening useful scale. */
export const HOMEWORLD_BUILDING_PLACEMENT_OFFSETS_V76:Readonly<Record<string,{x:number;y:number;reason:string}>>={
  'dock-control':{x:-110,y:20,reason:'Passage conservé entre les deux routines du port, ancien signe des Cendres et maisons du quai.'},
  'trophy-mausoleum':{x:-240,y:-50,reason:'Libération de la promenade des archives, du porteur de l’esplanade et de la route vers les Ruines.'},
  'rite-sanctum':{x:200,y:-60,reason:'Dégagement des trois habitants du temple et du patrouilleur des arènes, sans déplacer leur routine.'},
  'convoy-workshop':{x:120,y:-40,reason:'Balise de sol QUAIS dégagée avec la marge corporelle du guidage, et routine de manutention libre autour du vrai socle oblique.'},
  'convoy-store':{x:-20,y:-60,reason:'Allée de la messagère des convois libre devant la réserve orientée et ses deux meubles.'},
};
