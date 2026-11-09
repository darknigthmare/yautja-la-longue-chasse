import assert from "node:assert/strict";
import test,{after} from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {build} from "esbuild";
const dir=await mkdtemp(join(tmpdir(),"planet-terrain-v152-"));
after(()=>rm(dir,{recursive:true,force:true}));
const bundle=await build({stdin:{contents:[
  'export * from "./app/game/systems/clanWarPlanetTerrainV152";',
  'export {generateWarPlanetV115,normalizeWarPlanetRecipeV115} from "./app/game/systems/clanWarPlanetGeneratorV115";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const file=join(dir,"terrain.mjs");await writeFile(file,bundle.outputFiles[0].text);
const api=await import(pathToFileURL(file));

function grid(width=128,height=64,maximum=8000) {
  const n=width*height,mask=new Uint8ClampedArray(n*4),rg16=new Uint8ClampedArray(n*4);
  for(let y=8;y<height-8;y++)for(let x=0;x<width;x++){
    if(x>44&&x<53)continue; // genuine non-land channel
    const k=y*width+x,reg=x<width/2?1:2,meters=Math.round((y-8)*65+(x%12)*40);
    const bits=Math.round(meters/maximum*65535),o=k*4;
    mask[o]=reg;mask[o+3]=255;
    rg16[o]=bits>>>8;rg16[o+1]=bits&255;rg16[o+3]=255;
  }
  const landPixels=Array.from({length:n},(_,k)=>rg16[k*4+3]===255).filter(Boolean).length;
  return {mask,raster:{
    width,height,maxElevationMeters:maximum,radiusKm:6371,rg16,
    preview:new Uint8ClampedArray(n*4),landPixels,waterPixels:n-landPixels,
    highestElevationMeters:maximum,
    regions:[{regionIndex:1,biome:"mountain",landPixels:landPixels/2,averageElevationMeters:0,maximumElevationMeters:maximum},
      {regionIndex:2,biome:"desert",landPixels:landPixels/2,averageElevationMeters:0,maximumElevationMeters:maximum}],
  }};
}
const {mask,raster}=grid();

test("V152 uses strictly the V150 land mask: no fabricated slopes in oceans, rivers or channels",()=>{
  const result=api.analyzePlanetTerrainSlopesV152(raster,mask);
  assert.equal(result.landPixels,raster.landPixels);
  assert.equal(result.counts.reduce((sum,n)=>sum+n,0),result.landPixels);
  assert.equal(result.regions.reduce((sum,r)=>sum+r.pixelCount,0),result.landPixels);
  for(const [x,y] of [[50,30],[7,0],[60,61]]){
    const k=y*128+x;
    assert.equal(result.gradeHundredthsPercent[k],0);
    assert.deepEqual([...result.preview.slice(k*4,k*4+4)],[0,0,0,0]);
  }
  assert(result.highestGradePercent>0);
});

test("V152 obeys radius in metres: identical terrain elevation on larger planet has gentler percentage grade",()=>{
  const small=api.analyzePlanetTerrainSlopesV152({...raster,radiusKm:1900},mask);
  const giant=api.analyzePlanetTerrainSlopesV152({...raster,radiusKm:21000},mask);
  assert.equal(small.landPixels,giant.landPixels);
  assert(small.highestGradePercent>giant.highestGradePercent);
  assert.deepEqual(small.regions.map(r=>r.regionIndex),giant.regions.map(r=>r.regionIndex));
});

test("V152 longitude seam is periodic; poles never sample the opposite hemisphere",()=>{
  const synthetic=grid();
  const map=api.analyzePlanetTerrainSlopesV152(synthetic.raster,synthetic.mask);
  const left=map.gradeHundredthsPercent[32*128+0];
  const right=map.gradeHundredthsPercent[32*128+127];
  assert(left>0&&right>0);
  assert.equal(map.preview[0*4+3],0);
  assert.equal(map.preview[(63*128+127)*4+3],0);
});

test("V152 strict reader rejects mismatched land mask and out-of-range region indices",()=>{
  const bad=new Uint8ClampedArray(mask);bad[(32*128+50)*4+3]=255;
  assert.throws(()=>api.analyzePlanetTerrainSlopesV152(raster,bad),/désynchronisées/);
  const unknown=new Uint8ClampedArray(mask);
  const index=20*128+20;unknown[index*4]=3;
  assert.throws(()=>api.analyzePlanetTerrainSlopesV152(raster,unknown),/inconnu/);
  assert.throws(()=>api.analyzePlanetTerrainSlopesV152({...raster,radiusKm:0},mask),/invalides/);
});

test("existing V115 war graph is preserved and every official route is classified without applying terrain restrictions",()=>{
  const world=api.generateWarPlanetV115(api.normalizeWarPlanetRecipeV115({
    seed:152123,territoryCount:24,regionCount:4,planetSize:"terran",landform:"archipelago",
  }));
  const before=JSON.stringify(world),slope=api.analyzePlanetTerrainSlopesV152(raster,mask);
  const dossier=api.samplePlanetTerrainRoutesV152(world,raster,slope);
  assert.equal(dossier.version,152);assert.equal(dossier.worldCode,world.id);
  assert.equal(dossier.routes.length,world.procedural.routes.length);
  assert.equal(dossier.routes.reduce(n=>n+1,0),
    Object.values(dossier.classCounts).reduce((n,v)=>n+v,0));
  assert(dossier.routes.every(route=>route.lengthKm>=0&&route.samples>0&&
    route.landSamples+route.nonLandSamples===route.samples&&
    Number.isFinite(route.maximumGradePercent)));
  assert(dossier.routes.some(route=>route.kind==="crossing"));
  assert(dossier.routes.filter(route=>route.kind==="crossing")
    .every(route=>route.class==="medium-crossing"));
  assert.equal(JSON.stringify(world),before);
});

test("V152 slope transparency and unchanged original bytes are deterministic under repeated analysis",()=>{
  const bytes=[...raster.rg16],regions=[...mask];
  assert.deepEqual(api.analyzePlanetTerrainSlopesV152(raster,mask),
    api.analyzePlanetTerrainSlopesV152(raster,mask));
  assert.deepEqual([...raster.rg16],bytes);
  assert.deepEqual([...mask],regions);
});
