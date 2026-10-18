import references from '../data/homeworldVillagePortraitReferencesV85.json';
import type {RecentSpriteSourceV85} from './recentSpriteLibraryV85';

const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g,' ').trim();
export const HOMEWORLD_VILLAGE_PORTRAIT_REFERENCES_V85=references.assets as readonly RecentSpriteSourceV85[];
/** These local watch occupations correspond to the supplied guetteur job.
 * No guide, artisan, child, healer or unnamed local person borrows this art.
 * This is a job/clan reference card, never a named person's body or portrait. */
const watchRoles=new Set(['veilleur','veilleuse','veilleuse de releve']);
export function homeworldVillagePortraitVariantsV85(clanName:string,role:string){
 if(!watchRoles.has(normalize(role)))return[];
 const clan=normalize(clanName);
 return HOMEWORLD_VILLAGE_PORTRAIT_REFERENCES_V85.filter(asset=>normalize(asset.groupLabel)===clan&&normalize(asset.role)==='guetteur')
  .slice().sort((a,b)=>Number(b.preferredVersion)-Number(a.preferredVersion)||b.priority-a.priority||a.id.localeCompare(b.id));
}
export function homeworldVillagePortraitReferenceV85(clanName:string,resident:{readonly id:string;readonly name:string;readonly role:string}){
 const asset=homeworldVillagePortraitVariantsV85(clanName,resident.role).find(asset=>asset.preferredVersion);
 return asset?{asset,residentId:resident.id,residentName:resident.name,originalRole:resident.role,
  sourceRole:asset.role,match:'documented-clan-and-watch-occupation' as const,
  identity:'reference-of-clan-job-not-named-person' as const}:null;
}
