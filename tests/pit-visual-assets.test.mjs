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
    const repaired = id === "city-hunter";
    assert.equal(asset.kind, repaired ? "static-bitmap" : "selection-key-art");
    assert.equal(asset.nativeFacing, "right");
    assert.equal(asset.background, "#101916");
    assert.equal(asset.src, repaired ? "/game/sprites/v31/film-plates/city-hunter.png" : "/game/assets/v23/pit/fighters/" + id + "-key-art.webp");
    assert.equal(asset.width, repaired ? 987 : 1024);
    assert.equal(asset.height, repaired ? 1568 : 1536);
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

test("PIT selection reads three unchanged opaque WebPs and the repaired static alpha PNG", async () => {
  const { PIT_FIGHTER_KEY_ART } = await registryPromise;
  for (const asset of Object.values(PIT_FIGHTER_KEY_ART)) {
    const path = fileURLToPath(new URL(`../public${asset.src}`, import.meta.url));
    await access(path);
    const metadata = await sharp(path).metadata();
    const repaired = asset.fighterId === "city-hunter";
    assert.equal(metadata.format, repaired ? "png" : "webp", asset.fighterId);
    assert.equal(metadata.width, asset.width, asset.fighterId);
    assert.equal(metadata.height, asset.height, asset.fighterId);
    assert.equal(metadata.hasAlpha, repaired, asset.fighterId);
    assert.ok(!metadata.pages || metadata.pages === 1, "selection illustrations are static");

  }
});

test("City Hunter has an independent left-facing alpha illustration while other selections keep their exact sources", async () => {
  const registry = await registryPromise;
  const right = registry.getPitFighterKeyArt("city-hunter", "right");
  const left = registry.getPitFighterKeyArt("city-hunter", "left");
  assert.notEqual(left.src, right.src);
  assert.equal(left.src, "/game/sprites/v31/film-plates/city-hunter-left.png");
  assert.equal(left.nativeFacing, "left"); assert.equal(right.nativeFacing, "right");
  const metadata = await sharp(fileURLToPath(new URL("../public" + left.src, import.meta.url))).metadata();
  assert.equal(metadata.width, left.width); assert.equal(metadata.height, left.height);
  assert.equal(metadata.format, "png"); assert.equal(metadata.hasAlpha, true);
  for (const id of ["jungle-hunter", "berserker", "wolf"]) {
    assert.strictEqual(registry.getPitFighterKeyArt(id, "left"), registry.getPitFighterKeyArt(id, "right"));
  }
});
