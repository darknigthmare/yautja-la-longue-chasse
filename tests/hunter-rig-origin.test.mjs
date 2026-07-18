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

test("aim, projectile and targeting share the V3 muzzle anchor", async () => {
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
    ["projectile", weapon],
    ["targeting", targeting],
  ]) {
    assert.match(
      block,
      /solvePlayerRigFrame\(state, player\)\.anchors\.muzzle/,
      `${label} must read the shared muzzle`,
    );
  }

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
  assert.match(trophyLayers, /frame,\s*"pelvis"/);
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
