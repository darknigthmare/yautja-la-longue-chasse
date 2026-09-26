import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { build } from "esbuild";
import { cageRoute } from "./helpers/youth-cage-played-route.mjs";
const bundle = await build({ stdin: { contents: `export * from "./app/game/youthArtManifest"; export * from "./app/game/youthTrainingRendering";`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const art = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const manifest = art.YOUTH_ART_MANIFEST, cage = manifest.cage, images = new Map();
for (const src of art.youthArtSources(manifest)) { const meta = await sharp(path.join("public", src)).metadata(); images.set(src, { width: meta.width, height: meta.height, src }); }
const provenance = JSON.parse(await readFile("docs/art/v53/youth-cage-provenance.json", "utf8"));
test("six original OpenAI sources are byte-identical, modular, decoded and calibrated", async () => {
  assert.equal(provenance.assets.length, 6); assert.deepEqual(art.validateYouthArt(manifest, images), []);
  for (const asset of provenance.assets) {
    const bytes = await readFile(path.join("public", asset.runtimePath)), meta = await sharp(bytes).metadata();
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256); assert.deepEqual([meta.width,meta.height],[asset.width,asset.height]);
    assert.equal(meta.hasAlpha, asset.id !== "cage-background");
  }
  assert.equal(new Set([cage.background.src,cage.structure.src,cage.floor.src]).size, 3);
});
test("sixteen distinct novice drawings have complete visible bounds and native orientations", async () => {
  const hashes = new Set();
  for (const side of [cage.novice.left, cage.novice.right]) for (const sprite of Object.values(side)) {
    const [left,top,width,height]=sprite.rect;
    const { data,info }=await sharp(path.join("public",sprite.src)).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let count=0,minX=width,minY=height,maxX=0,maxY=0;
    for(let i=3;i<data.length;i+=info.channels) if(data[i]>=24){ count++; const x=Math.floor(i/info.channels)%width,y=Math.floor(i/info.channels/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y); }
    assert(count>15000);assert(minX>=3&&minY>=3&&maxX<=width-4&&maxY<=height-4, sprite.src+":"+sprite.rect.join());
    assert(Math.abs(sprite.pivot[1]-maxY)<=3); hashes.add(createHash("sha256").update(data).digest("hex"));
  }
  assert.equal(hashes.size,16);assert.notEqual(cage.novice.left.idle.src,cage.novice.right.idle.src);
});
test("stage draws actual modular cage, native novice and earned badge without adult mentor or mirror", () => {
  const run=cageRoute(), ctx={ save(){},restore(){},translate(){},rotate(){},clearRect(){},fillRect(){},drawImage(...args){this.draws.push(args);},stroke(){},beginPath(){},moveTo(){},lineTo(){},setLineDash(){},arc(){},fill(){},scale(){assert.fail("No native actor mirroring");},draws:[] };
  for(const facing of [-1,1]) {
    const state=structuredClone(run.state); state.rival.facing=facing;ctx.draws=[];art.drawYouthScene(ctx,state,{manifest,images},false);
    const sources=ctx.draws.map(call=>call[0].src);
    for(const src of [cage.background.src,cage.structure.src,cage.floor.src,cage.insignia.src,cage.novice[facing===1?"right":"left"].ko.src]) assert(sources.includes(src));
    assert(!sources.some(src=>src.includes("mentor-"))); assert(sources.some(src=>src.includes("unblooded-")));
    assert.deepEqual(ctx.draws.find(call=>call[0].src===cage.structure.src).slice(5),cage.structureDestination);
  }
});
test("missing cage layer, duplicated native pose and impossible crop prevent art readiness", () => {
  for(const src of [cage.background.src,...art.youthCageSprites(cage).map(s=>s.src)]) {const absent=new Map(images);absent.delete(src);assert(art.validateYouthArt(manifest,absent).length);}
  const bad=structuredClone(manifest);bad.cage.novice.left.walk=bad.cage.novice.left.idle;assert(art.validateYouthArt(bad,images).length);
  const outside=structuredClone(manifest);outside.cage.structure.rect=[0,0,99999,99999];assert(art.validateYouthArt(outside,images).length);
});
