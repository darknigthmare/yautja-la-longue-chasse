import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { build } from "esbuild";

const huntCanvasUrl = new URL("../app/game/HuntCanvas.tsx", import.meta.url);

async function nativeRigRuntime(source) {
  const bundle = await build({
    stdin: {
      contents: `${source.replace("export default function HuntCanvas", "function HuntCanvas")}
export {makeGameState,solvePlayerRigFrame,solveHunterRig,HUNTER_RIG_CANVAS};
export {transformPoint} from "./hunterRig";
export {defaultSave} from "./save"; export {MISSION_BY_ID} from "./data";`,
      resolveDir: fileURLToPath(new URL("../app/game/", import.meta.url)),
      sourcefile: fileURLToPath(huntCanvasUrl), loader: "tsx",
    },
    bundle: true, write: false, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".module.css": "empty" }, external: ["react", "react/jsx-runtime", "react-dom"],
    logLevel: "silent",
  });
  const compiled = { exports: {} };
  runInNewContext(bundle.outputFiles[0].text, {
    module: compiled, exports: compiled.exports, require: createRequire(import.meta.url),
  });
  return compiled.exports;
}

function nearPoint(actual, expected, message) {
  assert.ok(Math.hypot(actual.x - expected.x, actual.y - expected.y) < 1e-8, message);
}

function functionSource(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert.notEqual(start, -1, `${name} must exist`);
  assert.notEqual(end, -1, `${nextName} must follow ${name}`);
  return source.slice(start, end);
}

test("aim, targeting and projectiles use the active weapon anchor", async () => {
  const source = await readFile(huntCanvasUrl, "utf8");
  assert.match(source, /from ["']\.\/hunterRig["']/);
  assert.match(source, /function solvePlayerRigFrame\(/);
  // Exercise the actual Canvas adapter. Its choice of a working pose must
  // preserve the canonical world origin, independent of source-code shape.
  const runtime = await nativeRigRuntime(source);
  const save = runtime.defaultSave("2026-11-09T00:00:00Z");
  const mission = runtime.MISSION_BY_ID["jungle-vey"];
  for (const facing of [-1, 1]) for (const height of [84.48, 116, 153.6]) {
    const state = runtime.makeGameState(mission, save.loadout, save.inventory,
      "hunter", save.appearance, false, false, 0, save.exploration);
    Object.assign(state.player, {
      x: 2300, y: 270 - height, height, facing, velocityX: 0, velocityY: 0,
      grounded: true, climbing: false, aiming: true, aimAngle: .2, weaponCooldown: 0,
    });
    state.elapsed = 0;
    const player = state.player;
    const handAimAngle = -.15;
    const frame = runtime.solvePlayerRigFrame(state, player, handAimAngle);
    const expected = runtime.solveHunterRig({
      pose: "idle", phase: 0, facing, speed: 0, verticalVelocity: 0,
      aimAngle: player.aimAngle, handAimAngle, recoil: 0, extractionProgress: 0,
      scale: height / runtime.HUNTER_RIG_CANVAS.height,
      worldX: player.x + player.width / 2 - runtime.HUNTER_RIG_CANVAS.width / 2,
      worldY: player.y + height - runtime.HUNTER_RIG_CANVAS.groundY,
    });
    nearPoint({ x: frame.bones.root.e, y: frame.bones.root.f },
      { x: player.x + player.width / 2, y: player.y + height }, "the rig origin is the real collision body's feet");
    for (const anchor of ["muzzle", "handGrip", "trophyCarry", "maskCenter"])
      nearPoint(frame.anchors[anchor], expected.anchors[anchor], `${anchor} retains the canonical world registration`);

    // The same adapter selects the new work pose, with the original foot pivots
    // and equipment anchors. This fixture adds no simulation or collision move.
    state.huntRites.corpses.push({ id: "rig-work-body", sourceEnemyId: "razorback-grazer",
      x: player.x + player.width / 2 + facing * 30, y: player.y + height,
      label: "Rig pose fixture", kind: "beast", worthy: true, protectedPrey: false,
      defeatedAt: 0, analyzed: true, marked: false, flayed: false, erased: false,
      supportId: null, hangingAt: null, witnesses: [], integrity: 100, massKg: 70 });
    state.enemies.push({ id: "rig-work-body", archetype: "razorback-grazer", health: 0,
      alive: false, active: true, width: 70, height: 40 });
    state.huntRites.operation = { corpseId: "rig-work-body", action: "flay", elapsed: 1.6,
      startHealth: player.health, supportId: null, confirmedDishonor: false };
    const working = runtime.solvePlayerRigFrame(state, player, handAimAngle);
    const idle = runtime.solveHunterRig({ pose: "idle", phase: 0, facing,
      scale: height / runtime.HUNTER_RIG_CANVAS.height,
      worldX: player.x + player.width / 2 - runtime.HUNTER_RIG_CANVAS.width / 2,
      worldY: player.y + height - runtime.HUNTER_RIG_CANVAS.groundY });
    for (const foot of ["footFront", "footBack"])
      nearPoint({ x: working.bones[foot].e, y: working.bones[foot].f },
        { x: idle.bones[foot].e, y: idle.bones[foot].f }, "working keeps both original feet planted");
    nearPoint(working.anchors.handGrip, runtime.transformPoint(working.bones.handFront, { x: 6, y: 13 }),
      "the field tool and hand weapon retain the real hand anchor");
    nearPoint(working.anchors.muzzle, runtime.transformPoint(working.bones.casterMuzzle, { x: 0, y: 0 }),
      "the caster retains its own muzzle while working");
    assert.notEqual(working.anchors.handGrip.y, frame.anchors.handGrip.y, "the actual field pose is selected");
    assert.equal(player.x, 2300); assert.equal(player.y, 270 - height);
  }

  const aimAssist = functionSource(source, "drawAimAssist", "drawJunglePlatform");
  const weapon = functionSource(source, "playerWeapon", "playerScan");
  const targeting = functionSource(source, "updateAimState", "updateHunterRig");

  for (const [label, block] of [
    ["aim assist", aimAssist],
    ["targeting", targeting],
  ]) {
    assert.match(
      block,
      /selectedHandWeapon\(\s*loadout,\s*player\.activeWeaponSlot,\s*\)/,
    );
    assert.match(
      block,
      /frame\.anchors\.handGrip/,
      `${label} must use the hand for a held weapon`,
    );
    assert.match(
      block,
      /frame\.anchors\.muzzle/,
      `${label} must retain the caster muzzle`,
    );
  }
  assert.match(
    weapon,
    /const rigFrame = solvePlayerRigFrame\([\s\S]*?state,[\s\S]*?player,/,
  );
  assert.match(weapon, /weapon\.id === "plasma-caster"/);
  assert.match(weapon, /rigFrame\.anchors\.muzzle/);
  assert.match(weapon, /rigFrame\.anchors\.handGrip/);

  assert.doesNotMatch(
    weapon,
    /player\.facing\s*\*\s*\(player\.width\s*\*\s*0\.55\)/,
  );
  assert.doesNotMatch(
    aimAssist,
    /player\.x\s*\+\s*player\.width\s*\/\s*2\s*\+\s*player\.facing/,
  );
});

test("Canvas renders registered V3 atoms through rig-relative matrices", async () => {
  const source = await readFile(huntCanvasUrl, "utf8");
  assert.match(source, /relativeBoneMatrix\(/);
  assert.match(source, /HUNTER_BIND_FRAME/);
  assert.match(source, /HUNTER_BODY_PART_IDS/);
  assert.match(source, /HUNTER_BODY_PART_BONES/);
  assert.match(source, /hunterBodyPartPath\(appearance\.bodyMorphId, partId, appearance\.headStyleId\)/);
  assert.match(source, /hunterNetPartPath\(appearance\.bodyMorphId, partId\)/);
  assert.match(source, /HUNTER_EQUIPMENT_V3\.plasma/);
  assert.match(source, /assets\.hunterPlasma\.upperArm/);
  assert.match(source, /assets\.hunterPlasma\.lowerArm/);
  assert.match(source, /assets\.hunterPlasma\.yoke/);
  assert.match(source, /assets\.hunterPlasma\.cannon/);
  assert.match(source, /assets\.hunterPlasma\.barrel/);
  assert.match(source, /assets\.hunterPlasma\.muzzle/);
  assert.match(source, /assets\.hunterGauntlet\.lid/);
  assert.match(source, /assets\.hunterWristblades\.blades/);
  assert.doesNotMatch(
    source,
    /game\/assets\/v2\/actors\/yautja\/hunter\/equipment\/plasma-caster/,
  );
});

test("selected loadout and extracted trophy use registered atomic layers", async () => {
  const source = await readFile(huntCanvasUrl, "utf8");
  const beltLoadout = functionSource(
    source,
    "drawHunterBeltLoadout",
    "drawHunterHandWeapon",
  );
  const handWeapon = functionSource(
    source,
    "drawHunterHandWeapon",
    "drawHunterTrophyLayers",
  );
  const trophyLayers = functionSource(
    source,
    "drawHunterTrophyLayers",
    "drawExtractingTrophyLayers",
  );
  const extractingTrophy = functionSource(
    source,
    "drawExtractingTrophyLayers",
    "drawHunterLayered",
  );

  assert.match(
    source,
    /hunterRegisteredAssetPath\("weapons", handWeaponId\)/,
  );
  assert.match(source, /for \(const gearId of loadout\.gearIds\)/);
  assert.match(
    source,
    /hunterRegisteredAssetPath\("gear", gearId\)/,
  );
  assert.match(
    source,
    /hunterRegisteredAssetPath\("trophies", trophyId\)/,
  );

  assert.match(beltLoadout, /assets\.hunterGear\[gearId\]/);
  assert.match(beltLoadout, /frame,\s*"pelvis"/);
  assert.match(
    handWeapon,
    /selectedHandWeapon\(\s*loadout,\s*state\.player\.activeWeaponSlot,\s*\)/,
  );
  assert.match(handWeapon, /"combistick-folded"/);
  assert.match(handWeapon, /assets\.hunterWeapons\[visualId\]/);
  assert.match(handWeapon, /frame,\s*"handFront"/);
  assert.match(handWeapon, /assets\.hunterWeapons\.arrow/);

  assert.match(
    source,
    /"trophy-spine",\s*"trophy-skull",\s*"trophy-bindings"/,
  );
  assert.match(trophyLayers, /assets\.hunterTrophies\[trophyId\]/);
  assert.match(trophyLayers, /HUNTER_TROPHY_LAYOUT\[trophyId\]/);
  assert.match(trophyLayers, /frame\.anchors\.trophyCarry\.x/);
  assert.match(trophyLayers, /layout\.carry\.scale/);
  assert.doesNotMatch(trophyLayers, /carried \? "handFront"/);
  assert.match(
    extractingTrophy,
    /HUNTER_BIND_FRAME\.anchors\.trophyCarry/,
  );
  assert.match(
    source,
    /solvePlayerRigFrame\(state, state\.player\)\.anchors\.trophyCarry/,
  );
  assert.doesNotMatch(source, /assets\.trophy\b/);
  assert.doesNotMatch(source, /HUNTER_VISUALS_V2\.trophies/);
});

test("runtime keeps seven dreads and hides launched hand ammunition", async () => {
  const source = await readFile(huntCanvasUrl, "utf8");
  const handWeapon = functionSource(
    source,
    "drawHunterHandWeapon",
    "drawHunterTrophyLayers",
  );
  const layeredHunter = functionSource(
    source,
    "drawHunterLayered",
    "drawAimAssist",
  );

  assert.match(source, /dreadAngles: \[0, 0, 0, 0, 0, 0, 0\]/);
  assert.match(source, /dreadVelocities: \[0, 0, 0, 0, 0, 0, 0\]/);
  assert.match(layeredHunter, /solveHunterDreadsV63\([\s\S]*?player\.dreadAngles\)\.forEach/);
  assert.match(handWeapon, /weaponProjectileInFlight/);
  assert.match(
    handWeapon,
    /weaponId === "smart-disc" && weaponProjectileInFlight/,
  );
  assert.match(
    handWeapon,
    /weaponId === "yautja-bow" &&\s*!weaponProjectileInFlight/,
  );
});
