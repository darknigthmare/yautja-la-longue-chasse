import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {loadGauntletRigPartV141} from "../app/game/systems/gauntletMissionVisualV141.ts";
import {GAUNTLET_CATALOG_V132} from "../app/game/systems/clanWarGauntletCatalogV132.ts";
import {gauntletRigSpriteV139} from "../app/game/systems/gauntletRigSpritesV139.ts";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=p=>readFileSync(root+p,"utf8");

test("the live mission chooses each real V139 source over the V3 fallback",async ()=>{
  for(const item of GAUNTLET_CATALOG_V132){
    for(const part of ["base","lid"]){
      const paths=[];
      const source=gauntletRigSpriteV139(item.id,part);
      const result=await loadGauntletRigPartV141(item.id,part,async path=>{
        paths.push(path);return {path};
      },`/legacy/gauntlet-${part}.webp`);
      assert.deepEqual(paths,[source]);
      assert.equal(result?.path,source);
    }
  }
});
test("missing or rejected V139 art uses old V3 only then, without throwing or awarding a game stat",async ()=>{
  const legacy="/game/assets/v3/actors/yautja/hunter/equipment/registered/gauntlet-base.webp";
  const attempts=[];
  const one=await loadGauntletRigPartV141("wolf","base",async path=>{
    attempts.push(path);
    return path===legacy?{url:path}:null;
  },legacy);
  assert.equal(one?.url,legacy);
  assert.deepEqual(attempts,[gauntletRigSpriteV139("wolf","base"),legacy]);
  attempts.length=0;
  const two=await loadGauntletRigPartV141("wolf","base",async path=>{
    attempts.push(path);
    if(path!==legacy)throw Error("blocked image");
    return {url:path};
  },legacy);
  assert.equal(two?.url,legacy);
  assert.equal(attempts.length,2);
  assert.equal(await loadGauntletRigPartV141("wolf","base",async()=>null,legacy),null);
  assert.equal(await loadGauntletRigPartV141("wolf","base",async()=>{throw Error("no storage")},legacy),null);
});
test("unknown identity cannot inject an arbitrary asset path into active hunt",async ()=>{
  const calls=[];
  const result=await loadGauntletRigPartV141("../../evil","lid",async path=>{
    calls.push(path);return path;
  },"/legacy/lid.webp");
  assert.equal(result,"/game/assets/v139/rig-gauntlets/jungle-hunter/lid.svg");
  assert.deepEqual(calls,["/game/assets/v139/rig-gauntlets/jungle-hunter/lid.svg"]);
});
test("actual 12k-line HuntCanvas preloads per-hunter assets once and preserves battle rigs",()=>{
  const runtime=read("app/game/HuntCanvas.tsx");
  const game=read("app/game/GameClient.tsx");
  const preview=read("app/game/HunterRigPreview.tsx");
  assert.match(runtime,/gauntletVariantId\?: string/);
  assert.match(runtime,/gauntletVisualIdRef=useRef\(gauntletVariantId \?\? "jungle-hunter"\)/);
  assert.match(runtime,/loadGauntletRigPartV141\(gauntletVisualId,moduleId,loadImage,legacyPath\)/);
  assert.match(runtime,/assets\.hunterGauntlet\[moduleId\]=image/);
  assert.match(runtime,/gauntletVisualId,\n\s*appearance,/);
  assert.match(runtime,/HUNTER_GAUNTLET_FIT_BY_MORPH\[appearance\.bodyMorphId\]/);
  assert.match(runtime,/rotation: -1\.12 \* clamp\(player\.gauntletOpen, 0, 1\)/);
  assert.match(runtime,/assets\.hunterWristblades\.blades/);
  assert.match(runtime,/"armFrontLower"/);
  assert.match(preview,/gauntletRigSpriteV139\(rigGauntletId, "base"\)/);
  const i=game.indexOf('<HuntCanvas');
  assert.ok(i>0);
  assert.match(game.slice(i,i+1100),/gauntletVariantId=\{hunterGauntlet\.equippedId\}/);
  assert.equal((runtime.match(/loadGauntletRigPartV141\(/g)||[]).length,1);
  assert.ok(!read("app/game/systems/gauntletMissionVisualV141.ts").includes("damage"));
  assert.ok(!read("app/game/systems/gauntletMissionVisualV141.ts").includes("advanceWarTurnV85"));
});
