import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const bundle = await build({ stdin: { contents: `export * from "./app/game/youthTrainingRendering"; export * from "./app/game/systems/youthControls"; export * from "./app/game/systems/controlBindings"; export * from "./app/game/systems/youthTraining";`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
function fixture() {
  const images = new Map(); const src = name => { const value = `/game/youth/v48/${name}.png`; images.set(value, { width: 256, height: 480, id: name }); return value; };
  const actor = id => Object.fromEntries(["left", "right"].map(direction => [direction, { src: src(`${id}-${direction}`), bodyHeight: 80,
    clips: Object.fromEntries(api.YOUTH_ART_POSES.map((pose, index) => [pose, { loop: ["idle", "walk"].includes(pose), frames: [0, 1].map(frame => ({ rect: [((index * 2 + frame) % 4) * 64, Math.floor((index * 2 + frame) / 4) * 96, 64, 96], pivot: [32, 90], handAnchor: [48, 45], durationTicks: 10 })) }])) }]));
  const propSrc = src("props");
  const props = Object.fromEntries(["trainingTarget", "platform", "marker", "bladeRack", "maskPedestal", "cot", "door", "brazier"].map((name, index) => [name, { src: propSrc, rect: [(index % 4) * 64, Math.floor(index / 4) * 96, 64, 96], pivot: [32, 90] }]));
  return { images, manifest: { version: 1, actorKind: "unblooded", scenes: { dojo: { src: src("dojo") }, camp: { src: src("camp") }, quarters: { src: src("quarters") } }, blade: { src: src("blade") }, props, actors: { player: actor("player"), rival: actor("rival") } } };
}
function context() { const draws = []; return { draws, save() {}, restore() {}, translate() {}, rotate() {}, clearRect() {}, fillRect() {}, drawImage(...args) { draws.push(args); }, stroke() {}, beginPath() {}, moveTo() {}, lineTo() {}, setLineDash() {}, arc() {}, fill() {} }; }
test("all unblooded, mentor, backdrop and modular bitmap resources are required", () => {
 const bank = fixture(); assert.equal(api.youthArtSources(bank.manifest).length, 9); assert.deepEqual(api.validateYouthArt(bank.manifest, bank.images), []);
 bank.images.delete(bank.manifest.actors.rival.left.src); assert.match(api.validateYouthArt(bank.manifest, bank.images).join(" "), /non décodée/);
});
test("child identity, mirrored direction, out-of-bounds props and repeated poses fail readiness", () => {
 for (const mutate of [bank => { bank.manifest.actorKind = "youngling"; }, bank => { bank.manifest.actors.player.left.src = bank.manifest.actors.player.right.src; }, bank => { bank.manifest.props.cot.rect[0] = 999; }, bank => { bank.manifest.actors.rival.right.clips.ko.frames[1].rect = bank.manifest.actors.rival.right.clips.ko.frames[0].rect; }]) { const bank = fixture(); mutate(bank); assert(api.validateYouthArt(bank.manifest, bank.images).length > 0); }
});
test("attack drawings hold after their authored impact; only idle and walk loop", () => {
 const bank = fixture(), clip = bank.manifest.actors.player.right.clips.blade;
 assert.equal(api.youthClipFrame(clip, 999), clip.frames[1]); const walk = bank.manifest.actors.player.right.clips.walk;
 assert.equal(api.youthClipFrame(walk, 20), walk.frames[0]); clip.loop = true; assert.match(api.validateYouthArt(bank.manifest, bank.images).join(" "), /non bouclable/);
});
test("native orientations and separate mentor are drawn without mirroring the hunter", () => {
 const bank = fixture(), state = api.createYouthTraining(); state.phase = "camp-duel";
 const ctx = context(); api.drawYouthScene(ctx, state, bank, false);
 assert(ctx.draws.some(draw => draw[0].id === "rival-left")); assert(ctx.draws.some(draw => draw[0].id === "player-right"));
 state.player.facing = -1; state.rival.facing = 1; const crossed = context(); api.drawYouthScene(crossed, state, bank, true);
 assert(crossed.draws.some(draw => draw[0].id === "rival-right")); assert(crossed.draws.some(draw => draw[0].id === "player-left"));
});
test("unarmed mannequin practice and camp mentor never render the same substitute", () => {
 const bank = fixture(), state = api.createYouthTraining(); state.phase = "dojo-throw"; const ctx = context(); api.drawYouthScene(ctx, state, bank, false);
 assert(!ctx.draws.some(draw => draw[0].id.startsWith("rival"))); assert(ctx.draws.some(draw => draw[0].id === "props"));
 state.phase = "dojo-dodge"; const dodge = context(); api.drawYouthScene(dodge, state, bank, false); assert(dodge.draws.some(draw => draw[0].id === "rival-left"));
});
test("ascent and descent use distinct jump drawings even when idle actionTick remains zero", () => {
 const bank = fixture(), state = api.createYouthTraining(); state.player.y = 380; state.player.vy = -3;
 const up = context(); api.drawYouthScene(up, state, bank, false); state.player.vy = 3; const down = context(); api.drawYouthScene(down, state, bank, false);
 const first = up.draws.find(draw => draw[0].id === "player-right"), second = down.draws.find(draw => draw[0].id === "player-right"); assert.notDeepEqual(first.slice(1, 5), second.slice(1, 5));
});
test("loading has no actor fallback and platform art matches actual solid width and height", () => {
 const state = api.createYouthTraining(), empty = context(); api.drawYouthScene(empty, state, null, false); assert.equal(empty.draws.length, 0);
 const bank = fixture(); state.phase = "dojo-jump"; const ctx = context(); api.drawYouthScene(ctx, state, bank, false);
 assert(ctx.draws.some(draw => draw[0].id === "props" && draw[7] === 90 && draw[8] === 50));
});
test("remapped jump and attacks do not silently retain default keyboard bindings", () => {
 const bindings = { ...api.DEFAULT_CONTROL_BINDINGS, "pit.p1AttackLight": ["KeyX"], "pit.p1Jump": ["KeyZ"] };
 const sample = keys => api.sampleYouthControls(new Set(keys), new Set(), bindings, null);
 assert.equal(sample(["KeyJ"]).actions.light, false); assert.equal(sample(["KeyX"]).actions.light, true);
 assert.equal(sample(["KeyZ"]).actions.jump, true); assert.equal(sample(["ArrowLeft", "ArrowRight"]).neutral, false);
 assert.equal(sample([]).neutral, true);
});
test("standard pad maps dodge and throw separately and supports retry plus armory choices", () => {
 const buttons = Array.from({ length: 17 }, () => ({ pressed: false })); const pad = { connected: true, mapping: "standard", axes: [0], buttons };
 const sample = () => api.sampleYouthControls(new Set(), new Set(), api.DEFAULT_CONTROL_BINDINGS, pad);
 buttons[5].pressed = true; assert.equal(sample().actions.throw, true); assert.equal(sample().actions.dodge, false); buttons[5].pressed = false;
 buttons[0].pressed = true; assert.equal(sample().actions.jump, true); assert.equal(sample().actions.retry, true); buttons[0].pressed = false;
 buttons[12].pressed = true; assert.equal(sample().choiceStep, -1); assert.equal(sample().neutral, false);
 pad.connected = false; assert.equal(sample().neutral, true); pad.connected = true; pad.mapping = ""; assert.equal(sample().neutral, true);
});
test("touch and opposing keys keep the resumed input gate closed until every held control is released", () => {
 const sample = api.sampleYouthControls(new Set(["ArrowLeft", "ArrowRight"]), new Set(["dodge"]), api.DEFAULT_CONTROL_BINDINGS, null);
 assert.equal(sample.actions.move, 0); assert.equal(sample.actions.dodge, true); assert.equal(sample.neutral, false);
 const state = api.createYouthTraining(); const held = api.stepYouthTraining(state, sample.actions, { assetsReady: true, pageVisible: true, paused: true });
 assert.equal(held.state.tick, 0); assert.equal(held.state.inputArmed, false);
});

test("mentor demonstration plays one complete gesture then rests without looping impacts or granting progress", () => {
 for (const phase of ["dojo-move", "dojo-jump", "dojo-dodge", "dojo-strike", "dojo-throw"]) {
  assert.equal(api.getYouthDemonstration(phase, 0).pose, "idle"); assert.notEqual(api.getYouthDemonstration(phase, 25).pose, "idle");
  assert.equal(api.getYouthDemonstration(phase, 200).pose, "idle"); assert.equal(api.getYouthDemonstration(phase, 200).done, true);
 }
 const bank=fixture(), first=context(), last=context();api.drawYouthDemonstration(first,"dojo-strike",bank,25,true);api.drawYouthDemonstration(last,"dojo-strike",bank,80,true);assert.deepEqual(first.draws,last.draws);
});

test("calibrated backdrop ground row meets the actual actor ground without editing source pixels", () => {
 const bank=fixture(),state=api.createYouthTraining();const image=bank.images.get(bank.manifest.scenes.dojo.src);image.width=1672;image.height=941;bank.manifest.scenes.dojo.groundY=733;
 const ctx=context();api.drawYouthScene(ctx,state,bank,false);const draw=ctx.draws.find(item=>item[0].id==="dojo");
 assert.equal(draw[2],0);assert(Math.abs(733*draw[4]/941-430)<.001);
 bank.manifest.scenes.dojo.groundY=942;assert.match(api.validateYouthArt(bank.manifest,bank.images).join(" "),/Sol du décor/);
});
