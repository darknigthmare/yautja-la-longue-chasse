/** Additive version-1 checkpoint. This shape module has no world/homeworld
 * dependency: the save normalizer cannot recursively import its own model. */
export type HomeworldCheckpointLevelV77='0'|'+1'|'+2'|'-1A'|'-1B'|'-1C';
export interface HomeworldCheckpointV77 {
 version:1;layoutRevision:1;ownerCreatedAt:string;levelId:HomeworldCheckpointLevelV77;
 exterior:{x:number;y:number};interiorId:string|null;local:{x:number;y:number}|null;
}
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const point=(v:unknown,width:number,depth:number)=>record(v)&&typeof v.x==='number'&&typeof v.y==='number'&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=-480&&v.x<=width&&v.y>=-1600&&v.y<=depth;
export function inspectHomeworldCheckpointV77(v:unknown):'absent'|'valid'|'future-version'|'invalid-save'{
 if(v===undefined||v===null)return'absent';if(!record(v))return'invalid-save';
 if(typeof v.version==='number'&&v.version>1||typeof v.layoutRevision==='number'&&v.layoutRevision>1)return'future-version';
 if(v.version!==1||v.layoutRevision!==1||typeof v.ownerCreatedAt!=='string'||!v.ownerCreatedAt.length||v.ownerCreatedAt.length>100||!['0','+1','+2','-1A','-1B','-1C'].includes(String(v.levelId))||!point(v.exterior,10400,6400))return'invalid-save';
 if(v.interiorId===null)return v.local===null?'valid':'invalid-save';
 return typeof v.interiorId==='string'&&v.interiorId.length>0&&v.interiorId.length<100&&point(v.local,2400,2400)?'valid':'invalid-save';
}
export function normalizeHomeworldCheckpointV77(v:unknown):HomeworldCheckpointV77|undefined{
 if(inspectHomeworldCheckpointV77(v)!=='valid')return undefined;
 const q=v as HomeworldCheckpointV77;return{version:1,layoutRevision:1,ownerCreatedAt:q.ownerCreatedAt,levelId:q.levelId,exterior:{...q.exterior},interiorId:q.interiorId,local:q.local?{...q.local}:null};
}
