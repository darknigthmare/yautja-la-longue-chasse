import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import sharp from "sharp";
import path from "node:path";
const bundle=await build({stdin:{contents:`export * from "./app/game/youthArtManifest"; export * from "./app/game/youthTrainingRendering";`,resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,format:"esm",platform:"node",target:"es2022"});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
test("real Unblooded and mentor assets contain eighty nonempty native drawings with valid anchors",async()=>{
 const manifest=api.YOUTH_ART_MANIFEST,images=new Map();
 for(const src of api.youthArtSources(manifest)){const meta=await sharp(path.join("public",src)).metadata();images.set(src,{width:meta.width,height:meta.height});}
 assert.deepEqual(api.validateYouthArt(manifest,images),[]);
 const sourceSet=new Set();let frames=0;
 for(const actor of Object.values(manifest.actors))for(const atlas of Object.values(actor)){
  sourceSet.add(atlas.src);const file=path.join("public",atlas.src),meta=await sharp(file).metadata();assert.equal(meta.hasAlpha,true,atlas.src+" must have transparent margins");
  for(const clip of Object.values(atlas.clips))for(const frame of clip.frames){frames++;const [left,top,width,height]=frame.rect;const {data,info}=await sharp(file).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let visible=0;for(let index=info.channels-1;index<data.length;index+=info.channels)if(data[index]>16)visible++;assert(visible>100,atlas.src+" empty pose "+frame.rect.join(","));}
 }
 assert.equal(sourceSet.size,4);assert.equal(frames,80);
});
test("all eight modular props are separate nonempty transparent atlas cuts",async()=>{
 for(const[id,sprite]of Object.entries(api.YOUTH_ART_MANIFEST.props)){
  const [left,top,width,height]=sprite.rect,file=path.join("public",sprite.src),meta=await sharp(file).metadata();assert.equal(meta.hasAlpha,true,id+" must have transparent background");
  const {data,info}=await sharp(file).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let visible=0;for(let index=info.channels-1;index<data.length;index+=info.channels)if(data[index]>16)visible++;assert(visible>100,id+" is empty");
 }
 assert.equal(Object.keys(api.YOUTH_ART_MANIFEST.props).length,8);
});

test("V49 desert uses three separate nonempty clue crops and a calibrated original backdrop",async()=>{
 const manifest=api.YOUTH_ART_MANIFEST,props=manifest.desertProps;assert.deepEqual(Object.keys(props),["footprints","branch","stone"]);
 assert.equal(manifest.scenes.desert.groundY,727);const scene=await sharp(path.join("public",manifest.scenes.desert.src)).metadata();assert.equal(scene.width,1672);assert.equal(scene.height,941);
 const rectangles=new Set();for(const [id,sprite]of Object.entries(props)){
  rectangles.add(sprite.rect.join(","));const[left,top,width,height]=sprite.rect,file=path.join("public",sprite.src);assert.equal((await sharp(file).metadata()).hasAlpha,true);
  const{data,info}=await sharp(file).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let visible=0;for(let index=info.channels-1;index<data.length;index+=info.channels)if(data[index]>16)visible++;
  assert(visible>100,id+" is an actual independent bitmap clue");
 }
 assert.equal(rectangles.size,3);
});
