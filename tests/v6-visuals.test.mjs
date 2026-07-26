import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { build } from "vite";

import { MISSIONS } from "../app/game/data.ts";

import {
  V6_ALL_VISUAL_IDS,
  V6_ARMORY_RACK_ORDER,
  V6_ATLASES,
  V6_GEAR_VISUAL_BY_ID,
  V6_LASER_VISUAL_BY_COLOR_ID,
  V6_MASK_VISUAL_BY_ID,
  V6_MISSION_VISUALS,
  V6_PLASMA_CASTER_ASSEMBLY,
  V6_PREY_GALLERY_ORDER,
  V6_RANK_AND_CASTE_ORDER,
  V6_RANK_VISUAL_BY_ID,
  V6_SHIP_VISUAL_BY_ROLE,
  V6_TROPHY_GALLERY_ORDER,
  V6_TROPHY_VISUAL_BY_DEFINITION_ID,
  V6_TROPHY_VISUAL_BY_PART_ID,
  V6_VISUAL_CELLS,
  V6_VISUAL_COUNTS,
  V6_WEAPON_VISUAL_BY_ID,
  getV6Visual,
  isV6VisualId,
  resolveV6TrophyVisualId,
} from "../app/game/v6Visuals.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-v6-sprite-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  ssr: { noExternal: ["react", "react/jsx-runtime"] },
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/V6AtlasSprite.tsx"),
    rollupOptions: { output: { entryFileNames: "v6-atlas-sprite.mjs" } },
  },
});

const { V6AtlasSprite } = await import(
  pathToFileURL(join(outputDirectory, "v6-atlas-sprite.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

const values = (record) => Object.values(record);

test("V6 exposes every atlas object as a unique semantic runtime cell", () => {
  assert.equal(V6_ALL_VISUAL_IDS.length, 43);
  assert.equal(new Set(V6_ALL_VISUAL_IDS).size, 43);
  assert.deepEqual(V6_VISUAL_COUNTS, {
    ship: 3,
    prey: 4,
    weapon: 6,
    gear: 3,
    equipment: 3,
    mask: 8,
    trophy: 4,
    rank: 7,
    laser: 5,
  });

  for (const id of V6_ALL_VISUAL_IDS) {
    assert.equal(isV6VisualId(id), true, id);
    assert.equal(getV6Visual(id), V6_VISUAL_CELLS[id]);
    assert.ok(V6_VISUAL_CELLS[id].label.length > 3, `${id}: accessible label`);
  }
  assert.equal(isV6VisualId("atlas-entier"), false);
});

test("every crop matches the deployed atlas dimensions and contains visible pixels", async () => {
  const metadataByAtlas = new Map();
  for (const [atlasId, atlas] of Object.entries(V6_ATLASES)) {
    const imagePath = join(projectRoot, "public", atlas.src.slice(1));
    const metadata = await sharp(imagePath).metadata();
    assert.deepEqual(
      [metadata.width, metadata.height, metadata.hasAlpha],
      [atlas.width, atlas.height, true],
      atlasId,
    );
    metadataByAtlas.set(atlasId, imagePath);
  }

  for (const id of V6_ALL_VISUAL_IDS) {
    const visual = V6_VISUAL_CELLS[id];
    const atlas = V6_ATLASES[visual.atlasId];
    const { x, y, width, height } = visual.crop;
    for (const value of [x, y, width, height]) assert.equal(Number.isInteger(value), true);
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0, `${id}: positive crop`);
    assert.ok(x + width <= atlas.width, `${id}: horizontal atlas bounds`);
    assert.ok(y + height <= atlas.height, `${id}: vertical atlas bounds`);

    const stats = await sharp(metadataByAtlas.get(visual.atlasId))
      .extract({ left: x, top: y, width, height })
      .ensureAlpha()
      .stats();
    const alpha = stats.channels[3];
    assert.equal(alpha.min, 0, `${id}: keeps transparent padding`);
    assert.equal(alpha.max, 255, `${id}: contains opaque artwork`);
    assert.ok(alpha.mean > 0.5 && alpha.mean < 220, `${id}: usable alpha coverage`);
  }
});

test("cells from the same atlas never overlap", () => {
  for (let index = 0; index < V6_ALL_VISUAL_IDS.length; index += 1) {
    const leftId = V6_ALL_VISUAL_IDS[index];
    const left = V6_VISUAL_CELLS[leftId];
    for (let otherIndex = index + 1; otherIndex < V6_ALL_VISUAL_IDS.length; otherIndex += 1) {
      const rightId = V6_ALL_VISUAL_IDS[otherIndex];
      const right = V6_VISUAL_CELLS[rightId];
      if (left.atlasId !== right.atlasId) continue;
      const overlapWidth = Math.max(
        0,
        Math.min(left.crop.x + left.crop.width, right.crop.x + right.crop.width) -
          Math.max(left.crop.x, right.crop.x),
      );
      const overlapHeight = Math.max(
        0,
        Math.min(left.crop.y + left.crop.height, right.crop.y + right.crop.height) -
          Math.max(left.crop.y, right.crop.y),
      );
      assert.equal(overlapWidth * overlapHeight, 0, `${leftId} / ${rightId}`);
    }
  }
});

test("loadout, masks, ranks, lasers, trophies and missions have exhaustive mappings", () => {
  assert.deepEqual(Object.keys(V6_WEAPON_VISUAL_BY_ID).sort(), [
    "combistick",
    "plasma-caster",
    "smart-disc",
    "wristblades",
    "yautja-bow",
  ]);
  assert.deepEqual(Object.keys(V6_GEAR_VISUAL_BY_ID).sort(), [
    "audio-decoy",
    "motion-sensor",
    "netgun",
    "snare",
  ]);
  assert.equal(Object.keys(V6_MASK_VISUAL_BY_ID).length, 15);
  assert.equal(Object.keys(V6_RANK_VISUAL_BY_ID).length, 4);
  assert.equal(Object.keys(V6_LASER_VISUAL_BY_COLOR_ID).length, 5);
  assert.equal(Object.keys(V6_MISSION_VISUALS).length, 8);
  assert.equal(V6_ARMORY_RACK_ORDER.length, 12);
  assert.equal(V6_PREY_GALLERY_ORDER.length, 4);
  assert.equal(V6_TROPHY_GALLERY_ORDER.length, 4);
  assert.equal(V6_RANK_AND_CASTE_ORDER.length, 7);
  assert.notEqual(
    V6_PLASMA_CASTER_ASSEMBLY.cannonId,
    V6_PLASMA_CASTER_ASSEMBLY.articulatedArmId,
  );

  const mappedIds = [
    ...values(V6_SHIP_VISUAL_BY_ROLE),
    ...values(V6_WEAPON_VISUAL_BY_ID),
    ...values(V6_GEAR_VISUAL_BY_ID),
    ...values(V6_MASK_VISUAL_BY_ID),
    ...values(V6_TROPHY_VISUAL_BY_PART_ID),
    ...values(V6_TROPHY_VISUAL_BY_DEFINITION_ID),
    ...values(V6_RANK_VISUAL_BY_ID),
    ...values(V6_LASER_VISUAL_BY_COLOR_ID),
    ...V6_ARMORY_RACK_ORDER,
    ...V6_PREY_GALLERY_ORDER,
    ...V6_TROPHY_GALLERY_ORDER,
    ...V6_RANK_AND_CASTE_ORDER,
    ...Object.values(V6_MISSION_VISUALS).flatMap(Object.values),
  ];
  for (const id of mappedIds) assert.equal(isV6VisualId(id), true, id);

  assert.equal(V6_MISSION_VISUALS["jungle-vey"].faunaId, "prey-thornback-ravager");
  assert.equal(V6_MISSION_VISUALS["ice-cryostalker"].faunaId, "prey-glacier-shellback");
  assert.equal(V6_MISSION_VISUALS["volcano-bad-blood"].faunaId, "prey-cindermaw-drake");
  assert.equal(V6_MISSION_VISUALS["jungle-vey"].trophyId, "rank-hunter");
  assert.equal(
    V6_MISSION_VISUALS["ice-cryostalker"].trophyId,
    "trophy-horned-skull",
  );
  assert.equal(
    V6_MISSION_VISUALS["volcano-bad-blood"].trophyId,
    "mask-stalker-obsidian",
  );
  assert.equal(
    V6_TROPHY_VISUAL_BY_DEFINITION_ID["trophy-vey"],
    "rank-hunter",
  );
  assert.equal(
    V6_TROPHY_VISUAL_BY_DEFINITION_ID["trophy-bad-blood"],
    "mask-stalker-obsidian",
  );
});

test("named trophy identity wins over anatomy and every part has a stable fallback", () => {
  assert.equal(
    resolveV6TrophyVisualId({
      definitionId: "trophy-vey",
      partId: "skull-and-spine",
    }),
    "rank-hunter",
    "Vey must carry her insignia, never the anatomical fallback",
  );
  assert.equal(
    resolveV6TrophyVisualId({
      definitionId: "trophy-bad-blood",
      partId: "mask",
    }),
    "mask-stalker-obsidian",
  );
  assert.equal(
    resolveV6TrophyVisualId({
      definitionId: "trophy-cryostalker",
      partId: "skull-and-spine",
    }),
    "trophy-horned-skull",
  );
  assert.equal(
    resolveV6TrophyVisualId({ definitionId: "unknown", partId: "insignia" }),
    "rank-hunter",
  );
  assert.equal(
    resolveV6TrophyVisualId({ definitionId: "unknown", partId: "mask" }),
    "mask-stalker-obsidian",
  );
  assert.equal(
    resolveV6TrophyVisualId({
      definitionId: "unknown",
      partId: "skull-and-spine",
    }),
    "trophy-skull-spine-plaque",
  );
});

test("mission data declares the exact object physically claimed", () => {
  assert.deepEqual(
    Object.fromEntries(
      MISSIONS.map(({ id, trophy }) => [id, trophy.partId]),
    ),
    {
      "jungle-vey": "insignia",
      "ice-cryostalker": "skull-and-spine",
      "volcano-bad-blood": "mask",
      "swamp-hydra": "skull-and-spine",
      "desert-sandmaw": "skull",
      "ocean-leviathan": "skull-and-spine",
      "fungal-hivemind": "skull",
      "ruins-ancient-guardian": "mask",
    },
  );
});

test("V6AtlasSprite renders one cropped cell with an accessible or decorative contract", async () => {
  const accessible = renderToStaticMarkup(
    createElement(V6AtlasSprite, {
      id: "equipment-plasma-caster-arm",
      label: "Bras mobile test",
      loading: "eager",
    }),
  );
  assert.match(accessible, /role="img"/);
  assert.match(accessible, /aria-label="Bras mobile test"/);
  assert.match(accessible, /data-v6-visual-id="equipment-plasma-caster-arm"/);
  assert.match(accessible, /data-v6-atlas="equipment"/);
  assert.match(accessible, /data-v6-crop="745,690,330,396"/);
  assert.match(accessible, /overflow:hidden/);
  assert.match(accessible, /equipment-atlas\.png/);
  assert.match(accessible, /alt=""/);

  const decorative = renderToStaticMarkup(
    createElement(V6AtlasSprite, {
      id: "laser-cyan",
      decorative: true,
    }),
  );
  assert.match(decorative, /aria-hidden="true"/);
  assert.doesNotMatch(decorative, /role="img"/);
  assert.doesNotMatch(decorative, /aria-label=/);

  const source = await readFile(
    join(projectRoot, "app/game/V6AtlasSprite.tsx"),
    "utf8",
  );
  assert.match(source, /aspectRatio/);
  assert.match(source, /maxHeight: "none"/);
  assert.match(source, /pointerEvents: "none"/);
});
