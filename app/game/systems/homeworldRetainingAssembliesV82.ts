import type {HomeworldLevelV77} from './homeworldWorldV77';

type Point={readonly x:number;readonly y:number};
export interface HomeworldRetainingSupportV82 {
 readonly id:string;readonly ownerId:string;readonly assemblyId:string;
 readonly levelId:HomeworldLevelV77;readonly label:string;
 readonly polygon:readonly Point[];readonly height:number;readonly material:'basalt-masonry';
 readonly provenance:'LORE_COMPATIBLE_ORIGINAL';readonly nativeStatus:'AUTHORED_GEOMETRY_NOT_NEW_RASTER';
}
/** The terminal bearings meet the retained native contact hulls. These are
 * authored masonry volumes, rendered as such: not four invented PNGs, a
 * stretched wall, invisible terrain or a claim of a complete energy enclosure.
 * V82 was requested without running new validation. */
export const HOMEWORLD_RETAINING_SUPPORTS_V82:readonly HomeworldRetainingSupportV82[]=[
 {id:'retaining-v82:halt-north:west-bearing',ownerId:'city-native-v78:terrace-retaining-front',assemblyId:'retaining-v82:halt-north',levelId:'-1A',label:'Piédroit occidental du soutènement de halte',
  polygon:[{x:2736,y:3998},{x:2795,y:3998},{x:2808,y:4023},{x:2792,y:4050},{x:2732,y:4050},{x:2718,y:4022}],height:116,material:'basalt-masonry',provenance:'LORE_COMPATIBLE_ORIGINAL',nativeStatus:'AUTHORED_GEOMETRY_NOT_NEW_RASTER'},
 {id:'retaining-v82:halt-north:east-bearing',ownerId:'city-native-v78:terrace-retaining-front',assemblyId:'retaining-v82:halt-north',levelId:'-1A',label:'Piédroit oriental avant la traverse',
  polygon:[{x:3183,y:3998},{x:3230,y:3998},{x:3240,y:4020},{x:3234,y:4048},{x:3190,y:4048},{x:3178,y:4027}],height:110,material:'basalt-masonry',provenance:'LORE_COMPATIBLE_ORIGINAL',nativeStatus:'AUTHORED_GEOMETRY_NOT_NEW_RASTER'},
 {id:'retaining-v82:halt-south:rear-bearing',ownerId:'civic-v81:court:lower-west-rest:wall',assemblyId:'retaining-v82:halt-south',levelId:'-1A',label:'Retour arrière du soutènement de cour',
  polygon:[{x:2693,y:4470},{x:2734,y:4468},{x:2747,y:4493},{x:2737,y:4521},{x:2697,y:4522},{x:2682,y:4496}],height:98,material:'basalt-masonry',provenance:'LORE_COMPATIBLE_ORIGINAL',nativeStatus:'AUTHORED_GEOMETRY_NOT_NEW_RASTER'},
 {id:'retaining-v82:halt-south:front-bearing',ownerId:'civic-v81:court:lower-west-rest:wall',assemblyId:'retaining-v82:halt-south',levelId:'-1A',label:'Retour avant du soutènement de cour',
  polygon:[{x:2748,y:4579},{x:2790,y:4576},{x:2808,y:4603},{x:2795,y:4632},{x:2752,y:4634},{x:2736,y:4608}],height:92,material:'basalt-masonry',provenance:'LORE_COMPATIBLE_ORIGINAL',nativeStatus:'AUTHORED_GEOMETRY_NOT_NEW_RASTER'},
];
export const HOMEWORLD_RETAINING_ASSEMBLIES_V82=[
 {id:'retaining-v82:halt-north',ownerId:'city-native-v78:terrace-retaining-front',levelId:'-1A' as const,label:'Soutènement du revers de la halte',
  nativeContacts:[{x:2772.2916666666665,y:4017.868818315133},{x:3206.3888888888887,y:4016.9486658396663}],
  function:'Les deux extrémités du mur natif entrent dans leurs piédroits. La face de mur et les terminaisons composent un même volume solide.'},
 {id:'retaining-v82:halt-south',ownerId:'civic-v81:court:lower-west-rest:wall',levelId:'-1A' as const,label:'Soutènement du retour sud de la cour',
  nativeContacts:[{x:2717.1301020408164,y:4495.898845347814},{x:2771.7729591836733,y:4604.508464605638}],
  function:'Les bras du retour natif sont repris par deux massifs maçonnés ; aucun enclos complet ni portail énergétique n’est affirmé.'},
] as const;

export function homeworldPointInsideRetainingSupportV82(point:Point,polygon:readonly Point[]){
 let positive=false,negative=false;
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],side=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);if(side>1e-8)positive=true;else if(side< -1e-8)negative=true;if(positive&&negative)return false;}
 return true;
}
export function homeworldRetainingTouchesV82(support:HomeworldRetainingSupportV82,p:Point,body:{halfWidth:number;halfDepth:number}){
 if(!body.halfWidth&&!body.halfDepth)return homeworldPointInsideRetainingSupportV82(p,support.polygon);
 const rect=[{x:p.x-body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y+body.halfDepth},{x:p.x-body.halfWidth,y:p.y+body.halfDepth}];
 for(const polygon of [support.polygon,rect])for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],nx=-(b.y-a.y),ny=b.x-a.x;
  const left=support.polygon.map(v=>v.x*nx+v.y*ny),right=rect.map(v=>v.x*nx+v.y*ny);
  if(Math.max(...left)<=Math.min(...right)||Math.max(...right)<=Math.min(...left))return false;
 }return true;
}
/** A structural member may share contact with its OWN bearing only. Player
 * collision still occupies the complete union; unrelated props never get an
 * overlap exemption and no native source/collider is shrunk. */
export const homeworldRetainingJointV82=(ownerId:string,otherId:string)=>HOMEWORLD_RETAINING_SUPPORTS_V82.some(s=>s.ownerId===ownerId&&s.id===otherId);
export const homeworldRetainingAssemblyV82=(ownerId:string)=>HOMEWORLD_RETAINING_ASSEMBLIES_V82.find(a=>a.ownerId===ownerId)??null;
export function homeworldRetainingRenderV82(s:HomeworldRetainingSupportV82,depthScale:number,elevation:number){
 const top=s.polygon.map(p=>({x:p.x,y:p.y*depthScale-elevation-s.height}));
 const faces=s.polygon.map((a,i)=>{const b=s.polygon[(i+1)%s.polygon.length];return{id:s.id+':face-'+i,polygon:[{x:a.x,y:a.y*depthScale-elevation},{x:b.x,y:b.y*depthScale-elevation},top[(i+1)%top.length],top[i]]};});
 return{id:s.id,top,faces,depth:Math.max(...s.polygon.map(p=>p.y)),physicalPolygon:s.polygon};
}
