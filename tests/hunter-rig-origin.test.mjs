import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const huntCanvasUrl = new URL("../app/game/HuntCanvas.tsx", import.meta.url);

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
  assert.match(
    source,
    /return solveHunterRig\(\{[\s\S]*?worldX:[\s\S]*?worldY:/,
  );

  const aimAssist = functionSource(source, "drawAimAssist", "drawJunglePlatform");
  const weapon = functionSource(source, "playerWeapon", "playerScan");
  const targeting = functionSource(source, "updateAimState", "updateHunterRig");

  for (const [label, block] of [
    ["aim assist", aimAssist],
    ["targeting", targeting],
  ]) {
    assert.match(block, /selectedHandWeapon\(loadout\)/);
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
  assert.match(source, /hunterBodyPartPath\(appearance\.bodyMorphId, partId\)/);
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
  assert.match(handWeapon, /selectedHandWeapon\(loadout\)/);
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
  assert.match(layeredHunter, /HUNTER_DREAD_STRANDS\.forEach/);
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
