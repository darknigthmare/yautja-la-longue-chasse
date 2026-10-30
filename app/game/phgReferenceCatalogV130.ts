/** V130: named-source reference index for studio selection, NEVER original PHG UVs. */
import { PHG_V129_PATCH_MATERIALS, PHG_V129_PATCH_EVIDENCE } from "./phgPatchStudiesV129.ts";
import { PHG_V128_REFERENCES } from "./phgPlatformStudiesV128.ts";
import { PHG_HISTORICAL_STUDIES_V127 } from "./phgHistoricalMaterialsV127.ts";
import { PHG_RECENT_CANDIDATES_V126 } from "./phgRecentMaterialsV126.ts";
import { PHG_VISUAL_STUDIES_V125 } from "./hunterChromaticsV113.ts";
import recent from "./data/phgRecentV126Catalog.json" with { type:"json" };

type PhgSourceKindV130 = "named-patch" | "menu-highlight" | "community-description" | "promo-render";
export interface PhgReferenceV130 {
 readonly materialId: string;
 readonly name: string;
 readonly url: string;
 readonly kind: PhgSourceKindV130;
 readonly exactTextureVerified: false;
 readonly directUvAvailable: false;
 readonly caveat: string;
}
const patch129 = PHG_V129_PATCH_MATERIALS.map((item):PhgReferenceV130 => {
 const record=PHG_V129_PATCH_EVIDENCE.find(x=>item.id==="phg-study-v129-"+x.id);
 return {
  materialId:item.id,name:item.label,url:record?.sourceUrl??"https://forum.predator.illfonic.com/t/patch-notes-2-08/15883",
  kind:"named-patch",exactTextureVerified:false,directUvAvailable:false,
  caveat:"Nom de variante confirmé. Palette du matériau généré non certifiée.",
 };
});
const patch128 = PHG_V128_REFERENCES.map((item):PhgReferenceV130 => ({
 materialId:"phg-study-v128-"+item.id,name:item.name,url:item.source,
 kind:item.id==="exiled-marbled-bronze"?"menu-highlight":"community-description",
 exactTextureVerified:false,directUvAvailable:false,
 caveat:item.id==="exiled-marbled-bronze"
 ? "La ligne Exiled Marbled/Bronze est surlignée, mais Elder reste coché dans la capture."
 : "Existence ou évolution de la variante signalée ; couleurs générées non certifiées.",
}));
const historic = PHG_HISTORICAL_STUDIES_V127.map((m):PhgReferenceV130=>({
 materialId:m.id,name:m.label,
 url:m.id.endsWith("aurora")?"https://forum.predator.illfonic.com/t/patch-notes-2-39/27316"
 : "https://forum.predator.illfonic.com/t/patch-notes-2-08/15883",
 kind:"named-patch",exactTextureVerified:false,directUvAvailable:false,
 caveat:"Identité documentée dans une note officielle ; étude 2D non pixel-identique.",
}));
const recent4 = PHG_RECENT_CANDIDATES_V126.map((m):PhgReferenceV130=>{
 const id=m.id.replace(/^phg-study-v126-/,"");
 const source=recent.items.find(x=>x.id===id);
 return {materialId:m.id,name:m.label,
 url:source?.referenceUrl??"https://forum.predator.illfonic.com/t/patch-notes-3-2-0/36078",
 kind:"promo-render",exactTextureVerified:false,directUvAvailable:false,
 caveat:"Silhouette promotionnelle, pas une capture de la palette choisie ni du mapping UV."};
});
const prior12=PHG_VISUAL_STUDIES_V125.map((m):PhgReferenceV130=>({
 materialId:m.id,name:m.label,
 url:m.id.includes("feral_post")?
 "https://forum.predator.illfonic.com/t/the-jotun-predator-has-arrived/37412":
 "https://forum.predator.illfonic.com/t/patch-2-0-part-ii/13552",
 kind:"named-patch",exactTextureVerified:false,directUvAvailable:false,
 caveat:"Noms de la famille attestés ; correspondance des pixels 2D non prouvée.",
}));
export const PHG_REFERENCE_CATALOG_V130:readonly PhgReferenceV130[]=Object.freeze([
 ...patch129,...patch128,...historic,...recent4,...prior12,
]);
/** No URL is derived from a user-supplied save ID. */
export function phgMaterialReferenceV130(materialId:unknown):PhgReferenceV130|null {
 if(typeof materialId!=="string")return null;
 return PHG_REFERENCE_CATALOG_V130.find(x=>x.materialId===materialId)??null;
}
