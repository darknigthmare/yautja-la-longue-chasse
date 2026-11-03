/** Physical contact is not the same as the space necessary to use an object.
 * This pure module is shared by both native-placement compilers and audits;
 * it never imports a compiled city and therefore cannot form a registry cycle. */
export const HOMEWORLD_CLEARANCES_V81={actorWidth:48,actorDepth:28,personPassage:96,comfortPassage:128,twoWayPassage:160,mainStreet:192,processionalRoute:280,doorDepth:128,intersection:160} as const;
export type HomeworldUsageFamilyV81='bench'|'table'|'market'|'forge'|'cargo'|'rack'|'archive'|'barrier'|'lamp'|'banner'|'mineral'|'structure';
export interface HomeworldEnvelopeV81 {readonly left:number;readonly right:number;readonly top:number;readonly bottom:number}
type Point={readonly x:number;readonly y:number};
export function homeworldAssetRoleV81(id:string):{family:HomeworldUsageFamilyV81;function:string;usageWidth:number;usageDepth:number;socialMargin:number;nativeFacing:'left'|'right'|'front';structural:boolean}{
 const key=id.replace('court-native-v80:','');
 const facing=key.includes('left')?'left':key.includes('right')?'right':'front';
 if(/bench|seat/.test(key))return{family:'bench',function:'rest',usageWidth:96,usageDepth:96,socialMargin:32,nativeFacing:facing,structural:false};
 if(/stall|canopy/.test(key))return{family:'market',function:'exchange',usageWidth:128,usageDepth:128,socialMargin:32,nativeFacing:facing,structural:false};
 if(/forge-workstation/.test(key))return{family:'forge',function:'work',usageWidth:144,usageDepth:144,socialMargin:64,nativeFacing:facing,structural:false};
 if(/table/.test(key))return{family:'table',function:'clan',usageWidth:128,usageDepth:112,socialMargin:40,nativeFacing:facing,structural:false};
 if(/cargo|sealed-cargo|container|crates/.test(key))return{family:'cargo',function:'storage',usageWidth:112,usageDepth:128,socialMargin:24,nativeFacing:facing,structural:false};
 if(/rack|shelf/.test(key))return{family:'rack',function:/archive/.test(key)?'consultation':'maintenance',usageWidth:96,usageDepth:96,socialMargin:16,nativeFacing:facing,structural:false};
 if(/lectern/.test(key))return{family:'archive',function:'consultation',usageWidth:96,usageDepth:112,socialMargin:24,nativeFacing:facing,structural:false};
 if(/wall|retaining|barrier/.test(key))return{family:'barrier',function:'structure',usageWidth:0,usageDepth:0,socialMargin:12,nativeFacing:facing,structural:true};
 if(/lamp|lantern/.test(key))return{family:'lamp',function:'light',usageWidth:0,usageDepth:0,socialMargin:16,nativeFacing:facing,structural:true};
 if(/banner/.test(key))return{family:'banner',function:'clan',usageWidth:0,usageDepth:0,socialMargin:16,nativeFacing:facing,structural:true};
 if(/basin|planter|cistern/.test(key))return{family:'mineral',function:'rest',usageWidth:/cistern/.test(key)?96:0,usageDepth:/cistern/.test(key)?96:0,socialMargin:20,nativeFacing:facing,structural:false};
 return{family:'structure',function:'structure',usageWidth:0,usageDepth:0,socialMargin:12,nativeFacing:facing,structural:true};
}
export function homeworldEnvelopeBoundsV81(polygon:readonly Point[]):HomeworldEnvelopeV81 {
 return{left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),top:Math.min(...polygon.map(p=>p.y)),bottom:Math.max(...polygon.map(p=>p.y))};
}
export function homeworldEnvelopesOverlapV81(a:HomeworldEnvelopeV81,b:HomeworldEnvelopeV81,margin=0){return a.left-margin<b.right&&a.right+margin>b.left&&a.top-margin<b.bottom&&a.bottom+margin>b.top;}
export function homeworldEnvelopeDistanceV81(a:HomeworldEnvelopeV81,b:HomeworldEnvelopeV81){return Math.hypot(Math.max(0,a.left-b.right,b.left-a.right),Math.max(0,a.top-b.bottom,b.top-a.bottom));}
export function homeworldUsageEnvelopesV81(artId:string,polygon:readonly Point[]){
 const physical=homeworldEnvelopeBoundsV81(polygon),role=homeworldAssetRoleV81(artId),x=(physical.left+physical.right)/2,y=(physical.top+physical.bottom)/2;
 // A native oblique item opens towards its already painted side. A side-view
 // asset is never spun to satisfy a lot; an incompatible candidate is refused.
 const usage=role.usageWidth===0?null:role.nativeFacing==='left'
  ?{left:physical.left-role.usageWidth,right:physical.left,top:y-role.usageDepth/2,bottom:y+role.usageDepth/2}
  :role.nativeFacing==='right'?{left:physical.right,right:physical.right+role.usageWidth,top:y-role.usageDepth/2,bottom:y+role.usageDepth/2}
  :{left:x-role.usageWidth/2,right:x+role.usageWidth/2,top:physical.bottom,bottom:physical.bottom+role.usageDepth};
 return{physical,usage,social:{left:physical.left-role.socialMargin,right:physical.right+role.socialMargin,top:physical.top-role.socialMargin,bottom:physical.bottom+role.socialMargin},role};
}
