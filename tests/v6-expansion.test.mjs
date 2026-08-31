import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

const transparentAtlases = [
  "ships-atlas.png",
  "prey-atlas.png",
  "equipment-atlas.png",
  "masks-trophies-atlas.png",
  "ranks-lasers-atlas.png",
];

test("V6 keeps each OpenAI master and exports real transparent atlases", async () => {
  const masterNames = [
    "openai-ships-chroma-master.png",
    "openai-prey-chroma-master.png",
    "openai-equipment-chroma-master.png",
    "openai-masks-trophies-chroma-master.png",
    "openai-ranks-lasers-chroma-master.png",
  ];
  for (const masterName of masterNames) {
    const metadata = await sharp(`art-source/v6/sprites/${masterName}`).metadata();
    assert.ok((metadata.width ?? 0) >= 1_400, `${masterName}: production width`);
    assert.ok((metadata.height ?? 0) >= 1_000, `${masterName}: production height`);
  }

  for (const atlasName of transparentAtlases) {
    const image = sharp(`public/game/sprites/v6/${atlasName}`).ensureAlpha();
    const metadata = await image.metadata();
    const stats = await image.stats();
    const alpha = stats.channels[3];
    assert.equal(metadata.hasAlpha, true, `${atlasName}: alpha channel`);
    assert.equal(alpha.min, 0, `${atlasName}: transparent background`);
    assert.equal(alpha.max, 255, `${atlasName}: opaque subjects`);
    assert.ok(alpha.mean > 8 && alpha.mean < 180, `${atlasName}: usable matte`);
  }
});

test("V6 environment masters are large and deployed as gameplay backgrounds", async () => {
  const pairs = [
    [
      "art-source/v6/environments/openai-jungle-multiscreen-master.png",
      "public/game/backgrounds/jungle-multiscreen-v6.png",
    ],
    [
      "art-source/v6/environments/openai-armory-war-room-master.png",
      "public/game/backgrounds/armory-war-room-v6.png",
    ],
  ];
  for (const [masterPath, runtimePath] of pairs) {
    const [master, runtime] = await Promise.all([
      sharp(masterPath).metadata(),
      sharp(runtimePath).metadata(),
    ]);
    assert.ok((master.width ?? 0) >= 1_600);
    assert.ok((master.height ?? 0) >= 900);
    assert.deepEqual(
      [runtime.width, runtime.height],
      [master.width, master.height],
      `${runtimePath}: runtime keeps master composition`,
    );
  }
});

test("V6 runtime wires catalogue, physical deck, hierarchy, sectors and workshop", async () => {
  const [client, canvas, deck, catalogue, css] = await Promise.all([
    readFile("app/game/GameClient.tsx", "utf8"),
    readFile("app/game/HuntCanvas.tsx", "utf8"),
    readFile("app/game/PhysicalShipDeck.tsx", "utf8"),
    readFile("app/game/CatalogueHunterBrowser.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  for (const marker of [
    "CatalogueHunterBrowser",
    "GalaxyMapPanel",
    "PhysicalShipDeck",
    "TrophyWorkshop",
    "V6AtlasSprite",
    "V6_ARMORY_RACK_ORDER",
    "V6_PLASMA_CASTER_ASSEMBLY",
    "V6_PREY_GALLERY_ORDER",
    "V6_RANK_AND_CASTE_ORDER",
  ]) {
    assert.match(client, new RegExp(marker));
  }
  assert.match(canvas, /getWorldScreenAtX/);
  assert.match(canvas, /ships-atlas\.png/);
  assert.match(canvas, /prey-atlas\.png/);
  assert.match(canvas, /drawAmbientFauna/);
  assert.match(canvas, /V6_MISSION_VISUALS\[mission\.id\]\.extractionShipId/);
  assert.match(canvas, /surface: \{ y: 0, height: 430 \}/);
  assert.match(canvas, /"mid-depth": \{ y: 430, height: 206 \}/);
  assert.match(canvas, /understory: \{ y: 636, height: 305 \}/);
  assert.match(canvas, /worldScreenId/);
  assert.match(deck, /SHIP_INTERIOR_KIT\.wall/);
  assert.match(catalogue, /referenceUrlsForCatalogueEntry/);
  assert.match(catalogue, /catalogueReferenceUrlsForEntry\(entry\)/);
  assert.match(css, /\.catalogueHunterBrowser__sources/);
  assert.match(css, /\.catalogueHunterBrowser \{[\s\S]*grid-column: 1 \/ -1/);
  assert.match(css, /\.briefing-visual > \.target-cutout[\s\S]*object-fit: contain/);
  assert.match(css, /\.trophy-art[\s\S]*overflow: hidden/);
  assert.match(client, /const loadout = loadoutForPreset\(presetId\)/);
  assert.match(client, /const referenceLoadout = loadoutForPreset\(referencePresetId\)/);
  assert.match(client, /loadout: referenceLoadout/);
  assert.doesNotMatch(client, /appearance\.laserColorId\s*=\s*save\.appearance/);
  assert.ok(
    (client.match(/appearance:\s*\{ \.\.\.save\.appearance, presetId: "custom" \}/g) ?? [])
      .length >= 3,
    "individual armor, weapon and gear selection must leave legendary mode",
  );
  assert.match(
    css,
    /\.briefing-visual > \.target-cutout[\s\S]*width:\s*60%[\s\S]*height:\s*81%/,
  );
});
