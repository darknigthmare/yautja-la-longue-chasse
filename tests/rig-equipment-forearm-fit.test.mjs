import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {solveHunterRig,relativeBoneMatrix,multiplyAffine} from "../app/game/hunterRig.ts";
import {
  HUNTER_GAUNTLET_HINGE,HUNTER_GAUNTLET_FIT_BY_MORPH,
  HUNTER_WRISTBLADE_REGISTRATION,hunterWristbladeRegistrationMatrix,
} from "../app/game/hunterVisuals.ts";
import {gauntletRigArmFitMatrixV139,gauntletFrontArmMatrixV145,isGauntletRigSpriteV139,gauntletRigSpriteV139} from "../app/game/systems/gauntletRigSpritesV139.ts";

const root=fileURLToPath(new URL("../",import.meta.url));
const read=relative=>readFileSync(root+relative,"utf8");
const apply=(m,p)=>({x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f});
const near=(a,b,eps)=>Math.abs(a-b)<=eps;
const bind=solveHunterRig({pose:"idle",facing:1,phase:0,aimAngle:0});
const POSES=["idle","run","jump","fall","climb","extract"];
const MORPHS=Object.keys(HUNTER_GAUNTLET_FIT_BY_MORPH);

test("V145 wristblades follow the BACK forearm axis, top of the wrist outward, in every pose",()=>{
  const {pivot}=HUNTER_WRISTBLADE_REGISTRATION;
  let checks=0;
  for(const morph of MORPHS)for(const pose of POSES)for(const facing of [-1,1])for(const phase of [0,.5]){
    const fit=hunterWristbladeRegistrationMatrix(morph);
    const frame=solveHunterRig({pose,facing,phase,speed:pose==="run"?260:0,verticalVelocity:pose==="fall"?480:0,extractionProgress:pose==="extract"?phase:0});
    const forearm=relativeBoneMatrix(frame,bind,"armBackLower");
    const elbow=apply(frame.bones.armBackLower,{x:0,y:0});
    const wrist=apply(frame.bones.handBack,{x:0,y:0});
    const arm=Math.atan2(wrist.y-elbow.y,wrist.x-elbow.x);
    const blades=multiplyAffine(forearm,fit);
    const rear=apply(blades,pivot),tip=apply(blades,{x:pivot.x+40,y:pivot.y});
    const art=Math.atan2(tip.y-rear.y,tip.x-rear.x);
    const diff=Math.atan2(Math.sin(art-arm),Math.cos(art-arm));
    assert.ok(Math.abs(diff)<.02,`blades off the back forearm axis in ${morph}/${pose}/${facing}/${phase}: ${diff}`);
    const t=((rear.x-elbow.x)*(wrist.x-elbow.x)+(rear.y-elbow.y)*(wrist.y-elbow.y))/((wrist.x-elbow.x)**2+(wrist.y-elbow.y)**2);
    assert.ok(t>.5&&t<1,`housing not on the lower back forearm (${t}) in ${pose}`);
    checks++;
  }
  // At rest the housing top (source -y) faces away from the torso (screen left).
  const fit=hunterWristbladeRegistrationMatrix("classic");
  const centre=apply(fit,pivot),top=apply(fit,{x:pivot.x,y:pivot.y-10});
  assert.ok(top.x<centre.x,"housing top must face outward");
  assert.equal(checks,MORPHS.length*24);
});

test("V145 wrist computer sits on the FRONT forearm and keeps a fixed lid hinge",()=>{
  for(const morph of MORPHS)for(const v139 of [true,false]){
    const m=gauntletFrontArmMatrixV145(morph,v139);
    const centre=apply(m,v139?{x:55,y:197.5}:{x:50.5,y:202.5});
    // Front forearm: elbow (185,161) to wrist (212,216).
    const t=((centre.x-185)*27+(centre.y-161)*55)/(27*27+55*55);
    assert.ok(t>.3&&t<.7,`computer not at mid front forearm for ${morph}: ${t}`);
    const off=Math.abs((centre.x-185)*55-(centre.y-161)*27)/Math.hypot(27,55);
    assert.ok(off<8,`computer off the front forearm for ${morph}: ${off}`);
  }
  for(const pose of POSES)for(const facing of [-1,1]){
    const frame=solveHunterRig({pose,facing,phase:.5});
    const base=multiplyAffine(relativeBoneMatrix(frame,bind,"armFrontLower"),gauntletFrontArmMatrixV145("classic",true));
    const c=Math.cos(-1.12),s=Math.sin(-1.12),h=HUNTER_GAUNTLET_HINGE;
    const open=multiplyAffine(base,{a:c,b:s,c:-s,d:c,e:h.x-c*h.x+s*h.y,f:h.y-s*h.x-c*h.y});
    const p0=apply(base,h),p1=apply(open,h);
    assert.ok(near(p0.x,p1.x,1e-6)&&near(p0.y,p1.y,1e-6),`hinge detached in ${pose}`);
  }
  assert.ok(gauntletRigArmFitMatrixV139().a<1);
  assert.equal(isGauntletRigSpriteV139(gauntletRigSpriteV139("wolf","base")),true);
  assert.equal(isGauntletRigSpriteV139("/game/assets/v3/actors/yautja/hunter/equipment/registered/gauntlet-base.webp"),false);
});

test("preview, hunt canvas, PIT and Homeworld share the same arm assignment and wrap",()=>{
  const preview=read("app/game/HunterRigPreview.tsx");
  const hunt=read("app/game/HuntCanvas.tsx");
  const pit=read("app/game/pitFighterRendering.ts");
  const home=read("app/game/HomeworldModularHunter.tsx");
  for(const source of [preview,hunt,pit,home]){
    assert.match(source,/gauntletFrontArmMatrixV145\(/);
    assert.match(source,/hunterWristbladeRegistrationMatrix\((appearance\.bodyMorphId|morph|morphId)\)/);
  }
  assert.match(preview,/data-rig-armor-wrap/);
  assert.match(hunt,/drawWrappedLayerV145\(/);
  assert.match(home,/data-homeworld-armor-wrap/);
  assert.match(preview,/boneMatrix\("armBackLower"\),\n\s*hunterWristbladeRegistrationMatrix/);
});

// V145: shoulder plate, greaves and side dreadlocks.
import {hunterShoulderPlateMatrixV145,hunterGreaveMatrixV145,HUNTER_ARMOR_KEEP_CLIP_V145} from "../app/game/hunterVisuals.ts";
import {build} from "esbuild";
const dreadsModule=build({
  entryPoints:[fileURLToPath(new URL("../app/game/hunterDreadsV63.ts",import.meta.url))],
  bundle:true,format:"esm",platform:"node",target:"es2022",write:false,
}).then(result=>import("data:text/javascript;base64,"+Buffer.from(result.outputFiles[0].text).toString("base64")));

test("V145 shoulder plate is mirrored onto the front deltoid for every morph",()=>{
  for(const morph of MORPHS){
    const m=hunterShoulderPlateMatrixV145(morph);
    assert.ok(m.a<0&&m.d>0,`shoulder not mirrored for ${morph}`);
    const centre=apply(m,{x:153,y:113});
    // Front deltoid (top of upper-arm-front) sits at x 161-169 depending on the morph.
    assert.ok(centre.x>165&&centre.x<180,`shoulder centre ${centre.x} off the deltoid for ${morph}`);
    const strap=apply(m,{x:178,y:120}); // strap loop of the source plate
    assert.ok(strap.x<centre.x,`strap loop must face the neck for ${morph}`);
  }
  assert.ok(HUNTER_ARMOR_KEEP_CLIP_V145["shoulder-avp"]&&HUNTER_ARMOR_KEEP_CLIP_V145.shin);
});

test("V145 greaves cover both shins under the knee",()=>{
  for(const morph of MORPHS){
    const shin=hunterGreaveMatrixV145(morph,"shin","front");
    const top=apply(shin,{x:175,y:283}),bottom=apply(shin,{x:175,y:341});
    assert.ok(top.y<285&&bottom.y>338,`front greave too short for ${morph}`);
    assert.ok(shin.a>1.1,`front greave not widened for ${morph}`);
    const back=apply(hunterGreaveMatrixV145(morph,"shin","back"),{x:175,y:312});
    assert.ok(back.x>60&&back.x<90,`back greave not on shin-back for ${morph}: ${back.x}`);
    const upper=apply(hunterGreaveMatrixV145(morph,"thigh-lower","front"),{x:160,y:294});
    assert.ok(Math.abs(upper.x-top.x)<8,`upper greave not aligned with the shin for ${morph}`);
  }
});

test("V145 side dreadlocks exist for every style and swing with the rear springs",async()=>{
  const {solveHunterSideDreadsV145,HUNTER_DREAD_SIDE_STRANDS_V145}=await dreadsModule;
  const frame=solveHunterRig({pose:"idle",facing:1,phase:0});
  for(const style of Object.keys(HUNTER_DREAD_SIDE_STRANDS_V145)){
    const still=solveHunterSideDreadsV145(frame,"classic",style);
    assert.ok(still.length>=2,`no side strands for ${style}`);
    const moving=solveHunterSideDreadsV145(frame,"classic",style,"reference",[.3,.3,.3,.3,.3,.3,.3]);
    assert.ok(moving.every((strand,i)=>strand.angle>still[i].angle),`side strands ignore motion for ${style}`);
    for(const strand of still){
      const tip=apply(strand.matrix,{x:60,y:185});
      assert.ok(tip.y>strand.root.y+40,`side strand of ${style} does not hang down`);
    }
  }
});
