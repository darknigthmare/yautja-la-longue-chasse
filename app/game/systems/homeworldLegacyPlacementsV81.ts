/** Absolute per-floor world anchors. Preserved sources keep their IDs,
 * dimensions, colliders and native facing; translated port coordinates must
 * not be translated a second time after an authored world placement. */
export const HOMEWORLD_LEGACY_PROP_PLACEMENTS_V81:Readonly<Record<string,{x:number;y:number;reason:string}>>={
 'connection-furniture-v72:storm-chain:3':{x:4100,y:960,reason:'Caisses préservées sur la poche pavée orientale du Conseil, hors de sa fondation native et des parcours corporels ; source V72, ID, orientation, échelle et collision inchangés.'},
 'life-v69-brazier-citadel':{x:4110,y:1100,reason:'V89 : brasier préservé sur la terrasse réelle de l’acropole,56u après la fondation avant du palais et hors de son axe d’entrée ; la pose source reste archivée, aucun pixel ni volume n’est réduit.'},
 'life-v68-28-1':{x:1400,y:1915,reason:'Halte occidentale de la promenade ; le seuil de la nouvelle maison du clan reste traversable.'},
 'beacon-v64-dock-control':{x:7215,y:3395,reason:'V82 : balise de la traverse des équipages, après la face de chargement du stock scellé.'},
 'beacon-v64-market-armory':{x:1910,y:2900,reason:'V82 : repère à l’angle oriental de la halte, hors du coffre et de la présentation d’équipement.'},
 'beacon-v64-market-canopy':{x:2475,y:2825,reason:'V82 : lumière à la sortie de la ruelle marchande, hors de la face clients et du banc voisin.'},
 'beacon-v64-training-hall':{x:2600,y:1940,reason:'V82 : repère de la voie latérale d’entraînement, pas devant le rack utilisé par le maître.'},
 'beacon-v64-enforcer-bastion':{x:5030,y:2105,reason:'V82 : lumière du bord oriental de la galerie, loin du fret et de la patrouille du bastion.'},
 'beacon-v64-memory-vault':{x:1515,y:1015,reason:'V82 : lumière latérale du registre ; la poche frontale du banc reste libre.'},
 'beacon-v64-pit-gate':{x:1990,y:1180,reason:'V82 : balise dans le raccord occidental du cercle, hors des deux approches des assises.'},
 'beacon-v64-rampart-north-lodge':{x:6105,y:2070,reason:'V82 : balise du retour vers la chaussée du rempart ; vue et approche de l’assise libérées.'},
 'beacon-v64-rampart-watch':{x:6120,y:2930,reason:'V82 : balise au bord droit du parvis natif de la vigie, hors de son dégagement de porte.'},
 'bench-v64-market-armory':{x:1300,y:3085,reason:'V82 : assise de repos dans la halte sud-ouest ; elle ne bloque plus le présentoir d’équipement.'},
 'bench-v64-trophy-mausoleum':{x:530,y:2260,reason:'V82 : halte tournée vers la promenade côtière, après le parvis cérémoniel et son seuil.'},
 'garden-v64-clan-lodge':{x:3770,y:2050,reason:'V82 : bac rocheux au revers oriental du quartier, pas devant le banc de délégation.'},
 'life-v68-26-0':{x:3590,y:3500,reason:'V82 : végétation minérale à la rive occidentale des galeries, hors de la nouvelle maison artisan.'},
 'life-v68-33-1':{x:1490,y:1350,reason:'V82 : petite halte du scribe entre les deux îlots, hors de la manutention du coffre domestique.'},
};

export const HOMEWORLD_LEGACY_EXTERIOR_PLACEMENTS_V82:Readonly<Record<string,{x:number;y:number;reason:string}>>={
 'exterior-v76-009':{x:3845,y:2565,reason:'Rack des matières sur la poche pavée orientale des artisans, hors du socle de la maison du clan et des jarres ; fixture native entière, ID, échelle et volume conservés.'},
 'exterior-v76-010':{x:3840,y:2860,reason:'Jarres de refroidissement à l’écart de la face du banc artisan.'},
 'exterior-v76-011':{x:3750,y:3120,reason:'Fret des ateliers dans une travée séparée du rack de finition.'},
 'exterior-v76-020':{x:1915,y:2295,reason:'Gong dans la halte pavée au nord de la ruelle marchande, hors du couvert et de l’armurerie ; orientation, échelle et contact natifs conservés.'},
 'exterior-v76-021':{x:1600,y:1515,reason:'Jarres dans l’alcôve inter-îlots occidentale, séparées de l’assise du cercle et des seuils de l’esplanade ; fixture native entière conservée.'},
 'exterior-v76-023':{x:3640,y:2586,reason:'Jarres des délégations dans la poche pavée au sud de leur maison, hors de sa fondation et du rack des artisans ; ID, source, échelle et volume inchangés.'},
 'exterior-v76-029':{x:1520,y:1290,reason:'Bac minéral revenu dans la poche du jardin des marques près de son ancrage source, hors de la maison des terrasses et de son mobilier frontal ; orientation gauche et volume natifs conservés.'},
 'exterior-v76-034':{x:1915,y:1044,reason:'Assise du cercle reculée de vingt unités sur son pavement, pour conserver le passage entre sa base native et la maison voisine ; aucune réduction de son volume.'},
 'exterior-v76-040':{x:2990,y:519,reason:'Jarres rituelles dans la poche nord-ouest du sanctuaire sur son vrai étage, hors de la fondation oblique et des patrouilles ; source et collision natives inchangées.'},
 'exterior-v76-042':{x:5120,y:518,reason:'Première lanterne de l’audience sur la rive orientale pavée de l’acropole, après la fondation du palais et hors de la patrouille ; fixture entière conservée.'},
 'exterior-v76-044':{x:2970,y:4485,reason:'Caisses dans la travée orientale du stockage industriel, hors de la face de chargement du rack.'},
 'exterior-v76-058':{x:4805,y:2339,reason:'Lanterne du bastion décalée de trente unités vers le bord oriental de sa desserte, avec le dégagement complet de la maison ; art, échelle et collision conservés.'},
 'exterior-v76-062':{x:5120,y:448,reason:'Seconde lanterne de l’audience sur le même pavement oriental de l’acropole, distincte de la première et hors de la fondation royale ; fixture native entière conservée.'},
 'exterior-v76-067':{x:2690,y:2815,reason:'Jarres à l’angle du foyer, après l’aire frontale d’usage du banc marchand.'},
 'exterior-v76-069':{x:1840,y:1826,reason:'Jarres des terrasses dans la poche méridionale entre les îlots, avec cinq unités supplémentaires vers l’est pour dégager tout le corps sur la diagonale du guidage vers l’esplanade ; ID, art, échelle et volume inchangés.'},
 'exterior-v76-070':{x:4660,y:2600,reason:'Jarres sur le revers de la terrasse haute, après le seuil de la relève et avant le palier monumental.'},
};
export const HOMEWORLD_LEGACY_FRONTAGE_PLACEMENTS_V82:Readonly<Record<string,{x:number;y:number;reason:string}>>={
 'v75-frontage:pit-gate:1':{x:2680,y:1050,reason:'Le gong devient le repère de l’aile orientale du cercle ; il ne partage plus la face de l’assise oblique occidentale.'},
};
