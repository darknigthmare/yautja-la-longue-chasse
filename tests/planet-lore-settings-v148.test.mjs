import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-lore-v148-"));
after(()=>rm(dir,{recursive:true,force:true}));
const b=await build({stdin:{contents:[
 'export * from "./app/game/systems/planetLoreSettingsV148";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const path=join(dir,"lore.mjs");await writeFile(path,b.outputFiles[0].text);const a=await import(pathToFileURL(path));

test("official film-setting sources distinguish terrestrial plots from alien planets",()=>{
 assert.equal(a.PLANET_CANON_STORY_SETTINGS_V148.length,5);
 assert(a.PLANET_CANON_STORY_SETTINGS_V148.every(a.validCanonStorySettingV148));
 assert.deepEqual(a.PLANET_CANON_STORY_SETTINGS_V148.filter(e=>e.world==="earth").map(e=>e.id),
   ["predator-1987","predator-2-1990","prey-2022"]);
 assert.deepEqual(a.PLANET_CANON_STORY_SETTINGS_V148.filter(e=>e.world!=="earth").map(e=>e.id),
   ["predators-2010","predator-badlands-2025"]);
});

test("only city-level Earth settings get a physical point; regions are not faked as coordinates",()=>{
 const pin=a.earthCanonFilmPinsV148("earth");
 assert.equal(pin.length,1);
 assert.equal(pin[0].id,"predator-2-1990");
 assert.deepEqual(pin[0].earthAnchor,[-118.2437,34.0522]);
 assert.equal(a.canonStoryEntriesForWorldV148("earth").length,3);
 assert.equal(a.PLANET_CANON_STORY_SETTINGS_V148.find(e=>e.id==="prey-2022").earthAnchor,null);
 assert.equal(a.PLANET_CANON_STORY_SETTINGS_V148.find(e=>e.id==="predator-1987").earthAnchor,null);
});

test("fictional planets cannot inherit real Earth landmarks or unidentified alien films",()=>{
 for(const code of ["proc-v115-abc","proc-v103-deadbeef","genna","badlands","korthas","predator-reserve"]){
  assert.equal(a.earthCanonFilmPinsV148(code).length,0,code);
  assert.equal(a.canonStoryEntriesForWorldV148(code).length,0,code);
 }
});

test("film city marker obeys the same orthographic/map Earth projection",()=>{
 const [pin]=a.earthCanonFilmPinsV148("earth");
 const map={projection:"map",width:768,height:384,longitude:2.35,latitude:48.85};
 const m=a.earthFilmMarkerPositionV148(pin,map);
 assert(m);assert(Math.abs(m.x-(61.7563/360*768))<.001);
 assert(Math.abs(m.y-(90-34.0522)/180*384)<.001);
 assert.equal(a.earthFilmMarkerPositionV148(pin,{...map,projection:"globe",width:512,height:512}),null,
   "Los Angeles must be hidden behind the Europe-centred globe");
 assert(a.earthFilmMarkerPositionV148(pin,{...map,projection:"globe",width:512,height:512,longitude:-150,latitude:0}),
   "Los Angeles must appear on the Pacific-facing globe");
});

test("a foreign or forged alien setting cannot acquire Earth coordinates",()=>{
 const alien=a.PLANET_CANON_STORY_SETTINGS_V148.find(e=>e.id==="predators-2010");
 assert.equal(a.validCanonStorySettingV148({...alien,earthAnchor:[-118,34],markerAccuracy:"approximate-city-center"}),false);
 assert.equal(a.validCanonStorySettingV148({...alien,precision:"city"}),false);
});
