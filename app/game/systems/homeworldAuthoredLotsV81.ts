import type {HomeworldLevelV77} from './homeworldWorldV77';

type Point={readonly x:number;readonly y:number};
export type HomeworldCivicUseV81='rest'|'work'|'archive'|'exchange'|'freight'|'ceremony'|'clan';
export interface HomeworldAuthoredCourtV81 {
 readonly id:string;readonly levelId:HomeworldLevelV77;readonly districtId:string;
 readonly label:string;readonly use:HomeworldCivicUseV81;readonly density:0|1|2|3|4|5;
 readonly x:number;readonly y:number;readonly polygon:readonly Point[];
 readonly focus:string;readonly composition:string;readonly pedestrian:readonly Point[];
 readonly props:readonly {readonly name:string;readonly artId:string;readonly x:number;readonly y:number;readonly scale:number;readonly purpose:string}[];
}
const p=(x:number,y:number)=>({x,y});
const item=(name:string,artId:string,x:number,y:number,purpose:string,scale=1)=>({name,artId,x,y,scale,purpose});
/** Approved authored geography, not a runtime scatterer. These asymmetric
 * courts extend the old causeway on alternating shoulders. Their own working,
 * waiting and ceremonial faces determine furniture, not a universal slot kit.
 * IDs/actual rooms and saved floor sockets are deliberately unchanged. */
export const HOMEWORLD_AUTHORED_COURTS_V81:readonly HomeworldAuthoredCourtV81[]=[
 {id:'port-0',levelId:'0',districtId:'port',label:'Quai des chargements',use:'freight',density:4,x:3480,y:5100,
  polygon:[p(3190,5325),p(3190,4920),p(3550,4795),p(3875,4975),p(3780,5325)],focus:'lot de cargaison au revers du quai',composition:'LOADING_BAY',pedestrian:[p(3450,5230),p(3520,5185)],
  props:[item('cargo','court-native-v80:sealed-cargo-case-left',3280,5070,'Stock scellé derrière la zone de manutention'),item('tools','court-native-v80:maintenance-rack',3640,4955,'Outils contre le revers rocheux du quai'),item('beacon','court-native-v80:amber-lamp-post',3785,5210,'Bord du quai ; circulation centrale libre')]},
 {id:'port-1',levelId:'0',districtId:'port',label:'Travée de maintenance',use:'work',density:3,x:4140,y:5660,
  polygon:[p(3850,5290),p(3930,4925),p(4260,4950),p(4430,5205),p(4360,5810),p(4045,5870),p(3870,5670)],focus:'poste de réglage en retrait',composition:'SERVICE_BAY',pedestrian:[p(4140,5210),p(4195,5255)],
  props:[item('rack','court-native-v80:maintenance-rack',4220,5700,'Réglage des équipements hors voie piétonne'),item('supplies','court-native-v80:sealed-cargo-case-left',3960,5660,'Pièces de maintenance derrière le travailleur')]},
 {id:'port-2',levelId:'0',districtId:'port',label:'Belvédère des voyageurs',use:'rest',density:2,x:4790,y:5100,
  polygon:[p(4500,5325),p(4500,4980),p(4670,4850),p(5000,4905),p(5110,5190),p(5010,5325)],focus:'panorama du canyon sous la chaussée',composition:'REST_POCKET',pedestrian:[p(4790,5220),p(4820,5150)],
  props:[item('bench','court-native-v80:bench-left',4630,5080,'Assise orientée vers le panorama avec approche libre'),item('basin','court-native-v80:mineral-basin-right',4965,5030,'Bac minéral dans la poche latérale')]},
 {id:'port-3',levelId:'0',districtId:'port',label:'Parvis des délégations',use:'clan',density:2,x:5440,y:5685,
  polygon:[p(5170,5325),p(5170,4970),p(5450,4890),p(5655,5030),p(5735,5650),p(5590,5870),p(5305,5825)],focus:'marque de délégation ; centre pour le rassemblement',composition:'SINGLE_ANCHOR',pedestrian:[p(5415,5210),p(5470,5250)],
  props:[item('standard','court-native-v80:clan-banner-standard',5590,5670,'Repère du clan au bord du parvis, pas un cargo')]},
 {id:'port-4',levelId:'0',districtId:'port',label:'Galerie des registres du quai',use:'archive',density:2,x:6060,y:5090,
  polygon:[p(5810,5325),p(5810,4950),p(6050,4830),p(6325,4930),p(6390,5160),p(6310,5325)],focus:'pupitre des traversées',composition:'EDGE_STAGGER',pedestrian:[p(6050,5215),p(6100,5170)],
  props:[item('register','court-native-v80:clan-lectern-right',5890,5080,'Consultation ouverte vers la cour'),item('light','court-native-v80:amber-lamp-post',6280,5180,'Lumière du bord de galerie')]},
 {id:'port-5',levelId:'0',districtId:'port',label:'Cour des arrivées',use:'rest',density:1,x:6750,y:5680,
  polygon:[p(6445,5325),p(6445,4995),p(6650,4870),p(6950,4980),p(7025,5630),p(6860,5840),p(6570,5795)],focus:'halte hors du flux des équipages',composition:'TERRACE_EDGE',pedestrian:[p(6700,5220),p(6745,5260)],
  props:[item('bench','terrace-bench-right',6890,5660,'Vue sur le port depuis la rive méridionale',.8),item('bed','mineral-planter-left',6550,5700,'Mineraux sur le bord fermé de la cour',.6)]},
 {id:'port-6',levelId:'0',districtId:'port',label:'Quai du retour des chasses',use:'freight',density:3,x:7350,y:5070,
  polygon:[p(7090,5325),p(7090,4925),p(7350,4780),p(7615,4910),p(7690,5155),p(7590,5325)],focus:'tri des retours avant accès au sas',composition:'EDGE_CLUSTER',pedestrian:[p(7340,5220),p(7380,5160)],
  props:[item('cargo','court-native-v80:sealed-cargo-case-left',7200,5070,'Prises emballées après débarquement'),item('lamp','court-native-v80:amber-lamp-post',7560,5220,'Repère du raccord piéton ; pad maintenu vide')]},
 {id:'lower-market',levelId:'-1A',districtId:'undercity',label:'Cour des échanges bas',use:'exchange',density:4,x:3150,y:3130,
  polygon:[p(2780,2835),p(3380,2840),p(3415,3290),p(3280,3440),p(2790,3375)],focus:'étal et rue des clients',composition:'MARKET_BAY',pedestrian:[p(3120,3140),p(3165,3095)],
  props:[item('canopy','merchant-canopy-diagonal',3290,2950,'Vendeur abrité ; face ouverte sur la cour',.7),item('stock','logistics-container-rack',2870,2995,'Stock à l’écart des clients',.75),item('light','court-native-v80:amber-lamp-post',2845,3255,'Entrée secondaire du marché')]},
 {id:'lower-maintenance',levelId:'-1A',districtId:'undercity',label:'Cour de maintenance',use:'work',density:4,x:4150,y:3020,
  polygon:[p(3840,2810),p(4460,2850),p(4465,3120),p(4310,3145),p(3900,3105)],focus:'outils et pièces contre le soutènement',composition:'WORK_POCKET',pedestrian:[p(4120,3020),p(4170,3060)],
  props:[item('rack','court-native-v80:maintenance-rack',3920,2920,'Outils de l’atelier en retrait de la voie'),item('case','court-native-v80:sealed-cargo-case-left',4400,2980,'Réserves de maintenance au revers de la cour')]},
 {id:'lower-west-rest',levelId:'-1A',districtId:'undercity',label:'Halte de la rue basse',use:'rest',density:2,x:3070,y:4150,
  polygon:[p(2750,4010),p(3215,3995),p(3210,4510),p(2910,4550),p(2740,4320)],focus:'assise au revers du refuge',composition:'REST_POCKET',pedestrian:[p(3045,4150),p(3105,4180)],
  props:[item('bench','terrace-bench-right',2880,4210,'Assise avec approche côté rue',.75),item('basin','court-native-v80:mineral-basin-right',2810,4410,'Bac dans le retour du mur')]},
 {id:'lower-east-cistern',levelId:'-1A',districtId:'undercity',label:'Cour des citernes',use:'work',density:3,x:4840,y:4540,
  polygon:[p(4560,4390),p(5090,4410),p(5070,5160),p(4680,5190),p(4530,4965)],focus:'réserve minérale civique',composition:'SERVICE_BAY',pedestrian:[p(4820,4550),p(4870,4495)],
  props:[item('basin','court-native-v80:mineral-basin-right',4615,4790,'Réserve dans un angle, pas dans l’allée'),item('lamp','court-native-v80:amber-lamp-post',4935,5010,'Bord du service des citernes')]},
 {id:'lower-middle-rest',levelId:'-1A',districtId:'undercity',label:'Passage abrité des galeries',use:'rest',density:1,x:3730,y:4050,
  polygon:[p(3440,3990),p(3900,3990),p(3900,4165),p(3485,4170)],focus:'respiration avant le carrefour',composition:'SINGLE_ANCHOR',pedestrian:[p(3655,4020),p(3710,3980)],
  props:[item('bench','terrace-bench-right',3550,4075,'Halte à l’écart du point de décision',.75)]},
 {id:'lower-forge',levelId:'-1A',districtId:'undercity',label:'Cour des artisans bas',use:'work',density:4,x:3600,y:4800,
  polygon:[p(3380,4630),p(3875,4630),p(3890,5130),p(3560,5240),p(3360,5075)],focus:'réglage et refroidissement séparés',composition:'WORK_POCKET',pedestrian:[p(3600,4790),p(3650,4845)],
  props:[item('rack','court-native-v80:maintenance-rack',3435,4760,'Outils contre la structure de service'),item('case','court-native-v80:sealed-cargo-case-left',3835,4970,'Matières derrière le poste de travail')]},
 {id:'lower-common',levelId:'-1A',districtId:'undercity',label:'Cour commune des clans bas',use:'clan',density:3,x:4210,y:4840,
  polygon:[p(3970,4665),p(4490,4690),p(4470,5205),p(4190,5240),p(3970,5050)],focus:'table sociale et circulation extérieure',composition:'SOCIAL_CLUSTER',pedestrian:[p(4190,4840),p(4245,4880)],
  props:[item('table','clan-common-table-left',4380,4960,'Table de réunion du clan, couloir autour'),item('light','court-native-v80:amber-lamp-post',4050,5100,'Veilleuse à la périphérie du rassemblement')]},
];

/** Each frontage is authored separately. A blank frontage is an intentional
 * processional/doorway breathing space, not a missing generated slot. */
export const HOMEWORLD_FRONTAGE_PLANS_V81:Readonly<Record<string,readonly {artId:string;u:number;v:number;purpose:string;scale?:number}[]>>={
 'dock-control':[{artId:'maintenance-rack',u:-475,v:200,purpose:'Travée de contrôle et maintenance du quai'},{artId:'sealed-cargo-case-left',u:380,v:515,purpose:'Colis vérifiés en retrait du sas'}],
 'market-armory':[{artId:'clan-common-table-left',u:-335,v:385,purpose:'Présentation des parures côté client'},{artId:'amber-lamp-post',u:-390,v:130,purpose:'Repère à la sortie de l’alcôve'}],
 'market-canopy':[{artId:'amber-lamp-post',u:405,v:145,purpose:'Angle du marché ; aire clients libre'}],
 'deep-forge':[{artId:'forge-workstation-left',u:-355,v:470,purpose:'Finition et refroidissement hors du seuil'},{artId:'maintenance-rack',u:410,v:245,purpose:'Outils du service latéral'},{artId:'sealed-cargo-case-left',u:505,v:515,purpose:'Matières à l’abri du foyer'}],
 'undercity-refuge':[{artId:'bench-left',u:400,v:245,purpose:'Repos devant la galerie, approach libre'},{artId:'amber-lamp-post',u:-430,v:325,purpose:'Repère de la traverse occidentale'}],
 'trophy-mausoleum':[{artId:'clan-lectern-right',u:-440,v:210,purpose:'Consultation dans la galerie occidentale'},{artId:'clan-banner-standard',u:-405,v:70,purpose:'Marque du mémorial local'}],
 'training-hall':[{artId:'mineral-basin-right',u:410,v:425,purpose:'Pause minérale hors aire d’entraînement'}],
 'clan-lodge':[{artId:'clan-banner-standard',u:420,v:320,purpose:'Délégation du clan devant l’aile latérale'}],
 'enforcer-bastion':[{artId:'clan-lectern-right',u:-410,v:425,purpose:'Registre public à côté de l’axe du bastion'}],
 'memory-vault':[], 'pit-gate':[],
 'rite-sanctum':[{artId:'mineral-basin-right',u:510,v:350,purpose:'Bord du parvis rituel'}],
 'throne-audience':[{artId:'clan-banner-standard',u:-500,v:255,purpose:'Cadre cérémoniel de l’audience'},{artId:'clan-banner-standard',u:500,v:255,purpose:'Cadre cérémoniel de l’audience'}],
 'convoy-workshop':[],
 'convoy-store':[{artId:'sealed-cargo-case-left',u:360,v:630,purpose:'Retours scellés dans la travée de stockage'}],
 'convoy-south-shelter':[{artId:'bench-left',u:-360,v:290,purpose:'Halte des convoyeurs séparée du fret'},{artId:'amber-lamp-post',u:405,v:210,purpose:'Bord éclairé du relais'}],
 'rampart-north-lodge':[{artId:'bench-left',u:430,v:255,purpose:'Belvédère latéral du rempart'}],
 'rampart-watch':[{artId:'amber-lamp-post',u:415,v:150,purpose:'Signal de la vigie'},{artId:'mineral-basin-right',u:550,v:420,purpose:'Poche du soutènement'}],
 'rampart-south-lodge':[{artId:'amber-lamp-post',u:-425,v:140,purpose:'Raccord de la ruelle des remparts'}],
 'residence-port-1':[{artId:'amber-lamp-post',u:-270,v:145,purpose:'Seuil du logement des pilotes'}],
 'residence-port-2':[{artId:'mineral-basin-right',u:300,v:385,purpose:'Cour des équipages loin du chargement'}],
 'residence-market-1':[], 'residence-market-2':[], 'residence-forges-1':[],
 'residence-forges-2':[{artId:'maintenance-rack',u:255,v:185,purpose:'Outils du logement artisan'}],
 'residence-undercity-1':[{artId:'bench-left',u:-350,v:290,purpose:'Halte tournée vers la rue basse'},{artId:'amber-lamp-post',u:335,v:415,purpose:'Retour du passage aux galeries'}],
 'residence-undercity-2':[{artId:'mineral-basin-right',u:-340,v:440,purpose:'Réserve minérale dans la cour du refuge'}],
 'residence-esplanade-1':[{artId:'amber-lamp-post',u:-290,v:160,purpose:'Angle du chemin vers le rivage'}],
 'residence-esplanade-2':[{artId:'mineral-basin-right',u:-295,v:365,purpose:'Bord de la promenade des prises'}],
 'residence-terraces-1':[], 'residence-terraces-2':[], 'residence-terraces-3':[], 'residence-terraces-4':[],
 'residence-clans-1':[{artId:'clan-banner-standard',u:-315,v:180,purpose:'Marque de la maison de clan'}],
 'residence-enforcers-1':[{artId:'amber-lamp-post',u:-355,v:185,purpose:'Signal de la relève'}],
 'residence-memory-1':[{artId:'mineral-basin-right',u:330,v:430,purpose:'Cour de repos du scribe'}],
 'residence-arenas-1':[],
 'residence-temple-1':[{artId:'bench-left',u:-405,v:315,purpose:'Attente calme vers le panorama du temple'}],
 'residence-temple-2':[{artId:'clan-lectern-right',u:320,v:350,purpose:'Consultation de l’annexe du Conseil'}],
 'residence-citadel-1':[{artId:'amber-lamp-post',u:-340,v:235,purpose:'Bord de l’annexe royale'}],
 'residence-convoy-works-1':[{artId:'maintenance-rack',u:-370,v:395,purpose:'Matériel de réparation au revers du logement'}],
 'residence-convoy-works-2':[{artId:'sealed-cargo-case-left',u:305,v:520,purpose:'Réserve de transit le long du mur'}],
 'residence-rampart-walk-1':[],
};

export const HOMEWORLD_DISTRICT_GRAMMAR_V81:Readonly<Record<string,{density:0|1|2|3|4|5;functions:readonly string[];symmetry:boolean;street:string}>>={
 port:{density:3,functions:['logistics','storage','maintenance','rest','consultation','clan'],symmetry:false,street:'Quai des Chasses'},
 market:{density:4,functions:['exchange','storage','light'],symmetry:false,street:'Route des artisans'},
 forges:{density:4,functions:['work','maintenance','storage','light'],symmetry:false,street:'Voie des Forges'},
 clans:{density:3,functions:['clan','rest','consultation','light'],symmetry:false,street:'Rue des Clans'},
 esplanade:{density:2,functions:['consultation','clan','rest','light'],symmetry:true,street:'Promenade des Prises'},
 memory:{density:2,functions:['consultation','rest','light'],symmetry:false,street:'Passage des archives'},
 terraces:{density:2,functions:['training','rest','light'],symmetry:false,street:'Terrasses des maîtres'},
 arenas:{density:2,functions:['training','rest','light'],symmetry:true,street:'Rampe du cercle'},
 temple:{density:1,functions:['consultation','ceremony','rest','light'],symmetry:true,street:'Montée du Conseil'},
 citadel:{density:1,functions:['ceremony','rest','light'],symmetry:true,street:'Voie du Palais'},
 enforcers:{density:2,functions:['consultation','clan','light'],symmetry:true,street:'Galerie des preuves'},
 undercity:{density:5,functions:['exchange','work','maintenance','storage','rest','light','clan'],symmetry:false,street:'Descente des Bas-Quartiers'},
 'convoy-works':{density:4,functions:['logistics','maintenance','storage','rest','light'],symmetry:false,street:'Rue des convoyeurs'},
 'rampart-walk':{density:2,functions:['rest','light','clan'],symmetry:false,street:'Promenade des remparts'},
};
