/** Original supplemental planetary material studies. They do not silently
 * replace the V115 materials encoded by existing world IDs. */
export type PlanetTextureChannelV125 = "albedo" | "height" | "normal" | "roughness" | "emissive";
export type PlanetTextureDomainV125 = "land" | "liquid";
export type PlanetTexturePatternV125 = "strata" | "dunes" | "cells" | "veins" | "cracks" | "currents" | "facets" | "bubbles";
export interface PlanetTextureDefinitionV125 {
  id: string; name: string; domain: PlanetTextureDomainV125; origin: "earthlike" | "alien";
  pattern: PlanetTexturePatternV125; description: string; frequency: number; detail: number;
  baseColor: readonly [number, number, number]; roughness: number; emission: number;
}

/** Eight Earth-like and eight alien textures for each substrate domain. */
const definitions: readonly [
  string, string, PlanetTextureDomainV125, "earthlike" | "alien", PlanetTexturePatternV125,
  string, number, number, readonly [number, number, number], number, number
][] = [
  ["land-loess", "Lœss stratifié", "land", "earthlike", "strata", "Sédiments fins et lits de poussière", 7,.48,[186,158,121],.82,0],
  ["land-redclay", "Argile rouge", "land", "earthlike", "cracks", "Fentes de dessiccation et argiles ferrugineuses", 11,.72,[169,91,64],.9,0],
  ["land-riverdelta", "Delta alluvial", "land", "earthlike", "veins", "Ramification de chenaux limoneux", 9,.65,[137,129,96],.69,0],
  ["land-karst", "Karst calcaire", "land", "earthlike", "facets", "Dalles calcaires et fissures de dissolution", 12,.75,[190,186,166],.74,0],
  ["land-gravel", "Graviers glaciaires", "land", "earthlike", "cells", "Galets, moraines et pierres roulées", 16,.59,[151,159,160],.86,0],
  ["land-peat", "Tourbière dense", "land", "earthlike", "bubbles", "Humus humide à alvéoles sombres", 10,.54,[76,88,65],.76,0],
  ["land-white-sand", "Sable siliceux", "land", "earthlike", "dunes", "Vagues éoliennes, silice pâle et stries", 14,.4,[205,197,165],.88,0],
  ["land-permafrost", "Permafrost fracturé", "land", "earthlike", "cracks", "Givre, pierres froides et polygones gelés", 9,.82,[168,187,190],.72,0],
  ["land-bioceramic", "Biocéramique", "land", "alien", "cells", "Cellules minéralisées à contours arrondis", 14,.78,[105,150,144],.54,.06],
  ["land-vascular-basalt", "Basalte vasculaire", "land", "alien", "veins", "Filaments ferrominéraux profondément ramifiés", 11,.94,[106,88,108],.77,.07],
  ["land-hex-prism", "Prismes exotiques", "land", "alien", "facets", "Réseau de clivages polyédriques", 18,.92,[109,140,166],.59,.04],
  ["land-phosphor", "Strates phosphorescentes", "land", "alien", "strata", "Couches lumineuses et croûtes vitrifiées", 13,.64,[103,148,111],.65,.28],
  ["land-silicon-honeycomb", "Ruche silicatée", "land", "alien", "cells", "Microalvéoles cristallines et nodules", 19,.77,[154,139,177],.51,.09],
  ["land-metal-root", "Racines métalliques", "land", "alien", "veins", "Dendrites d'alliage sur roches noires", 17,.84,[114,113,128],.43,.12],
  ["land-glass-erg", "Erg de verre", "land", "alien", "dunes", "Dunes vitrifiées et arêtes iridescentes", 12,.89,[141,155,182],.3,.03],
  ["land-spore-bed", "Lits sporifères", "land", "alien", "bubbles", "Alvéoles biologiques dans une roche poreuse", 15,.83,[123,136,98],.79,.11],
  ["liquid-estuary", "Mélange estuarien", "liquid", "earthlike", "currents", "Confluence de sédiments et marées", 7,.52,[89,135,139],.17,0],
  ["liquid-iceflow", "Banquise dérivante", "liquid", "earthlike", "facets", "Floes angulaires sur eau froide", 9,.82,[171,203,216],.4,0],
  ["liquid-tidal-foam", "Écume de marée", "liquid", "earthlike", "currents", "Lignes de ressac et ridelettes", 17,.57,[119,168,179],.12,0],
  ["liquid-bogwater", "Eau tourbeuse", "liquid", "earthlike", "bubbles", "Tourbillons lents et matières en suspension", 10,.59,[79,110,84],.23,0],
  ["liquid-whitewater", "Torrent rapide", "liquid", "earthlike", "dunes", "Crêtes serrées et écoulement turbulent", 18,.68,[127,165,188],.1,0],
  ["liquid-silt", "Courants limoneux", "liquid", "earthlike", "veins", "Veines brunes et filaments de vase", 8,.62,[150,134,111],.3,0],
  ["liquid-sulfurlake", "Bassin sulfuré", "liquid", "earthlike", "cells", "Nappes minérales et bulles de soufre", 13,.65,[163,164,86],.35,0],
  ["liquid-saltlake", "Saumure irisée", "liquid", "earthlike", "strata", "Couches de salinité et reflets cristallins", 12,.49,[172,139,169],.26,0],
  ["liquid-violet-acid", "Acide ultraviolet", "liquid", "alien", "currents", "Courants corrosifs fictifs et traces violettes", 16,.81,[137,92,185],.24,.33],
  ["liquid-biolume-brine", "Saumure bioluminescente", "liquid", "alien", "veins", "Filaments lumineux dans un solvant coloré", 14,.83,[81,160,150],.18,.39],
  ["liquid-mercury-film", "Film métallique", "liquid", "alien", "dunes", "Rubans métalliques et interférences", 15,.8,[167,177,199],.05,.05],
  ["liquid-magma-crust", "Magma à croûtes", "liquid", "alien", "cracks", "Roches flottantes et fissures incandescentes", 11,.91,[172,88,69],.57,.57],
  ["liquid-cryo-solvent", "Cryosolvant", "liquid", "alien", "cells", "Cellules gelées dans un liquide fictionnel", 13,.76,[106,161,206],.21,.23],
  ["liquid-plasma-braid", "Plasma tressé", "liquid", "alien", "veins", "Arcs énergétiques abstraits et nœuds", 19,.96,[165,107,192],.09,.71],
  ["liquid-spore-ooze", "Mucilage sporifère", "liquid", "alien", "bubbles", "Matrice visqueuse et microbulles", 12,.86,[136,138,108],.67,.17],
  ["liquid-black-resin", "Résine abyssale", "liquid", "alien", "currents", "Rubans sombres et franges vitreuses", 9,.89,[53,65,82],.3,.08],
];
export const WAR_PLANET_TEXTURES_V125: readonly PlanetTextureDefinitionV125[] = Object.freeze(definitions.map(([id,name,domain,origin,pattern,description,frequency,detail,baseColor,roughness,emission]) =>
  Object.freeze({id,name,domain,origin,pattern,description,frequency,detail,baseColor,roughness,emission})));
export const WAR_PLANET_TEXTURE_COUNT_V125 = 32;
export const WAR_PLANET_TEXTURE_CHANNELS_V125: readonly PlanetTextureChannelV125[] =
  ["albedo","height","normal","roughness","emissive"] as const;
export function findPlanetTextureV125(id: string) {
  return WAR_PLANET_TEXTURES_V125.find(item => item.id === id);
}
const tau = Math.PI * 2;
const clamp = (n:number) => Math.max(0, Math.min(255, Math.round(n)));
const frac = (n:number) => n - Math.floor(n);
/** Periodic coherent noise. Opposite borders meet without assuming
 * the V115 renderer has any special per-texture seam padding. */
function hash(x:number, y:number, seed:number) {
  let h = Math.imul(x + seed, 374761393) ^ Math.imul(y - seed, 668265263);
  h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function lattice(u:number, v:number, f:number, seed:number) {
  const x = u*f, y = v*f, xi=Math.floor(x), yi=Math.floor(y);
  const a=frac(x), b=frac(y), sx=a*a*(3-2*a), sy=b*b*(3-2*b);
  const h=(xx:number,yy:number)=>hash((xx%f+f)%f,(yy%f+f)%f,seed);
  const low=h(xi,yi)*(1-sx)+h(xi+1,yi)*sx;
  const high=h(xi,yi+1)*(1-sx)+h(xi+1,yi+1)*sx;
  return low*(1-sy)+high*sy;
}
function heightAt(u:number,v:number, material:PlanetTextureDefinitionV125, seed:number) {
  const f=material.frequency, n1=lattice(u,v,f,seed), n2=lattice(u,v,2*f,seed+11), n3=lattice(u,v,4*f,seed+29);
  const fractal=n1*.52+n2*.33+n3*.15;
  const phase=tau*f*u+Math.sin(tau*v*2)*.67+n1*3.1;
  const cross=tau*f*v+n2*4;
  let form=fractal;
  switch(material.pattern) {
    case "strata": form=fractal*.44+Math.sin(cross+n1*2)*.28+.28;break;
    case "dunes": form=fractal*.5+Math.sin(phase+Math.sin(cross)*.5)*.25+.25;break;
    case "cells": form=fractal*.46+Math.abs(Math.sin(phase)*Math.cos(cross))*.54;break;
    case "veins": form=fractal*.52+Math.pow(Math.abs(Math.sin(phase+n2*8)),7)*.48;break;
    case "cracks": form=fractal*.47+Math.pow(Math.abs(Math.sin(phase+n3*9)),13)*.53;break;
    case "currents": form=fractal*.49+Math.sin(phase+Math.sin(cross)*3.0)*.255+.255;break;
    case "facets": form=fractal*.4+Math.abs(Math.cos(phase)*Math.sin(cross))*.6;break;
    case "bubbles": form=fractal*.48+Math.pow(Math.abs(Math.sin(phase)*Math.sin(cross)),2)*.52;break;
  }
  return Math.max(0,Math.min(1,.5+(form-.5)*material.detail*1.65));
}
export function createPlanetTextureCanvasV125(
  id: string, channel: PlanetTextureChannelV125 = "albedo", size = 256, seed = 0,
): HTMLCanvasElement {
  const material=findPlanetTextureV125(id);
  if(!material || !WAR_PLANET_TEXTURE_CHANNELS_V125.includes(channel) || !Number.isInteger(size) || size<16 || size>1024 ||
    !Number.isInteger(seed) || seed<0 || seed>0xffffffff) throw new RangeError("Matière planétaire V125 invalide.");
  const canvas=document.createElement("canvas"); canvas.width=size; canvas.height=size;
  const ctx=canvas.getContext("2d");
  if(!ctx) throw new Error("Canvas des matières planétaires indisponible.");
  const img=ctx.createImageData(size,size), h=new Float32Array(size*size);
  const hashSeed=((seed >>> 0) ^ (WAR_PLANET_TEXTURES_V125.indexOf(material)+1)*1597334677) >>> 0;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)h[y*size+x]=heightAt(x/size,y/size,material,hashSeed);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const idx=y*size+x, p=idx*4, level=h[idx], dh=(level-.5)*2;
    let r=0,g=0,b=0;
    if(channel==="albedo"){
      const tint=dh*57;
      r=clamp(material.baseColor[0]+tint);
      g=clamp(material.baseColor[1]+tint);
      b=clamp(material.baseColor[2]+tint);
    }else if(channel==="normal"){
      const prev=h[y*size+(x+size-1)%size],next=h[y*size+(x+1)%size];
      const top=h[((y+size-1)%size)*size+x],bottom=h[((y+1)%size)*size+x];
      const nx=(prev-next)*2.2, ny=(top-bottom)*2.2;
      const inv=1/Math.hypot(nx,ny,1);
      r=clamp((nx*inv*.5+.5)*255);g=clamp((ny*inv*.5+.5)*255);b=clamp((1*inv*.5+.5)*255);
    }else if(channel==="height"){r=g=b=clamp(level*255);}
    else if(channel==="roughness"){r=g=b=clamp((material.roughness+dh*.14)*255);}
    else if(channel==="emissive"){
      const value=material.emission * Math.pow(Math.max(0,level-.46)*2,2);
      r=clamp(material.baseColor[0]*value);
      g=clamp(material.baseColor[1]*value);
      b=clamp(material.baseColor[2]*value);
    }
    img.data[p]=r;img.data[p+1]=g;img.data[p+2]=b;img.data[p+3]=255;
  }
  ctx.putImageData(img,0,0);
  return canvas;
}
