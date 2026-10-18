import source from '../data/homeworldRegionalWatchArtV86.json';
import type {HomeworldRegionIdV68,RegionResidentV68} from './homeworldRegionsV68';

export const HOMEWORLD_REGIONAL_WATCH_ART_V86=source;
export type RegionalWatchArtV86=typeof source.profiles[number];
export interface RegionalWatchQueryV86 {
 readonly regionId:HomeworldRegionIdV68;readonly clanName:string;
 readonly resident:Pick<RegionResidentV68,'id'|'role'|'morphId'|'route'>;
 readonly moving?:boolean;readonly assetId?:string;
}
/** These ten explicit appearance bindings do not borrow a profile's identity.
 * Only an already stationary, adult classic watch occupation in its own clan
 * may use the full source PNG. Super, young, civilian and moving actors keep
 * their original bodies; an idle pause on a walking route is insufficient. */
export function regionalWatchVariantsV86({regionId,clanName,resident,moving=false}:RegionalWatchQueryV86):readonly RegionalWatchArtV86[]{
 if(moving||resident.route.length!==1)return[];
 const binding=source.bindings.find(b=>b.regionId===regionId&&b.clanName===clanName
  &&b.residentId===resident.id&&b.residentRole===resident.role&&b.morphId===resident.morphId);
 if(!binding)return[];
 return source.profiles.filter(p=>p.regionId===binding.regionId&&p.clanId===binding.clanId
  &&p.clanName===binding.clanName&&p.kind==='npc'&&p.lifeStage===binding.lifeStage
  &&p.morphId===binding.morphId&&binding.allowedSourceRoles.includes(p.sourceRole)
  &&p.motionStatus==='single-pose-static').slice().sort((a,b)=>
   Number(b.sourceRole===source.defaultSourceRole)-Number(a.sourceRole===source.defaultSourceRole)||a.assetId.localeCompare(b.assetId));
}
/** An unavailable explicit variant falls back to the preserved modular actor,
 * never another clan, role, named person or a different costume automatically. */
export function regionalWatchArtV86(query:RegionalWatchQueryV86):RegionalWatchArtV86|null{
 const variants=regionalWatchVariantsV86(query);
 return(query.assetId?variants.find(p=>p.assetId===query.assetId):variants[0])??null;
}
/** Full native canvas, one uniform scale, no crop/rotation/mirroring. Source
 * sole socket lands at the actor's unchanged ground origin. Alpha margins and
 * equipment remain present, distinct from the hundred-unit adult body height.
 * This visual footprint creates no collider or extra terrain. */
export function regionalWatchPlacementV86(art:RegionalWatchArtV86,bodyHeight=100){
 const height=Number.isFinite(bodyHeight)&&bodyHeight>0?bodyHeight:100,scale=height/art.bodyHeightPixels;
 return{left:-art.pivotPixels.x*scale,top:-art.pivotPixels.y*scale,
  width:art.width*scale,height:art.height*scale,scale,bodyHeight:height};
}
