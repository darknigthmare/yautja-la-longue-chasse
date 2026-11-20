import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

// These are presentation fixtures, not played campaign or artistic proofs.
// Bundle the real parents. Only CSS class lookup is neutralized; React keeps
// the exact installed instance also used by react-dom/server in this test.
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const directory = await mkdtemp(join(tmpdir(), "yautja-homeworld-equipment-ssr-"));
let api;
try {
  const output = join(directory, "parents.mjs");
  await build({
    stdin: {
      contents: [
        'export { default as Hub } from "./app/game/HomeworldHub.tsx";',
        'export { default as Passage } from "./app/game/HomeworldPassageV67.tsx";',
        'export { default as Region } from "./app/game/HomeworldRegionV68.tsx";',
        'export { default as Modular } from "./app/game/HomeworldModularHunter.tsx";',
        'export { defaultSave } from "./app/game/save.ts";',
        'export { createNurseryCampaign } from "./app/game/systems/nurseryCampaign.ts";',
        'export { readHunterGauntletV133 } from "./app/game/systems/useHunterGauntletV133.ts";',
        'export { DEFAULT_SHIP_ID } from "./app/game/shipCatalogue.ts";',
      ].join("\n"),
      resolveDir: root,
      loader: "tsx",
    },
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    logLevel: "silent",
    plugins: [
      {
        name: "one-installed-react-instance",
        setup(builder) {
          builder.onResolve({ filter: /^(?:react|react-dom)(?:\/.*)?$/ }, args => ({
            path: require.resolve(args.path),
            external: true,
          }));
        },
      },
      {
        name: "css-classes-only-for-ssr",
        setup(builder) {
          builder.onLoad({ filter: /\.css$/ }, () => ({
            contents: 'export default new Proxy({}, { get: (_target, key) => typeof key === "string" ? key : "" });',
            loader: "js",
          }));
        },
      },
    ],
  });
  api = await import(pathToFileURL(output).href);
} finally {
  await rm(directory, { recursive: true, force: true });
}

function adultSave() {
  const save = api.defaultSave("2026-11-20T00:00:00.000Z");
  save.appearance = { ...save.appearance, presetId: "custom" };
  save.profile = { ...save.profile, rankId: "blooded", honor: 250 };
  save.gauntletV134 = {
    version: 1,
    ownerCreatedAt: save.createdAt,
    equippedId: "city-hunter",
    claimedStudies: [],
  };
  save.loadout = { ...save.loadout, armorId: "hunter", weaponIds: ["wristblades", "plasma-caster"] };
  return save;
}

function ownedGauntlet(save) {
  return api.readHunterGauntletV133(null, save.createdAt, save.profile.rankId, new Map(), save.gauntletV134);
}

// Limit assertions to the actual player subtree: React 19 may emit preload
// links above the parent and these scenes also render unrelated native NPCs.
function playerSubtree(html, marker) {
  const opening = new RegExp("<([a-z][\\w:-]*)\\b[^>]*\\b" + marker + "(?==|\\s|>)[^>]*>", "i").exec(html);
  assert.ok(opening, "The real parent must render its " + marker + " player");
  const tag = opening[1];
  const tokens = new RegExp("<\\/?"+ tag + "\\b[^>]*>", "gi");
  tokens.lastIndex = opening.index;
  let depth = 0;
  for (let token; (token = tokens.exec(html));) {
    if (token[0].startsWith("</")) depth -= 1;
    else if (!token[0].endsWith("/>")) depth += 1;
    if (depth === 0) return html.slice(opening.index, tokens.lastIndex);
  }
  assert.fail("The actual player's markup must have a closing element");
}

function renderPlayer(scene, save) {
  const before = JSON.stringify(save);
  const common = { save, gauntletVariantId: ownedGauntlet(save), suspended: true };
  let element;
  let marker;
  if (scene === "hub") {
    marker = "data-homeworld-actor";
    element = React.createElement(api.Hub, {
      ...common,
      selectedShipId: api.DEFAULT_SHIP_ID,
      ephemeralSession: true,
      onProgress: () => false,
      onService: () => {},
      onReturnShip: () => {},
      onNotify: () => {},
    });
  } else if (scene === "passage") {
    marker = "data-passage-actor";
    element = React.createElement(api.Passage, {
      ...common,
      regionId: "ash-marches",
      onCheckpoint: () => false,
      onReachBiome: () => false,
      onReachCity: () => false,
    });
  } else {
    marker = "data-region-player";
    element = React.createElement(api.Region, {
      ...common,
      regionId: "pillar-jungle",
      startAtVillage: true,
      onCheckpoint: () => false,
      onReachCity: () => false,
    });
  }
  const html = renderToStaticMarkup(element);
  assert.equal(JSON.stringify(save), before, "Rendering equipment must not mutate the campaign");
  return playerSubtree(html, marker);
}

function assertGauntlet(player, id) {
  for (const part of ["base", "lid"]) {
    const source = "/game/assets/v139/rig-gauntlets/" + id + "/" + part + ".svg";
    assert.ok(player.includes('src="' + source + '"'), "The player must wear " + source);
  }
}

for (const scene of ["hub", "passage", "region"]) {
  test(scene + ": the actual custom player keeps its owner-resolved City Hunter kit", () => {
    const save = adultSave();
    assert.equal(ownedGauntlet(save), "city-hunter");
    const player = renderPlayer(scene, save);
    assertGauntlet(player, "city-hunter");
    assert.doesNotMatch(player, /\/rig-gauntlets\/jungle-hunter\//);
    assert.match(player, /data-armor-module="chest-classic"/);
    assert.match(player, /data-armor-module="bracer"/);
    assert.match(player, /data-armor-module="shin"/);
    assert.match(player, /data-homeworld-layer="blade-housing"/);
  });

  test(scene + ": scout armor and a loadout without wristblades omit the same plates as the Hub", () => {
    const save = adultSave();
    // Explicit owned inventory for this presentation fixture, not an award.
    save.inventory.unlockedArmorIds = [...new Set([...save.inventory.unlockedArmorIds, "scout"])];
    save.loadout = { ...save.loadout, armorId: "scout", weaponIds: ["combistick", "plasma-caster"] };
    const player = renderPlayer(scene, save);
    assertGauntlet(player, "city-hunter");
    assert.match(player, /data-armor-module="chest-classic"/);
    assert.doesNotMatch(player, /data-armor-module="(?:bracer|thigh|thigh-lower|knee|shin)"/);
    assert.doesNotMatch(player, /data-homeworld-layer="blade-housing"/);
  });

  test(scene + ": the existing named whole-character plate remains unchanged", () => {
    const save = adultSave();
    save.appearance.presetId = "jungle-hunter";
    const player = renderPlayer(scene, save);
    assert.ok(player.includes('src="/game/sprites/v5/film-plates/jungle-hunter.png"'));
    assert.doesNotMatch(player, /data-modular-homeworld-character/);
    assert.doesNotMatch(player, /data-homeworld-layer="gauntlet"/);
  });
}

for (const scene of ["hub", "region"]) {
  test(scene + ": the real youth presentation keeps its own branch without an adult kit", () => {
    const save = api.defaultSave("2026-11-20T00:00:00.000Z");
    save.appearance = { ...save.appearance, presetId: "custom", bodyMorphId: "young" };
    save.prologue = api.createNurseryCampaign();
    const player = renderPlayer(scene, save);
    assert.doesNotMatch(player, /data-modular-homeworld-character/);
    assert.doesNotMatch(player, /data-homeworld-layer="(?:armor|gauntlet|blade-housing)"/);
  });
}

test("an adult custom young morphology keeps the adult kit: morphology does not grant or remove campaign age", () => {
  const save = adultSave();
  save.appearance.bodyMorphId = "young";
  const player = renderPlayer("region", save);
  assert.match(player, /data-modular-homeworld-character/);
  assertGauntlet(player, "city-hunter");
  assert.match(player, /data-homeworld-layer="blade-housing"/);
});

test("the existing anatomical chooser remains without armor or wrist equipment", () => {
  const save = adultSave();
  const player = renderToStaticMarkup(React.createElement(api.Modular, {
    morphId: save.appearance.bodyMorphId,
    dreadStyleId: save.appearance.dreadStyleId,
    appearance: save.appearance,
    gauntletVariantId: ownedGauntlet(save),
    hasWristblades: true,
  }));
  assert.match(player, /data-modular-homeworld-character/);
  assert.doesNotMatch(player, /data-homeworld-layer="(?:armor|gauntlet|blade-housing)"/);
});
