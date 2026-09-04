import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const canvas = await readFile(
  new URL("../app/game/PitCanvas.tsx", import.meta.url),
  "utf8",
);

test("PIT technique entities have a visible Canvas layer and training hitboxes", () => {
  assert.match(canvas, /getPitTechniqueBox/);
  assert.match(canvas, /for \(const effect of state\.techniqueEffects\)/);
  assert.match(canvas, /drawTechniqueEffect\(context, state, effect/);
  assert.match(canvas, /showHitboxes[\s\S]*?#d888ff/);
  assert.match(canvas, /technique\.device === "net"/);
  assert.match(canvas, /technique\.device === "disc"/);
  assert.match(canvas, /technique\.device === "plasma"/);
  assert.match(canvas, /technique\.device === "drone"/);
});

test("PIT exposes authored technique names and active statuses outside the hidden canvas", () => {
  assert.match(canvas, /TECHNIQUE · \{fighter\.attacks\.technique\.label\}/);
  assert.match(canvas, /TECHNIQUE_STATUS_LABELS\[left\.techniqueStatus\.kind\]/);
  assert.match(canvas, /TECHNIQUE_STATUS_LABELS\[right\.techniqueStatus\.kind\]/);
  assert.match(canvas, /FILET/);
  assert.match(canvas, /IMMOBILISÉ/);
  assert.match(canvas, /TRAQUÉ/);
  assert.match(canvas, /ÉBRANLÉ/);
});

test("technique attacks announce their authored move instead of a generic placeholder", () => {
  assert.match(
    canvas,
    /event\.attack === "technique"[\s\S]*?PIT_FIGHTERS\[event\.fighterId\]\.attacks\.technique\.label/,
  );
  assert.doesNotMatch(canvas, /if \(event\.type === "attack-start"\) return ACTION_LABELS/);
});
