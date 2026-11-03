import {homeworldBuildingGroundFrameV76,type HomeworldGeometryBuildingV64} from './homeworldGeometryV64';

/** Authored western approach joins the mausoleum paving to the existing Ash
 * causeway. Gateway pillars still own their complete original solid volumes. */
export const HOMEWORLD_FORECOURT_LINKS_V76=[{
 id:'forecourt-link-v76:trophy-mausoleum',label:'Allée occidentale du mausolée',kind:'passage' as const,accent:'#a29276',
 polygon:[{x:440,y:2070},{x:630,y:2070},{x:630,y:2220},{x:440,y:2220}],
},{
 id:'forecourt-link-v76:residence-clans-1',label:'Allée des délégations vers le palier du Conseil',kind:'passage' as const,accent:'#a29276',
 // V89: a 160u paved band with real end caps joins the relocated domestic
 // forecourt to the existing lower landing. City, world, renderer and codex
 // consume this same polygon; no invisible traversal permission is added.
 polygon:[{x:3889,y:2583},{x:4423,y:2931},{x:4511,y:2797},{x:3977,y:2449}],
}];

/** Painted and physical paving share these native ground polygons. The
 * mausoleum's western edge leaves the existing natural planting outside the
 * public ground. This adds local forecourts, not permission through masonry. */
export function homeworldForecourtsV76(buildings:readonly (HomeworldGeometryBuildingV64&{label:string})[]){
 return buildings.filter(b=>b.art?.groundFrame).map(building=>{
  const frame=homeworldBuildingGroundFrameV76(building);
  const left=frame.uMin+(building.id==='trophy-mausoleum'?30:-45),right=frame.uMax+45;
  const point=(u:number,v:number)=>({x:building.x+frame.tangent.x*u+frame.normal.x*v,
   y:building.y+frame.tangent.y*u+frame.normal.y*v});
  return {id:'forecourt-v76:'+building.id,label:'Parvis oblique · '+building.label,kind:'court' as const,accent:'#a29276',
   polygon:[point(left,frame.vFront-12),point(right,frame.vFront-12),point(right,frame.vFront+220),point(left,frame.vFront+220)]};
 });
}
