import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import sharp from "sharp";
import path from "node:path";
const bundle = await build({ stdin: { contents: 'export * from "./app/game/youthTrainingRendering"; export * from "./app/game/youthTrainingHelp"; export * from "./app/game/youthArtManifest"; export * from "./app/game/nurseryRendering"; export * from "./app/game/nurseryArtManifest"; export * from "./app/game/spriteContact"; export * from "./app/game/systems/youthTraining";', resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const manifest = api.YOUTH_ART_MANIFEST, images = new Map();
for (const src of api.youthArtSources(manifest)) { const m = await sharp(path.join("public", src)).metadata(); images.set(src, { width: m.width, height: m.height, src }); }
const context = () => { const ellipses = [], draws = []; return { globalAlpha: 1, ellipses, draws, save() {}, restore() {}, translate() {}, rotate() {}, clearRect() {}, fillRect() {}, beginPath() {}, ellipse(...args) { ellipses.push(args); }, drawImage(...args) { draws.push(args); }, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, setLineDash() {}, arc() {}, fillText() {}, scale() { assert.fail("native sprites cannot be mirrored"); } }; };

test("support follows actual platform collision width and ignores solids above the feet", () => {
  const state = { phase: "dojo-jump" };
  assert.equal(api.youthActorSupport(state, { x: 480, y: 380 }).y, 380);
  assert.equal(api.youthActorSupport(state, { x: 480, y: 310 }).y, 380);
  assert.equal(api.youthActorSupport(state, { x: 480, y: 400 }).y, 430);
  assert.equal(api.youthActorSupport(state, { x: 421, y: 310 }).y, 430);
  assert.equal(api.youthActorSupport(state, { x: 423, y: 310 }).y, 380);
  assert.equal(api.youthActorSupport({ phase: "patrol-route" }, { x: 680, y: 330 }).y, 350);
});

test("a landed actor uses idle or walk on a platform; jumps keep the authored airborne pose", () => {
  const state = api.createYouthTraining(); state.phase = "dojo-jump";
  Object.assign(state.player, { x: 480, y: 380, vy: 0, vx: 0 });
  assert.equal(api.youthActorPose(state), "idle"); state.player.vx = 2; assert.equal(api.youthActorPose(state), "walk");
  state.player.y = 350; state.player.vy = -3; assert.equal(api.youthActorPose(state), "jump");
  state.player.action = "hurt"; assert.equal(api.youthActorPose(state), "hurt");
});

test("drawn contact remains on the platform during ascent and never alters physics or inventory", () => {
  const state = api.createYouthTraining(); state.phase = "dojo-jump";
  Object.assign(state.player, { x: 480, y: 380, vy: 0, vx: 0 });
  const before = JSON.stringify(state), landed = context(); api.drawYouthScene(landed, state, { manifest, images }, false);
  assert.equal(JSON.stringify(state), before);
  assert.ok(landed.ellipses.some(e => e[1] === 381)); assert.ok(!landed.ellipses.some(e => e[1] === 431));
  const idle = landed.draws.find(d => d[0].src.includes("unblooded-right")); assert.ok(idle);
  assert.deepEqual(idle.slice(1, 5), api.youthClipFrame(manifest.actors.player.right.clips.idle, state.tick).rect);
  Object.assign(state.player, { y: 330, vy: -4 }); const air = context(); api.drawYouthScene(air, state, { manifest, images }, false);
  assert.ok(air.ellipses.some(e => e[1] === 381)); assert.ok(air.ellipses[0][2] < landed.ellipses[0][2]);
});

test("real source alpha provides native foot contacts with a bounded registration correction", async () => {
  let checked = 0;
  const atlases = [...Object.values(manifest.actors).flatMap(a => Object.values(a)), ...Object.values(api.NURSERY_ART_MANIFEST.actors).flatMap(a => Object.values(a))];
  for (const atlas of atlases) for (const pose of ["idle", "walk", "hurt", "thrown", "ko"]) for (const frame of atlas.clips[pose].frames) {
    const [left, top, width, height] = frame.rect;
    const { data } = await sharp(path.join("public", atlas.src)).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const contact = api.measureSpriteContact(data, width, height, frame.pivot[1]);
    assert.ok(contact, `${atlas.src}/${pose}`); assert.ok(contact.right > contact.left);
    assert.ok(contact.offsetY >= 0 && contact.offsetY <= height * .02);
    checked++;
  }
  assert.ok(checked >= 80);
});

test("contextual help never advertises a forbidden blade or noncombat attacks as available", () => {
  const base = api.createYouthTraining(), earned = { ...base, milestones: { "youth-first-blade": 100 } };
  assert.ok(api.youthActionUnavailableReason(base, "blade")); assert.ok(!api.youthGamepadHelp(base).includes("Y lame"));
  assert.equal(api.youthActionUnavailableReason({ ...earned, phase: "camp-duel" }, "blade"), null);
  assert.ok(api.youthGamepadHelp({ ...earned, phase: "camp-duel" }).includes("Y lame"));
  const cage = { ...earned, phase: "cage-duel" };
  assert.match(api.youthActionUnavailableReason(cage, "blade"), /Interdite/); assert.ok(!api.youthGamepadHelp(cage).includes("Y lame"));
  for (const phase of ["patrol-route", "patrol-ambush", "desert-tracks"]) {
    const state = { ...earned, phase };
    for (const action of ["light", "blade", "throw"]) assert.ok(api.youthActionUnavailableReason(state, action));
    assert.ok(!api.youthGamepadHelp(state).includes("X poing"));
  }
  assert.equal(api.youthActionUnavailableReason({ ...earned, phase: "patrol-ambush" }, "dodge"), null);
  assert.ok(api.youthActionUnavailableReason({ ...earned, phase: "patrol-route" }, "dodge"));
  assert.ok(api.youthActionUnavailableReason({ ...earned, phase: "desert-tracks" }, "dodge"));
});
