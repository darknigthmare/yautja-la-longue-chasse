import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const built = await build({ stdin: { contents: `
  export { createPitCombatState, stepPitCombat } from './app/game/systems/pitCombat.ts';
  export { describePitCombatHunterSpriteMotion, resolvePitHunterSpriteFrame } from './app/game/hunterSpriteMotion.ts';
  export { PIT_SPRITE_SHEET_REGISTRY } from './app/game/pitSpriteSheetRegistry.ts';
`, resolveDir: projectRoot }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));
const variants = [
  ["user-ahab", "ahab-avec-casque-0c8ceb1c95"],
  ["wolf", "wolf-avec-casque-4261aca172"],
  ["falconer", "falconer-avec-casque-f5618ed362"],
  ["scarface", "scarface-avec-casque-bca00052d4"],
  ["enforcer", "enforcer-avec-casque-ca164d8925"],
  ["celtic", "celtic-avec-casque-0764ed4b53"],
];

// Opposite spawn slots provide both natural facings without editing facing,
// position, velocity, grounded state or simulation time in the fixture.
for (const [fighterId, variantId] of variants) for (const slot of [0, 1]) {
  const facing = slot === 0 ? "right" : "left";
  test(`${fighterId} masked ${facing}: real jump input selects native V50 air frames and returns to the floor`, () => {
    const entries = api.PIT_SPRITE_SHEET_REGISTRY.filter(entry =>
      entry.fighterId === fighterId && entry.variantId === variantId && entry.atlas.id.endsWith("-v50"));
    assert.ok(entries.length > 0, "The reviewed V50 atlas must be registered for the exact costume");
    let state = api.createPitCombatState(slot === 0 ? fighterId : "jungle-hunter", slot === 1 ? fighterId : "jungle-hunter",
      { mode: "training", variants: slot === 0 ? [variantId, null] : [null, variantId] });
    const start = structuredClone(state.fighters[slot]);
    const idleOpponent = structuredClone(state.fighters[1 - slot]);
    const observed = new Map();
    const framesByPhase = new Map();
    let cursor = null, landed = false;
    for (let tick = 0; tick < 120; tick++) {
      const before = state;
      const snapshot = JSON.stringify(before);
      const inputs = [{}, {}];
      if (tick === 0) inputs[slot] = { jump: true };
      state = api.stepPitCombat(state, inputs);
      assert.equal(JSON.stringify(before), snapshot, "Stepping must preserve the previous replay snapshot");
      assert.equal(state.frame, before.frame + 1);
      const fighter = state.fighters[slot];
      const motion = api.describePitCombatHunterSpriteMotion(state, slot, cursor);
      assert.ok(motion);
      cursor = motion.cursor;
      assert.equal(fighter.variantId, variantId);
      assert.equal(fighter.facing, slot === 0 ? 1 : -1);
      assert.equal(fighter.health, start.health);
      assert.equal(fighter.x, start.x, "A neutral jump must not displace the fighter horizontally");
      assert.equal(state.fighters[1 - slot].y, 0, "Jump input must not leak to the other slot");
      assert.equal(state.fighters[1 - slot].health, idleOpponent.health);
      assert.equal(state.fighters[1 - slot].x, idleOpponent.x);
      if (fighter.grounded) {
        assert.ok(tick > 0 && observed.size > 0, "The input must actually leave the floor first");
        assert.equal(fighter.y, 0);
        assert.equal(fighter.velocityY, 0);
        assert.equal(motion.posture, "stand");
        assert.equal(motion.clipId, "idle", "Landing must release the aerial animation");
        landed = true;
        break;
      }
      assert.ok(fighter.y > 0);
      assert.equal(fighter.action, null);
      assert.equal(fighter.phase, "idle");
      const phase = fighter.velocityY > 0 ? "rise" : fighter.velocityY < 0 ? "fall" : "apex";
      if (phase === "rise") assert.ok(fighter.y > before.fighters[slot].y);
      if (phase === "fall") assert.ok(fighter.y < before.fighters[slot].y);
      assert.equal(motion.clipId, "pit.air.jump." + phase);
      assert.equal(motion.posture, "air");
      assert.equal(motion.phase, "locomotion");
      assert.equal(motion.facing, facing);
      assert.equal(motion.durationTicks, null);
      const resolved = entries.map(entry => api.resolvePitHunterSpriteFrame(entry.atlas, motion)).filter(Boolean);
      assert.equal(resolved.length, 1, "The exact native clip must resolve once without borrowing another atlas");
      const rendered = resolved[0].frame;
      assert.equal(rendered.clip.id, motion.clipId);
      assert.equal(rendered.clip.facing, facing);
      assert.ok(rendered.page.src.includes("/v50/"));
      const frameSet = framesByPhase.get(phase) ?? new Set();
      frameSet.add(rendered.frameIndex); framesByPhase.set(phase, frameSet);
      observed.set(phase, (observed.get(phase) ?? 0) + 1);
    }
    assert.equal(landed, true, "The real jump must finish within 120 simulation ticks");
    assert.ok(observed.get("rise") > 0 && observed.get("fall") > 0);
    assert.deepEqual([...framesByPhase.get("rise")].sort(), [0, 1], "Both authored rising drawings must be reachable during the real jump");
    assert.deepEqual([...framesByPhase.get("fall")].sort(), fighterId === "user-ahab" ? [0] : [0, 1]);
    // Physics may cross zero between ticks; do not fabricate an apex snapshot.
    // The production atlas audit separately verifies an explicit zero-speed apex.
    for (let tick = 0; tick < 3; tick++) {
      state = api.stepPitCombat(state, [{}, {}]);
      assert.equal(state.fighters[slot].grounded, true, "Releasing jump must not trigger another jump on landing");
      assert.equal(state.fighters[slot].variantId, variantId);
    }
  });
}
