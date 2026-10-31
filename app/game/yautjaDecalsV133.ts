/** V133 48 original Yautja decorative decals. Neither copied PHG pixels nor official UVs. */
import data from "./data/decalCatalogV133.json" with { type: "json" };
export type YautjaDecalZoneV133 = "biomask" | "face" | "body" | "armor";
export type DecalAnchorV133 = {x:number;y:number;width:number;height:number};
export const DECAL_FIELDS_V133 = {
  biomask:"maskDecalId",face:"faceDecalId",body:"bodyDecalId",armor:"armorDecalId",
} as const satisfies Record<YautjaDecalZoneV133,string>;
export const DECAL_ATLAS_PATH_V133 = data.atlasPath;
export const DECAL_ATLAS_SHA256_V133 = data.atlasSha256;
export const DECAL_ZONES_V133 = ["biomask","face","body","armor"] as const;

/** The x/y values are pixel offsets in the original 256×384 rig frame.
 * One original decal per zone; never flood an entire morph with a texture.
 */
export const DECAL_ANCHORS_V133: Readonly<Record<YautjaDecalZoneV133,DecalAnchorV133>> = Object.freeze({
  biomask:{x:122,y:36,width:45,height:39},
  face:{x:121,y:38,width:42,height:36},
  body:{x:112,y:108,width:62,height:66},
  armor:{x:116,y:113,width:67,height:56},
});
export const Y_A_U_T_J_A_DECALS_V133 = Object.freeze(data.records.map(record => ({
  ...record,src:data.atlasPath,
})));
export function yautjaDecalV133(zone:YautjaDecalZoneV133,id:unknown) {
  if(typeof id!=="string" || !/^clan-v133-(biomask|face|body|armor)-[a-z-]+$/.test(id))return null;
  return Y_A_U_T_J_A_DECALS_V133.find(item=>item.zone===zone&&item.id===id)??null;
}
export function normalizeDecalIdV133(zone:YautjaDecalZoneV133,value:unknown):string|null {
  return yautjaDecalV133(zone,value)?.id??null;
}
export function decalOfPaletteV133(zone:YautjaDecalZoneV133,raw:unknown) {
  if(!raw || typeof raw!=="object" || Array.isArray(raw))return null;
  const source=raw as Record<string,unknown>;
  return yautjaDecalV133(zone,source[DECAL_FIELDS_V133[zone]]);
}
export const PHG_WARPAINT_EVIDENCE_V133=Object.freeze({
  url:"https://forum.predator.illfonic.com/t/patch-notes-2-19/20975",
  officialNames:["Waves","Sun","Erode","Cortex","Retch","Attend"],
  actualPixelsInOriginalStudies:false,
  decalsInspiredNotCopied:true,
});
