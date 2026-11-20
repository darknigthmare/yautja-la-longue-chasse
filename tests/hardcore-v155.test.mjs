import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Real modules (save, Hardcore and heritage rules, campaign slots, panel); nothing is mocked.
const source = homeworldSceneSsrV78();
const { defaultSave, normalizeSave, parseSaveImport, exportSave, applyMissionResult } = source.load("app/game/save.ts");
const HC = source.load("app/game/systems/hardcoreV155.ts");
const H = source.load("app/game/systems/heritageV152.ts");
const PANEL = "app/game/HardcoreChroniclePanelV155.tsx";
const compiled = await build({ stdin: { contents: `
export * from "./app/game/systems/campaignSlots";
export {defaultSave, SAVE_STORAGE_KEY} from "./app/game/save";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const S = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { async request(_n, _o, callback) { return callback({ name: "lock" }); } } } });

const owner = "2026-11-19T09:00:00.000Z", died = "2026-11-19T10:00:00.000Z", closedAt = "2026-11-19T10:05:00.000Z";
function store(entries = []) {
  const values = new Map(entries);
  return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: k => { values.delete(k); } };
}
function hardcore(createdAt = owner) {
  const save = defaultSave(createdAt);
  save.profile = { ...save.profile, hunterName: "Tha’kai", honor: 320, rankId: "blooded" };
  save.appearance = { ...save.appearance, biomaskId: "wolf" };
  return { ...save, hardcoreV155: HC.createHardcoreStateV155(createdAt) };
}
function dead(save = hardcore()) {
  const r = HC.recordHardcoreDeathV155(save, "jungle-vey", died);
  assert.equal(r.ok, true, r.reason);
  return { ...save, hardcoreV155: r.hardcore };
}
function closed(save = dead(), weaponId = "combistick") {
  const r = HC.closeHardcoreChronicleV155(save, { weaponId, maskId: null }, closedAt);
  assert.equal(r.ok, true, r.reason);
  return { ...save, hardcoreV155: r.hardcore, heritageV152: r.heritage ?? save.heritageV152 };
}

test("création : l’option Hardcore est écrite seulement si elle est choisie, puis reste fixée", async () => {
  const s = store();
  const hc = await S.createCampaignSlot(1, "Tha’kai", s, { hardcore: true });
  assert.equal(hc.ok, true, hc.message);
  const normal = await S.createCampaignSlot(2, "Normal", s);
  assert.equal(normal.ok, true, normal.message);
  const campaign = id => JSON.parse(s.getItem(S.campaignSlotStorageKey(id))).checkpoints[0].archive.campaign;
  const first = campaign(1);
  assert.deepEqual(first.hardcoreV155, { version: 1, ownerCreatedAt: first.createdAt, chosenAt: first.createdAt, death: null });
  assert.equal(Object.hasOwn(campaign(2), "hardcoreV155"), false, "partie normale : forme inchangée");
  const catalog = S.loadCampaignSlots(s);
  assert.equal(catalog.slots[0].hardcoreV155, "alive");
  assert.equal(Object.hasOwn(catalog.slots[1], "hardcoreV155"), false);
  // Un état Hardcore créé pour une autre partie ou à une autre date n’est pas accepté.
  assert.equal(HC.normalizeHardcoreV155({ ...first.hardcoreV155, chosenAt: died }, first.createdAt), null);
  assert.equal(HC.normalizeHardcoreV155(first.hardcoreV155, owner), null);
});

test("mort Hardcore : constatée sans clôture, puis clôture confirmée avec legs de mort ; rien n’est effacé", () => {
  const alive = hardcore();
  alive.trophies = [];
  assert.equal(HC.hardcoreStatusV155(alive), "alive");
  const pending = dead(alive);
  assert.equal(HC.hardcoreStatusV155(pending), "death-pending");
  assert.equal(HC.recordHardcoreDeathV155(pending, "jungle-vey", closedAt).hardcore.death.diedAt, died, "idempotent");
  assert.equal(HC.closeHardcoreChronicleV155(pending, { weaponId: "smart-disc", maskId: null }, closedAt).ok, false, "arme non possédée");
  const end = closed(pending);
  assert.equal(HC.hardcoreStatusV155(end), "closed");
  const t = end.heritageV152.testament;
  assert.equal(t.trigger, "hardcore-death");
  assert.equal(t.maskId, "wolf");
  assert.equal(t.weaponId, "combistick");
  assert.deepEqual([t.legend.hunterName, t.legend.honor, t.legend.rankId], ["Tha’kai", 320, "blooded"]);
  // Données conservées : profil, inventaire, progression identiques.
  for (const key of ["profile", "inventory", "missionProgress", "trophies", "statistics", "appearance"]) assert.deepEqual(end[key], pending[key], key);
  assert.equal(HC.closeHardcoreChronicleV155(end, { weaponId: "combistick", maskId: null }, closedAt).ok, false, "déjà close");
  // Sans masque porté, le joueur désigne le masque (proposé).
  const bare = dead({ ...hardcore(), appearance: { ...hardcore().appearance, biomaskId: null } });
  assert.equal(HC.closeHardcoreChronicleV155(bare, { weaponId: "combistick", maskId: null }, closedAt).ok, false);
  const chosen = HC.closeHardcoreChronicleV155(bare, { weaponId: "combistick", maskId: "jungle" }, closedAt);
  assert.equal(chosen.ok, true, chosen.reason);
  assert.equal(chosen.heritage.testament.maskId, "jungle");
  // Le panneau du Mausolée ne scelle jamais une mort Hardcore.
  assert.equal(H.sealHeritageTestamentV152(pending, { trigger: "hardcore-death", weaponId: "combistick" }, closedAt).ok, false);
});

test("un legs déjà scellé par la retraite à Elder (proposée) reste le seul legs", () => {
  const elder = { ...hardcore(), profile: { ...hardcore().profile, honor: 1900, rankId: "elder" } };
  const sealed = H.sealHeritageTestamentV152(elder, { trigger: "elder-retirement", weaponId: "combistick" }, died);
  assert.equal(sealed.ok, true, sealed.reason);
  const end = HC.closeHardcoreChronicleV155(dead({ ...elder, heritageV152: sealed.state }), { weaponId: null, maskId: null }, closedAt);
  assert.equal(end.ok, true, end.reason);
  assert.equal(end.heritage, null);
  assert.equal(end.hardcore.death.closedAt, closedAt);
});

test("partie non Hardcore : la mort en chasse reste un échec ordinaire", () => {
  const plain = defaultSave(owner);
  assert.equal(HC.recordHardcoreDeathV155(plain, "jungle-vey", died).ok, false);
  assert.equal(HC.hardcoreStatusV155(plain), "none");
  const after = applyMissionResult(plain, { missionId: "jungle-vey", difficultyId: "hunter", outcome: "failed", score: 0, elapsedSeconds: 30,
    completedObjectiveIds: [], honorEvents: [], trophyQuality: null, trophyClaims: [], kills: 0, scans: 0, secondWindUsed: false, completedAt: died });
  assert.equal(Object.hasOwn(after, "hardcoreV155"), false);
  assert.equal(after.statistics.missionsFailed, plain.statistics.missionsFailed + 1);
  // Hardcore : le rapport de mort inscrit la mort (clôture non incluse) ; un abandon de chasse vivante, non.
  const report = { missionId: "jungle-vey", difficultyId: "hunter", score: 0, elapsedSeconds: 30, completedObjectiveIds: [], honorEvents: [],
    trophyQuality: null, trophyClaims: [], kills: 0, scans: 0, secondWindUsed: false, completedAt: died };
  const reported = applyMissionResult(hardcore(), { ...report, outcome: "failed" });
  assert.deepEqual(reported.hardcoreV155.death, { missionId: "jungle-vey", diedAt: died, closedAt: null });
  assert.equal(HC.hardcoreStatusV155(applyMissionResult(hardcore(), { ...report, outcome: "abandoned" })), "alive");
  // Une mort déjà inscrite n’est pas réécrite.
  const hcAfter = applyMissionResult(dead(), { missionId: "jungle-vey", difficultyId: "hunter", outcome: "failed", score: 0, elapsedSeconds: 30,
    completedObjectiveIds: [], honorEvents: [], trophyQuality: null, trophyClaims: [], kills: 0, scans: 0, secondWindUsed: false, completedAt: died });
  assert.equal(HC.hardcoreStatusV155(hcAfter), "death-pending");
});

test("après la mort, une sauvegarde antérieure reste conservée mais ne se charge plus", async () => {
  const s = store([[S.SAVE_STORAGE_KEY, JSON.stringify(hardcore())]]);
  const migrated = await S.migrateLegacyCampaignSlot(s);
  assert.equal(migrated.ok, true, migrated.message);
  s.setItem(S.SAVE_STORAGE_KEY, JSON.stringify(dead()));
  const catalog = S.loadCampaignSlots(s);
  assert.equal(catalog.slots[0].hardcoreV155, "death-pending");
  const before = s.getItem(S.campaignSlotStorageKey(1));
  const refused = await S.activateCampaignCheckpoint(1, "auto-1", { expectedRevision: catalog.slots[0].revision }, s);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /mort est définitive/);
  assert.equal(s.getItem(S.campaignSlotStorageKey(1)), before, "aucune sauvegarde effacée ni remplacée");
  assert.equal(HC.hardcoreStatusV155(JSON.parse(s.getItem(S.SAVE_STORAGE_KEY))), "death-pending");
});

test("héritage : une nouvelle partie « Descendant de … » reçoit le legs de mort une seule fois", async () => {
  const ancestor = closed();
  const s = store([[S.SAVE_STORAGE_KEY, JSON.stringify(ancestor)]]);
  const migrated = await S.migrateLegacyCampaignSlot(s);
  assert.equal(migrated.ok, true, migrated.message);
  const offers = S.loadCampaignSlots(s).heritageOffers;
  assert.equal(offers.length, 1);
  assert.equal(offers[0].hunterName, "Tha’kai");
  const ancestorRaw = s.getItem(S.SAVE_STORAGE_KEY), ancestorSlot = s.getItem(S.campaignSlotStorageKey(1));
  const heir = await S.createHeirCampaignSlot(2, "Descendant", migrated.slotId, s, { hardcore: true });
  assert.equal(heir.ok, true, heir.message);
  const campaign = JSON.parse(s.getItem(S.campaignSlotStorageKey(2))).checkpoints[0].archive.campaign;
  assert.equal(campaign.profile.honor, 100);
  assert.equal(campaign.profile.rankId, "young-blood");
  assert.equal(campaign.heritageV152.inheritance.testament.trigger, "hardcore-death");
  assert.equal(campaign.heritageV152.inheritance.testament.maskId, "wolf");
  assert.equal(campaign.heritageV152.inheritance.weapon.locationId, "archives-des-lignees");
  assert.equal(HC.hardcoreStatusV155(campaign), "alive", "l’héritier peut lui-même être Hardcore");
  // La chronique de l’ancêtre n’est pas modifiée.
  assert.equal(s.getItem(S.SAVE_STORAGE_KEY), ancestorRaw);
  assert.equal(s.getItem(S.campaignSlotStorageKey(1)), ancestorSlot);
  const before = s.getItem(S.campaignSlotStorageKey(3));
  const twice = await S.createHeirCampaignSlot(3, "Second", migrated.slotId, s);
  assert.equal(twice.ok, false);
  assert.match(twice.message, /déjà été reçu/);
  assert.equal(s.getItem(S.campaignSlotStorageKey(3)), before);
});

test("sauvegarde : aller-retour exact, version future refusée, ancienne sauvegarde intacte, état recopié refusé", () => {
  const plain = defaultSave(owner);
  assert.equal(Object.hasOwn(normalizeSave(plain), "hardcoreV155"), false);
  const legacy = JSON.parse(JSON.stringify(plain));
  delete legacy.heritageV152; delete legacy.hardcoreV155;
  const legacyParsed = parseSaveImport(JSON.stringify(legacy));
  assert.ok(legacyParsed.save, legacyParsed.failure);
  assert.equal(Object.hasOwn(legacyParsed.save, "hardcoreV155"), false);
  for (const save of [hardcore(), dead(), closed()]) {
    const parsed = parseSaveImport(exportSave(save));
    assert.ok(parsed.save, parsed.failure);
    assert.deepEqual(parsed.save.hardcoreV155, save.hardcoreV155);
    assert.deepEqual(parsed.save.heritageV152 ?? null, save.heritageV152 ?? null);
  }
  assert.equal(parseSaveImport(JSON.stringify({ ...plain, hardcoreV155: { version: 2 } })).failure, "future-version");
  assert.equal(parseSaveImport(JSON.stringify({ ...defaultSave("2026-11-21T00:00:00.000Z"), hardcoreV155: closed().hardcoreV155 })).failure, "invalid-save");
  assert.equal(HC.recordHardcoreDeathV155({ ...hardcore(), hardcoreV155: { version: 3 } }, "jungle-vey", died).ok, false);
});

test("panneau SSR : mort à confirmer puis chronique close en lecture seule", () => {
  const onClose = () => ({ ok: true, message: "" }), onMainMenu = () => {};
  const pending = source.render(PANEL, { save: dead(), busy: false, onClose, onMainMenu });
  assert.match(pending, /data-hardcore-chronicle="death-pending"/);
  assert.match(pending, /data-hardcore-prepare/);
  assert.doesNotMatch(pending, /data-hardcore-close/, "la clôture demande une seconde confirmation");
  const done = source.render(PANEL, { save: closed(), busy: false, onClose, onMainMenu });
  assert.match(done, /data-hardcore-chronicle="closed"/);
  assert.match(done, /data-hardcore-testament="hardcore-death"/);
  assert.doesNotMatch(done, /data-hardcore-prepare|<select/);
});
