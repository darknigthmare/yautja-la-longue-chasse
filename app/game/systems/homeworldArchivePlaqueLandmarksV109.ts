import type {SaveGame} from '../types';
import type {HomeworldAtlasLandmarkV83} from './homeworldAtlasLandmarksV83';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as b,archivePlaqueArtAdmittedV109} from './homeworldArchivePlaqueDefinitionV109';
export function homeworldArchivePlaqueLandmarksV109(save?:SaveGame):HomeworldAtlasLandmarkV83[]{
 if(!save?.homeworld.visitedDistrictIds.includes('port')||!archivePlaqueArtAdmittedV109())return[];
 const common={levelId:'0' as const,district:'Quai oriental',buildingId:null,pointId:null,regionId:null,access:'open' as const,reason:'Rejoins ce lieu à pied. Le guide ne donne aucun accord et ne déplace aucune pièce.',keywords:['archives','K-17','plaque','empreinte','bord','fragment']};
 const receipt=save.homeworld.archivePlaqueV109?.receipt;
 const resume=receipt?.phase==='interrupted'&&!(receipt.failureSpoken&&!receipt.resumeSpoken)?[{...common,id:'archive-plaque-resume-v109',label:'Étude K-17 · dernier point confirmé',detail:'Reviens précisément ici pour reprendre les mêmes pièces, sans déplacement automatique.',category:'service' as const,position:{x:receipt.last.x,y:receipt.last.y-55}}]:[];
 const objects=receipt?.objects??b.objects.map(o=>({id:o.id,...o.origin,place:'source'}));
 return[...resume,{...common,id:b.npcId,label:b.npcName,detail:'Plaque nommée et empreinte distincte ; conserver l’incertitude documentaire.',category:'person',position:{x:b.post.x,y:b.post.y-55}},
 ...objects.filter(o=>o.place!=='carried'&&(o.id!=='fragment'||save.homeworld.archivePlaqueV109?.receipt?.resumeSpoken)).map(o=>({...common,id:'archive-plaque-object-'+o.id+'-v109',label:b.objects.find(d=>d.id===o.id)!.label,detail:'Objet indépendant, avec son lieu de découverte à relever.',category:'evidence' as const,position:{x:o.x,y:o.y+5}})),
 ...b.supports.map(s=>({...common,id:'archive-plaque-support-'+s.id+'-v109',label:s.label,detail:'Surface d’examen sur le dallage, réservée à une seule pièce.',category:'service' as const,position:{x:s.stand.x,y:s.stand.y-55}}))];
}
