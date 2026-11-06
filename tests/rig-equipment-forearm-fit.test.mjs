import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {solveHunterRig,relativeBoneMatrix,multiplyAffine} from "../app/game/hunterRig.ts";
import {
  HUNTER_GAUNTLET_HINGE,HUNTER_GAUNTLET_FIT_BY_MORPH,
  HUNTER_WRISTBLADE_REGISTRATION,hunterWristbladeRegistrationMatrix,
} from "../app/game/hunterVisuals.ts";
import {gauntletRigArmFitMatrixV139,isGauntletRigSpriteV139,gauntletRigSpriteV139} from "../app/game/systems/gauntletRigSpritesV139.ts";

const root=fileURLToPath(new URL("../",import.meta.url));
const read=relative=>readFileSync(root+relative,"utf8");
const apply=(m,p)=>({x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f});
const near=(a,b,eps)=>Math.abs(a-b)<=eps;
const bind=solveHunterRig({pose:"idle",facing:1,phase:0,aimAngle:0});
const POSES=["idle","run","jump","fall","climb","extract"];
const MORPHS=Object.keys(HUNTER_GAUNTLET_FIT_BY_MORPH);

test("wristblade housing and blades follow the front forearm axis in every pose",()=>{
  const fit=hunterWristbladeRegistrationMatrix();
  const {pivot}=HUNTER_WRISTBLADE_REGISTRATION;
  let checks=0;
  for(const pose of POSES)for(const facing of [-1,1])for(const phase of [0,.25,.5,.75]){
    const frame=solveHunterRig({pose,facing,phase,speed:pose==="run"?260:0,verticalVelocity:pose==="fall"?480:0,extractionProgress:pose==="extract"?phase:0});
    const forearm=relativeBoneMatrix(frame,bind,"armFrontLower");
    const elbow=apply(frame.bones.armFrontLower,{x:0,y:0});
    const wrist=apply(frame.bones.handFront,{x:0,y:0});
    const arm=Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x);
    const blades=multiplyAffine(forearm,fit);
    const rear=apply(blades,pivot),tip=apply(blades,{x:pivot.x+40,y:pivot.y});
    const art=Math.atan2(tip.y-rear.y,tip.x-rear.x);
    const diff=Math.atan2(Math.sin(art-arm),Math.cos(art-arm));
    assert.ok(Math.abs(diff)<.02,`blades off the forearm axis in ${pose}/${facing}/${phase}: ${diff}`);
    // Housing centre sits on the forearm segment, between elbow and wrist.
    const t=((rear.x-elbow.x)*(wrist.x-elbow.x)+(rear.y-elbow.y)*(wrist.y-elbow.y))/((wrist.x-elbow.x)**2+(wrist.y-elbow.y)**2);
    assert.ok(t>.5&&t<1,`housing not on the lower forearm (${t}) in ${pose}`);
    checks++;
  }
  assert.equal(checks,48);
});

test("V139 wrist computers are fitted to the back forearm and keep a fixed lid hinge",()=>{
  const fit=gauntletRigArmFitMatrixV139();
  // Measured extent of the 54 V139 base shells in source space.
  const shell={x0:19,y0:162,x1:93,y1:232};
  for(const morph of MORPHS){
    const m={...fit,e:fit.e+HUNTER_GAUNTLET_FIT_BY_MORPH[morph].translateX,f:fit.f+HUNTER_GAUNTLET_FIT_BY_MORPH[morph].translateY};
    const a=apply(m,{x:shell.x0,y:shell.y0}),b=apply(m,{x:shell.x1,y:shell.y1});
    assert.ok(b.x-a.x<=48,`shell wider than the forearm for ${morph}`);
    assert.ok(a.y>=149&&b.y<=219,`shell outside elbow..wrist for ${morph}: ${a.y}..${b.y}`);
  }
  for(const pose of POSES)for(const facing of [-1,1]){
    const frame=solveHunterRig({pose,facing,phase:.5});
    const base=multiplyAffine(relativeBoneMatrix(frame,bind,"armBackLower"),fit);
    const c=Math.cos(-1.12),s=Math.sin(-1.12),h=HUNTER_GAUNTLET_HINGE;
    const open=multiplyAffine(base,{a:c,b:s,c:-s,d:c,e:h.x-c*h.x+s*h.y,f:h.y-s*h.x-c*h.y});
    const p0=apply(base,h),p1=apply(open,h);
    assert.ok(near(p0.x,p1.x,1e-6)&&near(p0.y,p1.y,1e-6),`hinge detached in ${pose}`);
  }
  assert.equal(isGauntletRigSpriteV139(gauntletRigSpriteV139("wolf","base")),true);
  assert.equal(isGauntletRigSpriteV139("/game/assets/v3/actors/yautja/hunter/equipment/registered/gauntlet-base.webp"),false);
});

test("preview, hunt canvas, PIT and Homeworld share the same forearm fits",()=>{
  const preview=read("app/game/HunterRigPreview.tsx");
  const hunt=read("app/game/HuntCanvas.tsx");
  const pit=read("app/game/pitFighterRendering.ts");
  const home=read("app/game/HomeworldModularHunter.tsx");
  assert.match(preview,/gauntletRigArmFitMatrixV139\(\)/);
  assert.match(preview,/hunterWristbladeRegistrationMatrix\(\)/);
  assert.match(hunt,/isGauntletRigSpriteV139\(image\.src\)/);
  assert.match(hunt,/registration: hunterWristbladeRegistrationMatrix\(\)/);
  assert.match(pit,/HUNTER_WRISTBLADE_REGISTRATION/);
  assert.match(home,/data-homeworld-layer="gauntlet"/);
  assert.match(home,/hunterWristbladeRegistrationMatrix\(\)/);
});
