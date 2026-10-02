import type {HomeworldInteriorV64,HomeworldInteriorPropV64} from './homeworldInteriorsV64';
import type {HomeworldInteriorPartitionV72,HomeworldInteriorZoneV72} from './homeworldFunctionalInteriorsV72';
import type {HomeworldFurnitureArtIdV72,HomeworldFurnitureInstanceV72} from './homeworldFurnitureV72';

export interface HomeworldInteriorPassageV74 {
  id:string;x:number;y:number;width:number;orientation:'horizontal'|'vertical';
}
export interface HomeworldSecondaryLayoutV74 {
  version:'V74';archetype:string;purpose:string;lore:'original-adaptation';
  passages:readonly HomeworldInteriorPassageV74[];
}
type Fixture=readonly [name:string,artId:HomeworldFurnitureArtIdV72,x:number,y:number,scale:number];
type Recipe={title:string;purpose:string;archetype:string;
  topology:'side'|'cross'|'screen'|'open-side'|'open-cross'|'open-three'|'storage-bays';
  axis:number;center?:number;gap?:number;labels:readonly string[];fixtures:readonly Fixture[];
  points?:readonly (readonly [x:number,y:number])[];console?:readonly [x:number,y:number]};

/** Authored public rooms in this game, not canonical Yautja domestic customs.
 * The envelope, southern entrance, actor age and existing services do not change.
 * Coordinates/pivots are unprojected; each independent native PNG is uniformly scaled. */
export const HOMEWORLD_SECONDARY_RECIPES_V74:Readonly<Record<string,Recipe>>={
  'dock-control':{title:'Quais · bureau et contrôle du convoi',archetype:'dock-side-office',purpose:'Le bureau de l’officier est séparé de l’aire d’inspection ; la preuve du convoi reste le seul objet d’enquête existant.',
    topology:'side',axis:215,center:220,gap:100,labels:['Bureau des amarrages','Inspection du convoi'],points:[[108,144],[410,172]],
    fixtures:[['registre','register-desk',108,80,.7],['cargaison','convoy-crates',400,80,.7],['contenants','sealed-jars',475,140,.6],['veille','resin-lantern',54,255,.7]]},
  'market-canopy':{title:'Marché · halle des délégations',archetype:'market-open-stalls',purpose:'Trois travées ouvertes distinguent la halte, les échanges et les chargements ; aucun nouveau marchand n’est ajouté.',
    topology:'open-three',axis:180,center:350,labels:['Halte des délégations','Table des échanges','Chargements déposés'],
    fixtures:[['halte','stone-bench',95,125,.75],['table','meal-table',269,126,.75],['chargement','convoy-crates',448,95,.8],['parures','clothing-rack',75,255,.65],['veille','resin-lantern',455,235,.7]]},
  'undercity-refuge':{title:'Galeries · refuge du témoin',archetype:'refuge-screened-recess',purpose:'Un écran bas protège le témoin ; la halte et la réserve du refuge restent accessibles à pied.',
    topology:'screen',axis:215,center:146,labels:['Alcôve du témoin','Halte des galeries'],points:[[105,172]],
    fixtures:[['repos','treatment-couch',105,90,.65],['repas','meal-table',393,110,.75],['contenants','sealed-jars',470,260,.65],['veille','resin-lantern',56,263,.6]]},
  'trophy-mausoleum':{title:'Mausolée · galerie des prises',archetype:'mausoleum-processional-aisle',purpose:'Une galerie centrale mène aux prises murales et aux deux postes existants. Les huit supports exposent seulement les trophées réellement acquis.',
    topology:'open-three',axis:175,center:363,labels:['Registre des prises','Galerie de procession','Consultation des Grandes Chasses'],points:[[110,130],[427,130]],
    fixtures:[['registre','register-desk',100,70,.65],['archives','convoy-crates',440,70,.65],['banc-ouest','stone-bench',105,250,.75],['banc-est','stone-bench',431,250,.75],['marque','clan-banner',269,84,.65]]},
  'enforcer-bastion':{title:'Veilleurs · preuves et dépositions',archetype:'evidence-side-records',purpose:'La réserve des dossiers est distincte de la salle de déposition ; consulter le capitaine ne valide pas automatiquement l’enquête.',
    topology:'side',axis:210,center:220,gap:104,labels:['Conservation des dossiers','Salle des dépositions'],points:[[352,98]],
    fixtures:[['registre','register-desk',102,80,.7],['preuves','convoy-crates',100,150,.7],['deposition','register-desk',415,207,.7],['veille','resin-lantern',65,268,.65]]},
  'pit-gate':{title:'THE PIT · admission et préparation',archetype:'arena-lateral-preparation',purpose:'L’intendant reçoit dans la grande travée ; une annexe contient les parures. Le service THE PIT conserve ses règles et son accès existants.',
    topology:'side',axis:350,center:207,gap:104,labels:['Admission aux arènes','Préparation des combattants'],points:[[235,105]],
    fixtures:[['gong','training-gong',80,100,.8],['registre','register-desk',235,68,.65],['parures','clothing-rack',440,110,.75],['repos','stone-bench',435,292,.7],['contenants','sealed-jars',440,175,.6]]},
  'rite-sanctum':{title:'Rites · galerie et recueillement',archetype:'rite-central-passage',purpose:'Un passage axial sépare la galerie du lieu de recueillement. Les rites de cette cité sont une adaptation originale, sans pouvoir ou rang offert par la visite.',
    topology:'cross',axis:177,center:269,gap:128,labels:['Lieu de recueillement','Galerie des visiteurs'],points:[[269,110]],
    fixtures:[['gong','training-gong',110,98,.8],['tenture','clan-banner',425,100,.75],['contenants','sealed-jars',72,260,.7],['veille','resin-lantern',473,250,.65]]},
  'convoy-workshop':{title:'Convois · atelier traversant',archetype:'convoy-two-workbenches',purpose:'Deux postes de maintenance bordent une voie centrale dégagée pour les pièces. Aucun véhicule n’est accordé ni placé dans la rue.',
    topology:'cross',axis:150,center:268,gap:196,labels:['Postes de maintenance','Manutention et préparation'],
    fixtures:[['travail-ouest','artisan-bench',120,100,.9],['travail-est','artisan-bench',418,100,.9],['caisse','convoy-crates',88,250,.8],['parures','clothing-rack',450,260,.65],['veille','resin-lantern',269,70,.6]]},
  'convoy-store':{title:'Convois · dépôt à trois travées',archetype:'convoy-three-storage-bays',purpose:'Trois réserves s’ouvrent sur une galerie de manutention ; les caisses sont solides, décoratives et non collectables.',
    topology:'storage-bays',axis:145,labels:['Réserve des pièces','Contenants scellés','Chargements du départ','Galerie de manutention'],
    fixtures:[['pieces','convoy-crates',90,103,.85],['contenants','sealed-jars',269,95,.9],['chargements','convoy-crates',442,103,.85],['veille','resin-lantern',455,248,.7]]},
  'convoy-south-shelter':{title:'Convois · halte de la cour sud',archetype:'shelter-open-common-room',purpose:'Une halte collective réunit un banc, une table et une réserve à l’écart de l’entrée. Le mobilier ne présume pas de coutumes alimentaires canoniques.',
    topology:'open-side',axis:265,labels:['Halte des voyageurs','Salle commune du relais'],
    fixtures:[['banc','stone-bench',120,112,.9],['table','meal-table',400,115,.75],['parures','clothing-rack',70,260,.65],['contenants','sealed-jars',475,260,.7],['veille','resin-lantern',269,86,.6]]},
  'rampart-north-lodge':{title:'Remparts · relais de la patrouille haute',archetype:'rampart-east-rest-chamber',purpose:'L’alcôve de repos latérale est isolée du passage des patrouilles ; elle n’ouvre aucun soin gratuit.',
    topology:'side',axis:325,center:173,gap:106,labels:['Salle de la patrouille','Alcôve de repos'],
    fixtures:[['table','meal-table',112,112,.8],['repos','treatment-couch',435,110,.7],['banc','stone-bench',110,270,.7],['parures','clothing-rack',435,286,.65]]},
  'rampart-watch':{title:'Remparts · salle d’observation',archetype:'rampart-cross-observation',purpose:'La console d’observation reste dans la salle arrière ; équipements et halte occupent le vestibule. Cette console décorative n’ouvre pas d’expédition.',
    topology:'cross',axis:160,center:269,gap:120,labels:['Observation des remparts','Préparation de la relève'],console:[269,78],
    fixtures:[['registre','register-desk',100,100,.7],['contenants','sealed-jars',445,106,.7],['parures','clothing-rack',70,260,.65],['banc','stone-bench',445,270,.75]]},
  'rampart-south-lodge':{title:'Remparts · relais de la galerie basse',archetype:'rampart-offset-common-room',purpose:'Un passage décentré mène de la halte à la salle commune et au repos. La disposition diffère du relais haut sans agrandir sa façade.',
    topology:'cross',axis:157,center:350,gap:112,labels:['Salle commune et repos','Halte de la galerie basse'],
    fixtures:[['table','meal-table',108,105,.75],['repos','treatment-couch',418,100,.65],['parures','clothing-rack',73,270,.6],['veille','resin-lantern',469,257,.6]]},

  'residence-port-1':{title:'Quais · maison du relais',archetype:'home-port-left-rest',purpose:'Alcôve de repos latérale et espace de préparation des voyageurs.',topology:'side',axis:122,center:130,gap:94,labels:['Alcôve de repos','Préparation du relais'],
    fixtures:[['repos','treatment-couch',65,82,.5],['parures','clothing-rack',258,77,.55],['contenants','sealed-jars',255,166,.5],['veille','resin-lantern',53,170,.45]]},
  'residence-market-2':{title:'Marché · maison des échanges',archetype:'home-market-right-rest',purpose:'Une petite salle commune précède une alcôve de repos à l’est.',topology:'side',axis:206,center:126,gap:96,labels:['Petite salle commune','Alcôve de repos'],
    fixtures:[['table','meal-table',90,82,.6],['repos','treatment-couch',265,82,.5],['veille','resin-lantern',50,175,.5],['parures','clothing-rack',265,184,.45]]},
  'residence-undercity-1':{title:'Galeries · foyer abrité',archetype:'home-undercity-north-recess',purpose:'Un retrait arrière protégé laisse l’entrée et les réserves à l’avant.',topology:'cross',axis:94,center:164,gap:112,labels:['Retrait de repos','Entrée abritée'],
    fixtures:[['repos','treatment-couch',75,69,.5],['veille','resin-lantern',275,67,.55],['contenants','sealed-jars',267,170,.6],['parures','clothing-rack',70,174,.5]]},
  'residence-esplanade-2':{title:'Esplanade · foyer des hôtes',archetype:'home-esplanade-open-rest',purpose:'Deux travées ouvertes séparent le repos des parures et de la petite table.',topology:'open-side',axis:180,labels:['Travée de repos','Travée des hôtes'],
    fixtures:[['repos','treatment-couch',85,88,.6],['parures','clothing-rack',270,85,.5],['table','meal-table',260,178,.55],['veille','resin-lantern',53,172,.5]]},
  'residence-clans-1':{title:'Clans · maison des visiteurs',archetype:'home-clans-open-common',purpose:'Repos et table à l’arrière, parures et accueil près du seuil ; adaptation locale sans modèle universel de famille yautja.',topology:'open-cross',axis:108,labels:['Repos et table','Accueil des visiteurs'],
    fixtures:[['repos','treatment-couch',78,81,.55],['table','meal-table',246,82,.5],['veille','resin-lantern',50,177,.5],['parures','clothing-rack',274,183,.45]]},
  'residence-arenas-1':{title:'Arènes · foyer de l’aspirant',archetype:'home-arena-screened-rest',purpose:'Un écran protège le repos ; parures et gong de préparation restent décoratifs.',topology:'screen',axis:206,center:90,labels:['Préparation de l’aspirant','Alcôve protégée'],
    fixtures:[['parures','clothing-rack',85,79,.55],['repos','treatment-couch',265,82,.5],['gong','training-gong',84,181,.55],['veille','resin-lantern',271,178,.45]]},
  'residence-citadel-1':{title:'Citadelle · logement de l’intendance',archetype:'home-citadel-cross-study',purpose:'Un bureau compact et le repos occupent le retrait arrière ; ce logement n’est pas un palais royal canonique.',topology:'cross',axis:105,center:164,gap:120,labels:['Repos et registre','Entrée de l’intendance'],
    fixtures:[['repos','treatment-couch',81,77,.55],['registre','register-desk',255,81,.5],['veille','resin-lantern',60,177,.45],['tenture','clan-banner',271,178,.45]]},
  'residence-rampart-walk-1':{title:'Remparts · foyer de la relève',archetype:'home-rampart-left-recess',purpose:'Une alcôve latérale protège le repos tandis que le banc et les parures bordent la salle de relève.',topology:'screen',axis:122,center:86,labels:['Repos de la relève','Salle du banc'],
    fixtures:[['repos','treatment-couch',65,81,.5],['banc','stone-bench',240,90,.6],['parures','clothing-rack',260,183,.45],['veille','resin-lantern',50,176,.5]]},

  'residence-port-2':{title:'Quais · maison commune des convoyeurs',archetype:'home-port-side-pantry',purpose:'Salle commune et réserve latérale des voyageurs, sans cargaison à récupérer.',topology:'side',axis:300,center:145,gap:94,labels:['Salle des convoyeurs','Réserve du foyer'],
    fixtures:[['table','meal-table',120,102,.75],['banc','stone-bench',113,185,.55],['reserve','convoy-crates',352,96,.65],['veille','resin-lantern',352,181,.5]]},
  'residence-forges-1':{title:'Forges · foyer de l’artisan',archetype:'home-forge-cross-workroom',purpose:'Table et petit établi à l’arrière, parures et accueil à l’avant ; l’établi ne remplace pas le service de la forge.',topology:'cross',axis:120,center:204,gap:112,labels:['Table et petit établi','Accueil du foyer'],
    fixtures:[['table','meal-table',110,88,.75],['travail','artisan-bench',328,88,.55],['banc','stone-bench',110,190,.55],['parures','clothing-rack',335,193,.55]]},
  'residence-undercity-2':{title:'Galeries · salle commune du refuge',archetype:'home-undercity-side-shelter',purpose:'Une alcôve ouest est séparée par un écran court de la salle commune du foyer.',topology:'screen',axis:150,center:122,labels:['Alcôve abritée','Salle commune du refuge'],
    fixtures:[['repos','treatment-couch',80,92,.55],['table','meal-table',284,112,.8],['contenants','sealed-jars',334,198,.55],['veille','resin-lantern',55,196,.5]]},
  'residence-terraces-1':{title:'Terrasses · maison de la promenade',archetype:'home-terrace-open-table',purpose:'Salle de la table et réserve latérale ; le plan conserve une entrée ouverte vers la promenade extérieure existante.',topology:'open-side',axis:222,labels:['Salle de la table','Réserve et parures'],
    fixtures:[['table','meal-table',125,103,.8],['banc','stone-bench',114,190,.65],['contenants','sealed-jars',325,102,.65],['veille','resin-lantern',342,197,.6]]},
  'residence-enforcers-1':{title:'Veilleurs · maison de la déposition',archetype:'home-enforcer-offset-common',purpose:'Une entrée décentrée rejoint la salle commune sans transformer ce foyer en poste de service.',topology:'cross',axis:120,center:244,gap:112,labels:['Salle commune des veilleurs','Vestibule du foyer'],
    fixtures:[['table','meal-table',109,89,.65],['banc-arriere','stone-bench',334,82,.65],['banc-accueil','stone-bench',98,197,.65],['parures','clothing-rack',340,204,.5]]},
  'residence-temple-1':{title:'Rites · maison de l’accueil',archetype:'home-rite-screened-pantry',purpose:'Une réserve latérale et une table composent ce logement civique ; aucune fonction religieuse universelle n’est prétendue.',topology:'screen',axis:145,center:118,labels:['Réserve du foyer','Table de l’accueil'],
    fixtures:[['contenants','sealed-jars',74,97,.65],['table','meal-table',282,95,.75],['parures','clothing-rack',76,205,.5],['veille','resin-lantern',350,202,.6]]},
  'residence-convoy-works-1':{title:'Convois · maison de la maintenance',archetype:'home-convoy-wide-crossway',purpose:'Table et établi du foyer partagent l’arrière ; une ouverture large relie l’espace de préparation.',topology:'cross',axis:130,center:219,gap:138,labels:['Table et maintenance du foyer','Préparation du départ'],
    fixtures:[['table','meal-table',105,99,.75],['travail','artisan-bench',325,100,.6],['reserve','convoy-crates',333,198,.6],['veille','resin-lantern',80,193,.55]]},
  'residence-terraces-3':{title:'Terrasses · maison de la grande table',archetype:'home-terrace-three-open-bays',purpose:'Trois travées ouvertes composent une salle commune plus collective, avec circulation autour de la table centrale.',topology:'open-three',axis:133,center:275,labels:['Travée du banc','Table centrale','Travée des contenants'],
    fixtures:[['banc','stone-bench',70,103,.6],['table','meal-table',204,104,.8],['contenants','sealed-jars',334,108,.65],['parures','clothing-rack',70,204,.5],['veille','resin-lantern',334,200,.55]]},

  'residence-market-1':{title:'Marché · maison des réserves',archetype:'home-market-north-store',purpose:'Réserve arrière avec parures et contenants, séparée de l’espace de tri par un passage compact.',topology:'cross',axis:87,center:134,gap:96,labels:['Réserve du foyer','Tri et entrée'],
    fixtures:[['parures','clothing-rack',52,65,.45],['contenants','sealed-jars',221,65,.5],['caisse','convoy-crates',214,154,.5],['veille','resin-lantern',50,157,.45]]},
  'residence-forges-2':{title:'Forges · réserve de l’artisan',archetype:'home-forge-west-materials',purpose:'Un écran court sépare les matériaux du passage ; aucune matière d’artisanat n’est accordée.',topology:'screen',axis:88,center:80,labels:['Matériaux du foyer','Passage de préparation'],
    fixtures:[['parures','clothing-rack',49,65,.45],['pieces','convoy-crates',185,70,.55],['veille','resin-lantern',214,158,.45]]},
  'residence-esplanade-1':{title:'Esplanade · petite maison des hôtes',archetype:'home-esplanade-open-supplies',purpose:'Banc arrière et contenants latéraux laissent un passage central libre jusqu’au seuil.',topology:'open-cross',axis:96,labels:['Banc et dépôt arrière','Passage des hôtes'],
    fixtures:[['banc','stone-bench',134,70,.55],['parures','clothing-rack',50,138,.45],['contenants','sealed-jars',219,140,.5],['veille','resin-lantern',219,174,.4]]},
  'residence-terraces-2':{title:'Terrasses · réserve de la promenade',archetype:'home-terrace-east-store',purpose:'Une réserve à l’est est accessible par le bas de l’écran ; le côté ouest sert au dépôt du foyer.',topology:'screen',axis:180,center:80,labels:['Dépôt du foyer','Réserve de la promenade'],
    fixtures:[['caisse','convoy-crates',64,65,.55],['contenants','sealed-jars',222,65,.5],['parures','clothing-rack',221,177,.4],['veille','resin-lantern',47,160,.45]]},
  'residence-memory-1':{title:'Mémoire · foyer des registres',archetype:'home-memory-open-records',purpose:'Un petit poste de registre et les parures du foyer entourent une travée de rangement ; aucun dossier de quête n’est inventé.',topology:'open-side',axis:134,labels:['Petit poste de registre','Parures et rangement'],
    fixtures:[['registre','register-desk',65,65,.6],['parures','clothing-rack',216,71,.5],['contenants','sealed-jars',54,153,.5],['veille','resin-lantern',216,160,.45]]},
  'residence-temple-2':{title:'Rites · foyer des tentures',archetype:'home-rite-offset-store',purpose:'Le dépôt arrière et l’entrée sont reliés par un passage décentré ; tentures et contenants ne sont pas des reliques collectables.',topology:'cross',axis:88,center:157,gap:104,labels:['Dépôt des tentures','Entrée du foyer'],
    fixtures:[['tenture','clan-banner',55,65,.55],['contenants','sealed-jars',221,69,.5],['parures','clothing-rack',216,162,.45],['veille','resin-lantern',53,160,.45]]},
  'residence-convoy-works-2':{title:'Convois · petit dépôt du foyer',archetype:'home-convoy-open-crates',purpose:'Deux dépôts indépendants bordent une aire de tri centrale ; toutes les caisses restent purement environnementales.',topology:'open-three',axis:88,center:180,labels:['Dépôt des pièces','Aire de tri','Contenants du foyer'],
    fixtures:[['caisse-ouest','convoy-crates',52,75,.65],['caisse-est','convoy-crates',219,83,.6],['parures','clothing-rack',51,164,.45],['veille','resin-lantern',220,166,.5]]},
  'residence-terraces-4':{title:'Terrasses · foyer du banc de pierre',archetype:'home-terrace-left-bench',purpose:'Une alcôve latérale abrite le banc ; la réserve reste de l’autre côté du passage.',topology:'side',axis:88,center:125,gap:102,labels:['Alcôve du banc','Réserve et entrée'],
    fixtures:[['banc','stone-bench',48,63,.4],['contenants','sealed-jars',212,72,.6],['parures','clothing-rack',219,165,.45],['veille','resin-lantern',47,164,.4]]},
};

export function homeworldSecondaryInteriorV74(room:HomeworldInteriorV64):HomeworldInteriorV64{
  const recipe=HOMEWORLD_SECONDARY_RECIPES_V74[room.buildingId];if(!recipe)return room;
  const w=room.width,d=room.depth,partitions:HomeworldInteriorPartitionV72[]=[],zones:HomeworldInteriorZoneV72[]=[],passages:HomeworldInteriorPassageV74[]=[];
  const zone=(index:number,x:number,y:number,width:number,depth:number)=>zones.push({id:room.buildingId+'-v74-zone-'+index,label:recipe.labels[index],x,y,width,depth});
  const wall=(suffix:string,x:number,y:number,width:number,depth:number,orientation:'horizontal'|'vertical')=>{
    if(width>0&&depth>0)partitions.push({id:room.buildingId+'-v74-wall-'+suffix,x,y,width,depth,orientation,cutawayHeight:42});
  };
  const passage=(suffix:string,x:number,y:number,width:number,orientation:'horizontal'|'vertical')=>passages.push({id:room.buildingId+'-v74-passage-'+suffix,x,y,width,orientation});
  if(recipe.topology==='side'){
    const center=recipe.center!,gap=recipe.gap!;
    wall('upper',recipe.axis-5,10,10,center-gap/2-10,'vertical');
    wall('lower',recipe.axis-5,center+gap/2,10,d-10-center-gap/2,'vertical');
    passage('lateral',recipe.axis,center,gap,'vertical');
    zone(0,0,0,recipe.axis-5,d);zone(1,recipe.axis+5,0,w-recipe.axis-5,d);
  }else if(recipe.topology==='cross'){
    const center=recipe.center!,gap=recipe.gap!;
    wall('west',10,recipe.axis-5,center-gap/2-10,10,'horizontal');
    wall('east',center+gap/2,recipe.axis-5,w-10-center-gap/2,10,'horizontal');
    passage('cross',center,recipe.axis,gap,'horizontal');
    zone(0,0,0,w,recipe.axis-5);zone(1,0,recipe.axis+5,w,d-recipe.axis-5);
  }else if(recipe.topology==='screen'){
    const end=recipe.center!;
    wall('screen',recipe.axis-5,10,10,end-10,'vertical');
    passage('open-end',recipe.axis,(end+d-10)/2,d-10-end,'vertical');
    zone(0,0,0,recipe.axis-5,d);zone(1,recipe.axis+5,0,w-recipe.axis-5,d);
  }else if(recipe.topology==='storage-bays'){
    for(const [index,x]of[185,350].entries())wall('bay-'+index,x-5,10,10,recipe.axis-10,'vertical');
    zone(0,0,0,180,recipe.axis);zone(1,190,0,155,recipe.axis);zone(2,355,0,w-355,recipe.axis);zone(3,0,recipe.axis,w,d-recipe.axis);
    for(const[index,entry]of[{x:95,width:170},{x:267.5,width:155},{x:(355+w-10)/2,width:w-365}].entries())passage('bay-'+index,entry.x,recipe.axis,entry.width,'horizontal');
  }else if(recipe.topology==='open-side'){
    zone(0,0,0,recipe.axis,d);zone(1,recipe.axis,0,w-recipe.axis,d);
  }else if(recipe.topology==='open-cross'){
    zone(0,0,0,w,recipe.axis);zone(1,0,recipe.axis,w,d-recipe.axis);
  }else{
    zone(0,0,0,recipe.axis,d);zone(1,recipe.axis,0,recipe.center!-recipe.axis,d);zone(2,recipe.center!,0,w-recipe.center!,d);
  }
  const furniture:HomeworldFurnitureInstanceV72[]=recipe.fixtures.map(([name,artId,x,y,scale])=>({id:room.buildingId+'-v74-'+name,artId,x,y,scale}));
  const props:HomeworldInteriorPropV64[]=recipe.console?[{id:room.buildingId+'-v74-observation-console',kind:'console',x:recipe.console[0],y:recipe.console[1],width:92,height:92,halfWidth:25,halfDepth:15}]:[];
  return {...room,title:recipe.title,description:recipe.purpose+' Plan et mobilier originaux de cette cité, non présentés comme une carte ou un usage domestique canonique. Aucune récompense implicite.',
    points:room.points.map((point,i)=>({...point,x:recipe.points?.[i]?.[0]??point.x,y:recipe.points?.[i]?.[1]??point.y})),props,furniture,partitions,zones,
    secondaryLayoutV74:{version:'V74',archetype:recipe.archetype,purpose:recipe.purpose,lore:'original-adaptation',passages}};
}
