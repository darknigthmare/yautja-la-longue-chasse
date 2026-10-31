/** PHG 2025–2026: original material studies; NOT ripped UVs or film-class aliases. */
import catalog from "./data/phgRecentV126Catalog.json" with { type: "json" };
import state from "./data/phgRecentV126Installed.json" with { type: "json" };
import type { ChromaticMaterialV113 } from "./hunterChromaticsV113.ts";

const available = new Set<string>(state.installed as readonly string[]);
const bundleMatches = String(state.bundleSha256 ?? "") === catalog.bundleSha256;
export const PHG_RECENT_CANDIDATES_V126: readonly ChromaticMaterialV113[] =
  Object.freeze(catalog.items.map((item): ChromaticMaterialV113 => {
    const installed = bundleMatches && available.has(item.id);
    return {
      id:"phg-study-v126-" + item.id,
      label:"Étude V126 · " + item.label,
      channel:item.channel as ChromaticMaterialV113["channel"],
      status:installed ? "integrated" : "drive-only",
      evidence:"provisional",
      src:installed ? catalog.atlasPath : null,
      sourceFile:"PHG_V126_Recent_Material_Studies.zip",
      atlas:item.atlas,
      note:"Matière reconstituée d'après l'apparence promotionnelle ; UV et fidélité 1:1 non certifiées. " + item.referenceUrl,
    };
  }));
export const PHG_RECENT_UPDATES_V126 = Object.freeze([
  {date:"2026-07-28",type:"weapon-unlock",title:"Yautja Sword gratuite au niveau 105",
   url:"https://store.steampowered.com/app/1556200/Predator_Hunting_Grounds/",skinAdded:false},
  {date:"2026-04-28",type:"dlc",title:"Father Predator (PHG) et épée Yautja — 3.7.0",
   url:"https://forum.predator.illfonic.com/t/the-father-predator-joins-the-hunt/37649",skinAdded:true},
  {date:"2026-01-20",type:"dlc-and-skin-update",
   title:"Jotun, Shock Gauntlet, Feral Default modifié — 3.6.0",
   url:"https://forum.predator.illfonic.com/t/the-jotun-predator-has-arrived/37412",skinAdded:true},
] as const);
