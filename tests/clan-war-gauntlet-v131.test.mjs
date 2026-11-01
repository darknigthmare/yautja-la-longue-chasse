import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_WAR_PRESENTATION_V131, WAR_PRESENTATION_KEY_V131,
  parseClanWarPresentationV131,
} from "../app/game/systems/clanWarViewV131.ts";

test("V131 defaults to hologram and preserves the explicit classic preference", () => {
  assert.equal(DEFAULT_WAR_PRESENTATION_V131, "gauntlet");
  assert.equal(parseClanWarPresentationV131(null), "gauntlet");
  assert.equal(parseClanWarPresentationV131(undefined), "gauntlet");
  assert.equal(parseClanWarPresentationV131("gauntlet"), "gauntlet");
  assert.equal(parseClanWarPresentationV131("classic"), "classic");
  assert.equal(parseClanWarPresentationV131("ancient"), "gauntlet");
  assert.equal(parseClanWarPresentationV131({ mode: "classic" }), "gauntlet");
  assert.notEqual(WAR_PRESENTATION_KEY_V131, "yautja.clan-war.v85.simulation");
});

test("V131 uses one live atlas and keeps presentation separate from war writes", () => {
  const panel = readFileSync(fileURLToPath(new URL("../app/game/ClanWarPanelV85.tsx", import.meta.url)), "utf8");
  const stage = readFileSync(fileURLToPath(new URL("../app/game/ClanWarGauntletV131.tsx", import.meta.url)), "utf8");
  assert.match(panel, /<ClanWarGauntletV131\b/);
  assert.equal((panel.match(/<ClanWarAtlasV95\b/g) ?? []).length, 1);
  assert.match(panel, /data-testid="clan-war-view-switch-v131"/);
  assert.match(panel, /aria-pressed=\{presentation === "gauntlet"\}/);
  assert.match(panel, /aria-pressed=\{presentation === "classic"\}/);
  assert.match(panel, /window\.localStorage\.setItem\(WAR_PRESENTATION_KEY_V131, next\)/);
  assert.match(stage, /\{children\}/);
  assert.match(stage, /data-testid="clan-war-shared-atlas-v131"/);
});
