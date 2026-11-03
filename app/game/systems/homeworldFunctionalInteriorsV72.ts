import type {HomeworldInteriorV64,HomeworldInteriorPropV64} from './homeworldInteriorsV64';
import type {HomeworldFurnitureInstanceV72,HomeworldFurnitureArtIdV72} from './homeworldFurnitureV72';
export interface HomeworldInteriorPartitionV72 {id:string;x:number;y:number;width:number;depth:number;orientation:'horizontal'|'vertical';cutawayHeight:number}
export interface HomeworldInteriorZoneV72 {id:string;label:string;x:number;y:number;width:number;depth:number}
const functions:Record<string,readonly [string,string,string]>={
  'throne-audience':['Vestibule des délégations','Chambre des audiences','Salle du conseil local'],
  'training-hall':['Galerie des aspirants','Dojo du maître','Préparation des exercices'],
  'deep-forge':['Galerie des commandes','Atelier des parures','Réserve des matériaux'],
  'memory-vault':['Galerie de consultation','Registre des marques','Réserve des archives'],
  'clan-lodge':['Accueil des délégations','Chambre des soins','Alcôve de repos'],
  'market-armory':['Halle des échanges','Comptoir de l’artisane','Réserve de l’armurerie'],
};
export function homeworldInteriorPartitionPlanV72(room:Pick<HomeworldInteriorV64,'buildingId'|'width'|'depth'>){
  const labels=functions[room.buildingId];if(!labels)return null;
  const width=room.width,depth=room.depth,line=depth*.53,left=width*.25,right=width*.75,gap=112,thickness=12;
  const zones:HomeworldInteriorZoneV72[]=[
    {id:room.buildingId+'-foyer',label:labels[0],x:0,y:line,width,depth:depth-line},
    {id:room.buildingId+'-west',label:labels[1],x:0,y:0,width:width/2,depth:line},
    {id:room.buildingId+'-east',label:labels[2],x:width/2,y:0,width:width/2,depth:line},
  ];
  const segments=[[0,left-gap/2],[left+gap/2,right-gap/2],[right+gap/2,width]];
  const partitions:HomeworldInteriorPartitionV72[]=segments.map(([a,b],i)=>({id:room.buildingId+'-crosswall-'+i,x:a,y:line-thickness/2,width:b-a,depth:thickness,orientation:'horizontal',cutawayHeight:42}));
  partitions.push({id:room.buildingId+'-wingwall',x:width/2-thickness/2,y:10,width:thickness,depth:line-10,orientation:'vertical',cutawayHeight:42});
  return {zones,partitions,doorways:[{id:room.buildingId+'-west-passage',x:left,y:line,width:gap},{id:room.buildingId+'-east-passage',x:right,y:line,width:gap}],lore:'original-public-wing' as const};
}
/** Three usable spaces instead of one small identical reception square. Native
 * furnishings remain independent; the model preserves every existing service ID. */
export function homeworldFunctionalInteriorV72(room:HomeworldInteriorV64):HomeworldInteriorV64{
  const plan=homeworldInteriorPartitionPlanV72(room);if(!plan)return room;
  const [west,east]=[plan.zones[1],plan.zones[2]],w=room.width,d=room.depth;
  const prop=(name:string,kind:HomeworldInteriorPropV64['kind'],x:number,y:number,width=76,height=70):HomeworldInteriorPropV64=>({id:room.buildingId+'-v72-'+name,kind,x,y,width,height,halfWidth:25,halfDepth:15});
  const props=[prop('west-receiving-bench','bench',w*.13,d*.82,84,48),prop('east-receiving-bench','bench',w*.86,d*.82,84,48),
    prop('west-rear-storage','storage-locker',w*.13,d*.43,66,76),prop('east-rear-storage','storage-locker',w*.86,d*.43,66,76)];
  const features:Record<string,readonly [HomeworldFurnitureArtIdV72,HomeworldFurnitureArtIdV72]>={
    'throne-audience':['ceremonial-seat','register-desk'],'training-hall':['training-gong','clothing-rack'],
    'deep-forge':['artisan-bench','sealed-jars'],'memory-vault':['register-desk','convoy-crates'],
    'clan-lodge':['treatment-couch','meal-table'],'market-armory':['clothing-rack','convoy-crates'],
  };
  const feature=features[room.buildingId];
  const furniture:HomeworldFurnitureInstanceV72[]=[
    {id:room.buildingId+'-v72-role-west',artId:feature[0],x:w*.25,y:Math.max(feature[0]==='treatment-couch'?100:90,d*.17),scale:.78},
    {id:room.buildingId+'-v72-role-east',artId:feature[1],x:w*.75,y:Math.max(90,d*.17),scale:.78},
    {id:room.buildingId+'-v72-foyer-light-west',artId:'resin-lantern',x:w*.13,y:d*.64,scale:.66},
    {id:room.buildingId+'-v72-foyer-light-east',artId:'resin-lantern',x:w*.86,y:d*.64,scale:.66},
    {id:room.buildingId+'-v72-banner-east',artId:'clan-banner',x:w*.61,y:d*.43,scale:.55},
  ];
  return {...room,title:room.buildingId==='throne-audience'?'Citadelle · aile publique':room.title,
    description:room.description+' Trois espaces reliés à pied : '+plan.zones.map(zone=>zone.label.toLowerCase()).join(', ')+'. Les appartements privés et étages non visitables ne sont pas simulés.',
    points:room.points.map((p,i)=>({...p,x:(i===0?west:east).x+(i===0?west:east).width/2,y:d*.33})),props,furniture,partitions:plan.partitions,zones:plan.zones};
}
export function homeworldInteriorPartitionBlocksV72(room:Pick<HomeworldInteriorV64,'partitions'>,point:{x:number;y:number},footprint:{halfWidth:number;halfDepth:number}){
  return (room.partitions??[]).some(wall=>point.x+footprint.halfWidth>wall.x&&point.x-footprint.halfWidth<wall.x+wall.width&&point.y+footprint.halfDepth>wall.y&&point.y-footprint.halfDepth<wall.y+wall.depth);
}
