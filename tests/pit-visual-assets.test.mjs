import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import sharp from "sharp";

const registryPromise = build({
  entryPoints: [fileURLToPath(new URL("../app/game/pitVisualAssets.ts", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
}).then((result) => import(
  "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
));

const deliveredIds = ["jungle-hunter", "city-hunter", "berserker", "wolf"];

test("PIT selection art only registers the four delivered fighters with unique local illustrations", async () => {
  const registry = await registryPromise;
  assert.deepEqual(registry.PIT_ILLUSTRATED_FIGHTER_IDS, deliveredIds);
  assert.deepEqual(Object.keys(registry.PIT_FIGHTER_KEY_ART), deliveredIds);
  const paths = new Set();
  for (const id of deliveredIds) {
    const asset = registry.getPitFighterKeyArt(id);
    assert.equal(asset.fighterId, id);
    assert.equal(asset.kind, "selection-key-art");
    assert.equal(asset.nativeFacing, "right");
    assert.equal(asset.background, "#101916");
    assert.equal(asset.src, `/game/assets/v23/pit/fighters/${id}-key-art.webp`);
    assert.equal(asset.width, 1024);
    assert.equal(asset.height, 1536);
    assert.ok(asset.alt.trim().length > 30);
    assert.equal(paths.has(asset.src), false);
    paths.add(asset.src);
  }
});

test("PIT fighters without delivered art and invalid IDs keep the existing fallback", async () => {
  const { getPitFighterKeyArt } = await registryPromise;
  for (const id of [
    "scar", "celtic", "feral-hunter", "falconer", "scarface", "valkyrie",
    "witch", "enforcer", "kok-warlord", "stone-heart", "constructor", "toString", "",
  ]) {
    assert.equal(getPitFighterKeyArt(id), null, id);
  }
});

test("PIT delivered WebP files are opaque static selection illustrations with portrait geometry", async () => {
  const { PIT_FIGHTER_KEY_ART } = await registryPromise;
  for (const asset of Object.values(PIT_FIGHTER_KEY_ART)) {
    const path = fileURLToPath(new URL(`../public${asset.src}`, import.meta.url));
    await access(path);
    const metadata = await sharp(path).metadata();
    assert.equal(metadata.format, "webp", asset.fighterId);
    assert.equal(metadata.width, asset.width, asset.fighterId);
    assert.equal(metadata.height, asset.height, asset.fighterId);
    assert.equal(metadata.hasAlpha, false, asset.fighterId);
    assert.ok(!metadata.pages || metadata.pages === 1, "selection illustrations are static");

  }
});
