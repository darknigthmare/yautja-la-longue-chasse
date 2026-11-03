/* eslint-disable @next/next/no-img-element -- original static source portrait */
import {homeworldVillagePortraitReferenceV85} from './systems/homeworldVillagePortraitsV85';
import styles from './HomeworldVillageLifeV69.module.css';

/** Read-only source beside the citizen. Never replace the native actor, feet,
 * costume or walking frames with this independently supplied static drawing. */
export default function HomeworldVillagePortraitV85({clanName,resident,x,y}:{clanName:string;resident:{id:string;name:string;role:string};x:number;y:number}){
 const reference=homeworldVillagePortraitReferenceV85(clanName,resident);if(!reference)return null;
 const{asset}=reference;
 return <figure className={styles.portraitReference} style={{left:x,top:y}} data-homeworld-portrait-reference-v85={resident.id}
  data-source-asset-v85={asset.id} data-source-clan-v85={asset.groupId} data-source-role-v85={asset.role} data-person-identity-v85={reference.identity}>
  <img src={asset.src} width={120} height={120} alt={`Guetteur · ${asset.groupLabel} · référence statique du catalogue`} loading="lazy" decoding="async"/>
  <figcaption><strong>{resident.name} · {resident.role}</strong><span>Référence du métier : {asset.role} · {asset.groupLabel}</span>
   <small>{asset.version} · dessin statique du clan, pas le visage identifié de cet habitant. Fidélité 1:1 non certifiée.</small></figcaption>
 </figure>;
}
