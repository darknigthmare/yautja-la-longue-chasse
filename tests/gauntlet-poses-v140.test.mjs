import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {
  solveHunterRig,relativeBoneMatrix,transformPoint,multiplyAffine,
} from "../app/game/hunterRig.ts";
import {HUNTER_GAUNTLET_HINGE,HUNTER_GAUNTLET_FIT_BY_MORPH} from "../app/game/hunterVisuals.ts";
import {GAUNTLET_CATALOG_V132} from "../app/game/systems/clanWarGauntletCatalogV132.ts";
import {gauntletRigSpriteV139} from "../app/game/systems/gauntletRigSpritesV139.ts";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=path=>readFileSync(root+path,"utf8");

const bind=solveHunterRig({pose:"idle",facing:1,phase:0,aimAngle:0});
const POSES=["idle","run","jump","fall","climb","extract"];
const MORPHS=["classic","young","elder","super","feral","huntress"];
const PHASES=[0,.2,.45,.7,1];
const near=(a,b,eps=1e-5)=>Math.abs(a-b)<=eps;
const translate=(x,y)=>({a:1,b:0,c:0,d:1,e:x,f:y});
const rotateAbout=(x,y,angle)=>{
  const c=Math.cos(angle),s=Math.sin(angle);
  return multiplyAffine(multiplyAffine(translate(x,y),{a:c,b:s,c:-s,d:c,e:0,f:0}),translate(-x,-y));
};

test("V140 actual rig matches source pivots and all 54 model URLs stay owner-scoped",()=>{
  assert.deepEqual(HUNTER_GAUNTLET_HINGE,{x:51,y:202});
  assert.deepEqual(Object.keys(HUNTER_GAUNTLET_FIT_BY_MORPH).sort(),[...MORPHS].sort());
  for(const model of GAUNTLET_CATALOG_V132){
    const base=gauntletRigSpriteV139(model.id,"base"),lid=gauntletRigSpriteV139(model.id,"lid");
    assert.notEqual(base,lid);
    assert.equal(base,`/game/assets/v139/rig-gauntlets/${model.id}/base.svg`);
    assert.equal(lid,`/game/assets/v139/rig-gauntlets/${model.id}/lid.svg`);
    for(const part of ["base","lid"]){
      const xml=read("public"+gauntletRigSpriteV139(model.id,part));
      assert.match(xml,/viewBox="0 0 256 384"/);
      assert.match(xml,/ORIGINAL blockout/);
    }
  }
});
test("V140 rig study covers every pose/morph/phase/facing and keeps lid hinge fixed",()=>{
  let frames=0,hingeChecks=0;
  const origin=HUNTER_GAUNTLET_HINGE;
  for(const pose of POSES)for(const facing of [-1,1])for(const morph of MORPHS)for(const phase of PHASES){
    const frame=solveHunterRig({
      pose,facing,phase,speed:pose==="run"?260:0,
      verticalVelocity:pose==="fall"?480:0,
      extractionProgress:pose==="extract"?phase:0,
    });
    const fit=HUNTER_GAUNTLET_FIT_BY_MORPH[morph];
    const unit=relativeBoneMatrix(frame,bind,"armBackLower");
    const mount=multiplyAffine(unit,translate(fit.translateX,fit.translateY));
    const front=relativeBoneMatrix(frame,bind,"armFrontLower");
    for(const value of [...Object.values(unit),...Object.values(mount),...Object.values(front)])
      assert.ok(Number.isFinite(value),`nonfinite rig ${pose}/${morph}/${phase}/${facing}`);
    const closed=transformPoint(mount,origin);
    for(const angle of [0,-1.12]){
      const lid=multiplyAffine(mount,rotateAbout(origin.x,origin.y,angle));
      const opened=transformPoint(lid,origin);
      assert.ok(near(closed.x,opened.x,.00001)&&near(closed.y,opened.y,.00001),
        `hinge detached ${pose}/${morph}/${facing}/${phase}`);
      hingeChecks++;
    }
    const elbow=transformPoint(unit,{x:55,y:149});
    const canonical=transformPoint(frame.bones.armBackLower,{x:0,y:0});
    assert.ok(near(elbow.x,canonical.x,.00001)&&near(elbow.y,canonical.y,.00001),
      `back elbow pivot detached in ${pose}/${morph}`);
    frames++;
  }
  assert.equal(frames,360);
  assert.equal(hingeChecks,720);
});
test("V140 production rig inspector renders the actual hunter rig, never writes campaign progress",()=>{
  const component=read("app/game/GauntletPoseInspectionV140.tsx");
  const client=read("app/gauntlet-qa-v136/client.tsx");
  assert.match(component,/import HunterRigPreview from/);
  assert.match(component,/GAUNTLET_POSES_V140/);
  assert.match(component,/GAUNTLET_MORPHS_V140/);
  assert.match(component,/data-testid="gauntlet-pose-inspection-v140"/);
  assert.match(component,/weaponIds=\{\["wristblades","plasma-caster"\]\}/);
  assert.match(component,/gauntletVariantId=\{modelId\}/);
  assert.match(component,/gauntletOpen=\{isOpen\}/);
  assert.match(client,/GauntletPoseInspectionV140 modelId=\{model.id\} coverOpen=\{open\}/);
  assert.ok(!component.includes("writeSaveWithStatus"));
  assert.ok(!component.includes("queueWarOrderV85"));
  assert.ok(!component.includes("window.localStorage"));
});
