import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-control-bindings-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/systems/controlBindings.ts"),
    rollupOptions: {
      output: { entryFileNames: "control-bindings.mjs" },
    },
  },
});

const controls = await import(
  pathToFileURL(join(outputDirectory, "control-bindings.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

function mutableDefaults() {
  return Object.fromEntries(
    Object.entries(controls.DEFAULT_CONTROL_BINDINGS).map(([actionId, codes]) => [
      actionId,
      [...codes],
    ]),
  );
}

test("the AZERTY defaults cover every stable action without contextual conflicts", () => {
  assert.equal(controls.CONTROL_ACTION_IDS.length, 71);
  assert.deepEqual(
    Object.keys(controls.DEFAULT_CONTROL_BINDINGS),
    controls.CONTROL_ACTION_IDS,
  );
  assert.ok(
    controls.CONTROL_ACTION_IDS.every(
      (actionId) => controls.DEFAULT_CONTROL_BINDINGS[actionId].length > 0,
    ),
  );
  assert.deepEqual(controls.DEFAULT_CONTROL_BINDINGS["hunt.moveLeft"], [
    "KeyQ",
    "ArrowLeft",
  ]);
  assert.deepEqual(controls.DEFAULT_CONTROL_BINDINGS["hunt.moveUp"], [
    "KeyZ",
    "ArrowUp",
  ]);
  assert.deepEqual(controls.findControlBindingConflicts(
    controls.DEFAULT_CONTROL_BINDINGS,
  ), []);
  const huntEntries = new Map(
    controls.controlBindingsForContext("hunt").map((entry) => [
      entry.actionId,
      entry,
    ]),
  );
  assert.equal(huntEntries.get("hunt.weaponPrimary")?.behavior, "press");
  assert.equal(huntEntries.get("hunt.scan")?.behavior, "press");
  assert.equal(huntEntries.get("hunt.aim")?.behavior, "hold");

  for (const context of controls.CONTROL_CONTEXTS) {
    const entries = controls.controlBindingsForContext(context);
    assert.ok(entries.length > 0);
    assert.ok(entries.every((entry) => entry.actionId.startsWith(`${context}.`)));
  }
});

test("THE PIT exposes complete collision-safe bindings for both local players", () => {
  assert.equal(controls.PIT_CONTROL_ACTION_IDS.length, 23);
  assert.deepEqual(
    controls.PIT_CONTROL_ACTION_IDS,
    controls.CONTROL_ACTION_IDS.filter((actionId) => actionId.startsWith("pit.")),
  );

  const pitEntries = controls.controlBindingsForContext("pit");
  assert.equal(pitEntries.length, 23);
  assert.deepEqual(
    pitEntries.map((entry) => entry.actionId),
    controls.PIT_CONTROL_ACTION_IDS,
  );
  assert.ok(
    pitEntries
      .filter((entry) => entry.actionId !== "pit.pause")
      .every((entry) => /^J[12] — /.test(entry.label)),
  );
  assert.equal(
    pitEntries.find((entry) => entry.actionId === "pit.pause")?.label,
    "Quitter / retour vaisseau",
  );
  assert.deepEqual(controls.DEFAULT_CONTROL_BINDINGS["pit.p1MoveLeft"], [
    "KeyQ",
    "ArrowLeft",
  ]);
  assert.deepEqual(controls.DEFAULT_CONTROL_BINDINGS["pit.p1Jump"], ["Space"]);
  assert.deepEqual(controls.DEFAULT_CONTROL_BINDINGS["pit.p2MoveLeft"], ["Numpad4"]);
  assert.deepEqual(controls.DEFAULT_CONTROL_BINDINGS["pit.p2Throw"], ["NumpadEnter"]);

  const pitCodes = new Set(pitEntries.flatMap((entry) => entry.keyCodes));
  for (const code of pitCodes) {
    const matches = controls.matchingControlActions("pit", code);
    assert.equal(matches.length, 1, `${code} doit piloter une seule action THE PIT`);
  }

  const conflicting = mutableDefaults();
  conflicting["pit.p2AttackLight"] = ["KeyJ"];
  const validation = controls.validateControlBindings(conflicting);
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.conflicts, [
    {
      context: "pit",
      keyCode: "KeyJ",
      actionIds: ["pit.p1AttackLight", "pit.p2AttackLight"],
    },
  ]);
});

test("THE PIT input adapter resolves remapped P1 and P2 controls deterministically", () => {
  const remapped = controls.rebindControlAction(
    controls.DEFAULT_CONTROL_BINDINGS,
    "pit.p1AttackLight",
    ["KeyB"],
  );
  assert.equal(remapped.accepted, true);
  assert.deepEqual(
    controls.pitInputFromControlCodes(
      1,
      new Set(["KeyQ", "KeyI", "KeyB"]),
      remapped.bindings,
    ),
    {
      left: true,
      right: false,
      down: false,
      jump: false,
      guardHigh: true,
      guardLow: false,
      attack: "light",
      throw: false,
    },
  );
  assert.deepEqual(
    controls.pitInputFromControlCodes(2, ["Numpad6", "Numpad5", "NumpadEnter"]),
    {
      left: false,
      right: true,
      down: false,
      jump: false,
      guardHigh: false,
      guardLow: false,
      attack: "heavy",
      throw: true,
    },
  );
  assert.equal(
    controls.pitInputFromControlCodes(1, ["KeyJ", "KeyK"]).attack,
    "light",
    "la priorité multi-coups doit rester stable",
  );
});

test("key names normalize to serializable KeyboardEvent codes and duplicates are removed", () => {
  assert.equal(controls.normalizeControlKeyCode("q"), "KeyQ");
  assert.equal(controls.normalizeControlKeyCode("keyz"), "KeyZ");
  assert.equal(controls.normalizeControlKeyCode(" "), "Space");
  assert.equal(controls.normalizeControlKeyCode("Esc"), "Escape");
  assert.equal(controls.normalizeControlKeyCode("not-a-real-key"), null);

  const input = mutableDefaults();
  input["hunt.melee"] = ["j", "KeyJ", "not-a-real-key"];
  const normalized = controls.normalizeControlBindings(input);
  assert.equal(normalized.valid, false);
  assert.deepEqual(normalized.bindings["hunt.melee"], ["KeyJ"]);
  assert.ok(normalized.issues.some((entry) => entry.code === "duplicate-key"));
  assert.ok(normalized.issues.some((entry) => entry.code === "unsupported-key"));

  const partial = controls.normalizeControlBindings({
    "hunt.melee": "l",
    "future.action": ["KeyP"],
  });
  assert.equal(partial.valid, true);
  assert.deepEqual(partial.bindings["hunt.melee"], ["KeyL"]);
  assert.deepEqual(
    partial.bindings["galaxy.flyLeft"],
    controls.DEFAULT_CONTROL_BINDINGS["galaxy.flyLeft"],
  );
  assert.ok(partial.issues.some((entry) => entry.code === "missing-action"));
  assert.ok(partial.issues.some((entry) => entry.code === "unknown-action"));
});

test("conflicts are errors only when actions can be active in the same context", () => {
  const input = mutableDefaults();
  input["hunt.melee"] = ["KeyE"];
  const validation = controls.validateControlBindings(input);
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.conflicts, [
    {
      context: "hunt",
      keyCode: "KeyE",
      actionIds: ["hunt.melee", "hunt.interact"],
    },
  ]);

  input["hunt.melee"] = ["KeyG"];
  assert.equal(controls.validateControlBindings(input).valid, true);
  assert.equal(
    controls.matchesControlAction("galaxy.returnToGalaxy", "KeyG"),
    true,
  );
});

test("rebinding rejects collisions or replaces only safe aliases in the same context", () => {
  const rejected = controls.rebindControlAction(
    controls.DEFAULT_CONTROL_BINDINGS,
    "hunt.melee",
    ["KeyE"],
  );
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.issues[0].code, "key-conflict");
  assert.deepEqual(rejected.bindings, controls.DEFAULT_CONTROL_BINDINGS);

  const replaced = controls.rebindControlAction(
    controls.DEFAULT_CONTROL_BINDINGS,
    "hunt.melee",
    ["ArrowLeft"],
    { conflictPolicy: "replace" },
  );
  assert.equal(replaced.accepted, true);
  assert.deepEqual(replaced.bindings["hunt.melee"], ["ArrowLeft"]);
  assert.deepEqual(replaced.bindings["hunt.moveLeft"], ["KeyQ"]);
  assert.deepEqual(replaced.conflicts, []);

  const orphaned = controls.rebindControlAction(
    controls.DEFAULT_CONTROL_BINDINGS,
    "hunt.melee",
    ["KeyE"],
    { conflictPolicy: "replace" },
  );
  assert.equal(orphaned.accepted, false);
  assert.ok(orphaned.issues.some((entry) => entry.code === "empty-binding"));
});

test("matching helpers prefer physical codes and provide a key-only fallback", () => {
  assert.equal(
    controls.matchesControlAction(
      "hunt.moveLeft",
      { code: "KeyQ", key: "a" },
    ),
    true,
  );
  assert.equal(
    controls.matchesControlAction(
      "hunt.moveLeft",
      { code: "KeyA", key: "q" },
    ),
    false,
  );
  assert.equal(
    controls.controlKeyCodeFromInput({ code: "Unidentified", key: "q" }),
    "KeyQ",
  );
  assert.equal(
    controls.controlKeyCodeFromInput({ key: "Shift", location: 2 }),
    "ShiftRight",
  );
  assert.deepEqual(
    controls.matchingControlActions("training", { code: "Space", key: " " }),
    ["training.primary"],
  );
  assert.deepEqual(
    controls.matchingControlActions("workshop", { code: "KeyQ", key: "a" }),
    ["workshop.left"],
  );
});

test("v1 binding envelopes migrate by restoring every THE PIT action", () => {
  const legacyBindings = Object.fromEntries(
    Object.entries(mutableDefaults()).filter(([actionId]) => !actionId.startsWith("pit.")),
  );
  assert.equal(Object.keys(legacyBindings).length, 48);

  const migrated = controls.deserializeControlBindings({
    version: 1,
    bindings: legacyBindings,
  });
  assert.equal(migrated.restored, true);
  assert.deepEqual(migrated.bindings["pit.p1AttackLight"], ["KeyJ"]);
  assert.deepEqual(migrated.bindings["pit.p2AttackLight"], ["Numpad1"]);
  assert.equal(
    migrated.issues.filter((entry) => entry.code === "missing-action").length,
    23,
  );
  assert.deepEqual(controls.findControlBindingConflicts(migrated.bindings), []);

  const serialized = controls.serializeControlBindings(migrated.bindings);
  assert.equal(serialized.version, 2);
  assert.equal(Object.keys(serialized.bindings).length, 71);
});

test("versioned persistence round-trips and corrupt storage falls back atomically", () => {
  const custom = controls.rebindControlAction(
    controls.DEFAULT_CONTROL_BINDINGS,
    "galaxy.returnToGalaxy",
    ["KeyB"],
  );
  assert.equal(custom.accepted, true);
  const serialized = controls.serializeControlBindings(custom.bindings);
  assert.equal(serialized.version, controls.CONTROL_BINDING_SCHEMA_VERSION);
  const restored = controls.deserializeControlBindings(JSON.stringify(serialized));
  assert.equal(restored.restored, true);
  assert.deepEqual(restored.bindings, custom.bindings);

  const wrongVersion = controls.deserializeControlBindings({
    version: 99,
    bindings: serialized.bindings,
  });
  assert.equal(wrongVersion.restored, false);
  assert.equal(wrongVersion.bindings, controls.DEFAULT_CONTROL_BINDINGS);
  assert.equal(wrongVersion.issues[0].code, "unsupported-version");

  const corrupt = mutableDefaults();
  corrupt["hunt.melee"] = ["KeyE"];
  const conflicted = controls.deserializeControlBindings({
    version: 1,
    bindings: corrupt,
  });
  assert.equal(conflicted.restored, false);
  assert.equal(conflicted.bindings, controls.DEFAULT_CONTROL_BINDINGS);
  assert.ok(conflicted.issues.some((entry) => entry.code === "key-conflict"));
  assert.throws(
    () => controls.serializeControlBindings(corrupt),
    (error) => error.name === "ControlBindingsSerializationError",
  );
});
