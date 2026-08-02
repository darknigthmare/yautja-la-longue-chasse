import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const read = (path) => readFile(resolve(path), "utf8");

test("every keyboard-driven non-hunt surface accepts saved control bindings", async () => {
  const [galaxy, hub, deck, training, workshop] = await Promise.all([
    read("app/game/GalaxyMapPanel.tsx"),
    read("app/game/ShipHub.tsx"),
    read("app/game/PhysicalShipDeck.tsx"),
    read("app/game/TrainingDrill.tsx"),
    read("app/game/TrophyWorkshop.tsx"),
  ]);

  for (const source of [galaxy, hub, deck, training, workshop]) {
    assert.match(source, /controlBindings\?: ControlBindings/);
    assert.match(source, /controlBindings = DEFAULT_CONTROL_BINDINGS/);
  }

  assert.match(galaxy, /matchingControlActions\([\s\S]*"galaxy"/);
  assert.match(galaxy, /movementVector\([\s\S]*controlBindings/);
  assert.match(hub, /matchingControlActions\([\s\S]*"shipHub"/);
  assert.match(hub, /controlBindings=\{controlBindings\}/);
  assert.match(deck, /matchesControlAction\("hunt\.moveLeft"/);
  assert.match(deck, /matchesControlAction\("hunt\.jump"/);
  assert.match(deck, /matchesControlAction\("hunt\.interact"/);
  assert.match(training, /matchingControlActions\([\s\S]*"training"/);
  assert.match(workshop, /matchingControlActions\([\s\S]*"workshop"/);
});

test("visible keyboard guidance follows the active bindings", async () => {
  const [labels, galaxy, hub, deck, training, workshop] = await Promise.all([
    read("app/game/controlBindingLabels.ts"),
    read("app/game/GalaxyMapPanel.tsx"),
    read("app/game/ShipHub.tsx"),
    read("app/game/PhysicalShipDeck.tsx"),
    read("app/game/TrainingDrill.tsx"),
    read("app/game/TrophyWorkshop.tsx"),
  ]);

  assert.match(labels, /export function controlActionShortcut/);
  for (const source of [galaxy, hub, deck, training, workshop]) {
    assert.match(source, /controlActionShortcut\(/);
  }
});
