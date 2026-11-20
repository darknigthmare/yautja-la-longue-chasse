import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Real module graph (residence rules, guests, scenes, save, panels); nothing is mocked.
const source = homeworldSceneSsrV78();
const S = source.load("app/game/systems/residenceScenesV154.ts");
const D = source.load("app/game/systems/houseDialogueV154.ts");
const R = source.load("app/game/systems/residenceV149.ts");
const L = source.load("app/game/systems/residenceLifeV150.ts");
const { defaultSave, normalizeSave, parseSaveImport, exportSave } = source.load("app/game/save.ts");
const owner = "2026-11-19T09:00:00.000Z";

const base = (atHouseId, extra = {}) => ({ rankId: "young-blood", atHouseId, regionAllowed: () => true, runId: null, guestsPresent: [], invitationPending: false, ...extra });
const ok = r => { assert.equal(r.ok, true, r.ok ? "" : r.reason); return r.state; };
const field = (state, runId, actions) => actions.reduce((s, action) =>
  R.recordResidenceFieldEventV149(s, { regionId: "luminous-marshes", runId, action }).state, state);
function livingAtCm07(extraRuns = 0) {
  const c = base("HOME-CM07");
  let s = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM07", c));
  s = field(s, "r1", ["ward", "recover", "report"]);
  s = ok(R.chooseHouseRouteV149(s, "HOME-CM07", 0, c));
  s = field(s, "r2", ["track", "ward", "recover"]);
  for (let i = 0; i < extraRuns; i++) s = field(s, `extra-${i}`, ["track", "ward", "recover", "report"]);
  return ok(R.activateFirstResidenceV149(s, "HOME-CM07", c));
}
const playAll = (scenes, residence, id, context) => {
  const count = S.sceneGesturesV154(S.sceneV154(id)).length;
  for (let i = 0; i < count; i++) scenes = ok(S.sceneGestureV154(scenes, residence, id, i, context));
  return scenes;
};

test("all 60 rows are playable readings: gestures, two options, a trigger, and a corpus scene", () => {
  assert.equal(R.RESIDENCE_SCENES_V149.length, 60);
  const index = JSON.parse(readFileSync(new URL("../app/game/data/dialoguesV6-index.json", import.meta.url), "utf8"));
  for (const scene of R.RESIDENCE_SCENES_V149) {
    assert.ok(S.sceneGesturesV154(scene).length >= 3, scene.id);
    const [a, b] = S.sceneOptionsV154(scene);
    assert.ok(a && b, scene.id);
    // Options are the row's own words (only the first letter and final dot change).
    assert.ok(scene.choices.toLowerCase().includes(a.slice(1).toLowerCase()) && scene.choices.includes(b.slice(1)), scene.id);
    assert.ok(S.TRIGGERS_V154[scene.id], scene.id);
    assert.ok(index.scenes.some(entry => entry.id === D.houseDialogueIdV154(scene.id)), scene.id);
  }
  assert.equal(Object.keys(S.TRIGGERS_V154).length, 60);
  assert.deepEqual(S.sceneGesturesV154(S.sceneV154("V5-HOME-CM07-S1"))[0], S.sceneV154("V5-HOME-CM07-S1").sequence.split(" ; ")[0].replace(/^./, c => c.toUpperCase()));
});

test("triggers: only in the active residence, where the hunter stands, and when the trigger holds", () => {
  const residence = livingAtCm07();
  const here = base("HOME-CM07");
  assert.deepEqual(S.playableScenesV154(residence, "HOME-CM07", here).map(s => s.id), ["V5-HOME-CM07-S1"], "respect 40: S2 needs 60, S3 needs 80");
  assert.equal(S.sceneGestureV154(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM07-S1", 0, base(null)).ok, false);
  assert.equal(S.sceneGestureV154(S.emptyResidenceScenesV154(), R.emptyResidenceV149(), "V5-HOME-CM07-S1", 0, here).ok, false);
  const refused = S.sceneGestureV154(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM07-S2", 0, here);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /Respect 60 atteint/);
  const richer = livingAtCm07(3);
  assert.deepEqual(S.playableScenesV154(richer, "HOME-CM07", here).map(s => s.id), ["V5-HOME-CM07-S1", "V5-HOME-CM07-S2", "V5-HOME-CM07-S3"]);
  // CM08-S2 « Invitation en cours » reads the V150 invitations.
  const scene = S.sceneV154("V5-HOME-CM08-S2");
  assert.equal(S.sceneTriggerV154(scene, residence, base("HOME-CM08")).reached, false);
  assert.equal(S.sceneTriggerV154(scene, residence, base("HOME-CM08", { rankId: "elite", invitationPending: true })).reached, true);
  // A « retour » reads a field action of the current run (proposé).
  const cm01s1 = S.sceneV154("V5-HOME-CM01-S1");
  assert.equal(S.sceneTriggerV154(cm01s1, residence, base("HOME-CM01", { runId: "zz" })).reached, false);
  assert.equal(S.sceneTriggerV154(cm01s1, residence, base("HOME-CM01", { runId: "r2" })).reached, true);
  assert.equal(S.sceneTriggerV154(S.sceneV154("V5-HOME-CM13-S2"), residence, base("HOME-CM13", { guestsPresent: ["guide"] })).reached, false, "no guest from another region exists");
});

test("gestures in order; leaving keeps them and the decision stays open (« Coût et reprise »)", () => {
  const residence = livingAtCm07();
  const here = base("HOME-CM07");
  let scenes = ok(S.sceneGestureV154(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM07-S1", 0, here));
  assert.equal(S.sceneGestureV154(scenes, residence, "V5-HOME-CM07-S1", 2, here).ok, false, "out of order");
  assert.equal(S.sceneGestureV154(scenes, residence, "V5-HOME-CM07-S1", 0, here).ok, false, "already done");
  assert.equal(S.sceneChooseV154(scenes, residence, "V5-HOME-CM07-S1", 0, here).ok, false, "choice waits for the gestures");
  // Leave and reload: the gesture is kept, nothing decided.
  scenes = S.normalizeResidenceScenesV154(JSON.parse(JSON.stringify(scenes)));
  assert.deepEqual(scenes.scenes["V5-HOME-CM07-S1"], { gestures: 1, choice: null, consumed: [], runId: null });
  scenes = ok(S.sceneGestureV154(scenes, residence, "V5-HOME-CM07-S1", 1, here));
  assert.equal(scenes.scenes["V5-HOME-CM07-S1"].gestures, 2);
});

test("a started scene resumes even when its trigger is gone (proposé); a new one needs it", () => {
  const c = base("HOME-CM08", { rankId: "elite" });
  let residence = ok(R.acceptHouseMissionV149(R.emptyResidenceV149(), "HOME-CM08", c));
  residence = field(residence, "r1", ["ward", "recover", "report"]);
  residence = ok(R.chooseHouseRouteV149(residence, "HOME-CM08", 0, c));
  residence = field(residence, "r2", ["track", "ward", "recover", "survey"]);
  residence = ok(R.activateFirstResidenceV149(residence, "HOME-CM08", c));
  assert.equal(S.sceneGestureV154(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM08-S2", 0, c).ok, false, "« Invitation en cours » not reached");
  let scenes = ok(S.sceneGestureV154(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM08-S2", 0, base("HOME-CM08", { rankId: "elite", invitationPending: true })));
  scenes = ok(S.sceneGestureV154(scenes, residence, "V5-HOME-CM08-S2", 1, c));
  assert.equal(scenes.scenes["V5-HOME-CM08-S2"].gestures, 2);
});

test("one decision, recorded once, with the material use of the row", () => {
  const residence = livingAtCm07();
  const here = base("HOME-CM07", { runId: "r9" });
  let scenes = playAll(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM07-S1", here);
  const chosen = S.sceneChooseV154(scenes, residence, "V5-HOME-CM07-S1", 0, here);
  scenes = ok(chosen);
  assert.match(chosen.message, /consomme une entretoise/);
  assert.deepEqual(scenes.scenes["V5-HOME-CM07-S1"], { gestures: S.sceneGesturesV154(S.sceneV154("V5-HOME-CM07-S1")).length, choice: 0, consumed: [{ item: "entretoise", quantity: 1 }], runId: "r9" });
  assert.equal(S.sceneChooseV154(scenes, residence, "V5-HOME-CM07-S1", 1, here).ok, false, "no second decision");
  assert.equal(S.sceneGestureV154(scenes, residence, "V5-HOME-CM07-S1", 0, here).ok, false);
  // The other option of the same row consumes nothing.
  assert.deepEqual(S.sceneConsumptionV154("V5-HOME-CM07-S1", 1), []);
  assert.deepEqual(S.sceneConsumptionV154("V5-HOME-CM02-S2", 0).map(c => [c.item, c.quantity]), [["cale", 2]]);
  assert.deepEqual(S.MATERIALS_IN_GAME_V154, [], "none of these materials exists in the game");
  // Forged records: a decision without its gestures, or an invented consumption, are not kept.
  const forged = S.normalizeResidenceScenesV154({ version: 1, scenes: {
    "V5-HOME-CM07-S1": { gestures: 2, choice: 1 },
    "V5-HOME-CM02-S2": { gestures: 99, choice: 1, consumed: [{ item: "cale", quantity: 50 }] },
    "V5-HOME-CM99-S1": { gestures: 1 } } });
  assert.equal(forged.scenes["V5-HOME-CM07-S1"].choice, null);
  assert.deepEqual(forged.scenes["V5-HOME-CM02-S2"].consumed, []);
  assert.equal(forged.scenes["V5-HOME-CM02-S2"].gestures, S.sceneGesturesV154(S.sceneV154("V5-HOME-CM02-S2")).length);
  assert.equal(Object.hasOwn(forged.scenes, "V5-HOME-CM99-S1"), false);
});

test("save: field written only when used, kept through export/import, future version refused", () => {
  const save = defaultSave(owner);
  assert.equal(Object.hasOwn(normalizeSave(save), "residenceScenesV154"), false);
  const residence = livingAtCm07();
  const scenes = ok(S.sceneGestureV154(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM07-S1", 0, base("HOME-CM07")));
  const parsed = parseSaveImport(exportSave({ ...save, residenceV149: residence, residenceScenesV154: scenes }));
  assert.ok(parsed.save, parsed.failure);
  assert.deepEqual(parsed.save.residenceScenesV154, scenes);
  const future = parseSaveImport(JSON.stringify({ ...save, residenceScenesV154: { version: 2, scenes: {} } }));
  assert.equal(future.save, null);
  assert.equal(future.failure, "future-version");
});

test("guests: present at the house tick (V150) and corpus lines by moment, verbatim", () => {
  const residence = livingAtCm07();
  let life = ok(L.inviteGuestV150(L.emptyResidenceLifeV150(), residence, "artisan", base("HOME-CM07")));
  assert.deepEqual(S.guestsAtHouseV154(life, "HOME-CM07", null), { present: [], pending: true });
  life = L.settleResidenceLifeV150(life, residence, { regionId: "luminous-marshes", runId: "v", tick: 0, zone: "village", buildingId: null }).state;
  const walk = Math.ceil(L.routeLengthV150(L.guestRouteV150("HOME-CM07", "artisan")) / L.GUEST_SPEED_V150 * 60);
  assert.deepEqual(S.guestsAtHouseV154(life, "HOME-CM07", { runId: "v", tick: walk + 60 }).present, ["artisan"]);
  assert.deepEqual(S.guestsAtHouseV154(life, "HOME-CM07", { runId: "other", tick: walk + 60 }).present, []);
  const chunk = JSON.parse(readFileSync(new URL("../app/game/data/dialoguesV6-401-500.json", import.meta.url), "utf8"));
  const dialogue = D.houseDialogueFromChunkV154(chunk, "V5-HOME-CM07-S1");
  assert.equal(dialogue.id, "D6-H-V5-HOME-CM07-S1");
  const opening = D.dialogueLinesForV154(dialogue, { kind: "opening" });
  assert.ok(opening.length > 0 && opening.every(l => l.phase === "OUV"));
  const corpusLine = chunk.lines.find(l => l.id === opening[0].id);
  assert.equal(opening[0].text, corpusLine.text);
  assert.ok(D.dialogueLinesForV154(dialogue, { kind: "response", choice: 1 }).every(l => l.choice === "B"));
  assert.equal(D.houseDialogueFromChunkV154(chunk, "V5-HOME-CM99-S1"), null);
});

test("SSR: panel shows the scene with its source trigger; conversation shows corpus lines or presence only", async () => {
  const residence = livingAtCm07();
  const props = { house: R.houseV149("HOME-CM07"), residence, life: undefined, scenes: undefined, region: { runId: "r2", tick: 0 }, rankId: "young-blood",
    disabled: false, regionAllowed: () => true, onAction: () => ({ ok: true, message: "" }), loadDialogue: async () => null };
  const html = source.render("app/game/HouseScenesPanelV154.tsx", props);
  assert.match(html, /data-house-scene="V5-HOME-CM07-S1" data-house-scene-state="ready"/);
  assert.match(html, /data-house-scene="V5-HOME-CM07-S2" data-house-scene-state="waiting"/);
  assert.match(html, /HOME-CM07 active ; mission de seuil réussie/);
  assert.match(html, /data-house-scene-open="V5-HOME-CM07-S1"/);
  const scenes = playAll(S.emptyResidenceScenesV154(), residence, "V5-HOME-CM07-S1", base("HOME-CM07"));
  const resolved = ok(S.sceneChooseV154(scenes, residence, "V5-HOME-CM07-S1", 0, base("HOME-CM07")));
  const after = source.render("app/game/HouseScenesPanelV154.tsx", { ...props, scenes: resolved });
  assert.match(after, /data-house-scene-result="0"/);
  assert.match(after, /data-house-scene-consumed/);
  assert.equal(source.render("app/game/HouseScenesPanelV154.tsx", { ...props, house: R.houseV149("HOME-CM08") }), "", "not the active residence");
  const chunk = JSON.parse(readFileSync(new URL("../app/game/data/dialoguesV6-401-500.json", import.meta.url), "utf8"));
  const dialogue = D.houseDialogueFromChunkV154(chunk, "V5-HOME-CM07-S1");
  const talk = source.render("app/game/HouseSceneConversationV154.tsx", { guests: ["Ka’resh 7"], dialogue, moment: { kind: "opening" } });
  assert.ok(talk.includes(D.dialogueLinesForV154(dialogue, { kind: "opening" })[0].text.replace(/’/g, "’")));
  const presence = source.render("app/game/HouseSceneConversationV154.tsx", { guests: ["Ka’resh 7"], dialogue: null, moment: { kind: "opening" } });
  assert.match(presence, /data-house-scene-conversation="presence"/);
  assert.doesNotMatch(presence, /data-dialogue-line/);
  // The real loader finds the corpus scene (dynamic import of the chunk).
  const loaded = await D.loadHouseDialogueV154("V5-HOME-CM07-S1");
  assert.equal(loaded?.id, "D6-H-V5-HOME-CM07-S1");
});
