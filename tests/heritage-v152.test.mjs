import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Real modules (save, heritage rules, campaign slots, panel); nothing is mocked.
const source = homeworldSceneSsrV78();
const { defaultSave, normalizeSave, parseSaveImport, exportSave } = source.load("app/game/save.ts");
const H = source.load("app/game/systems/heritageV152.ts");
const PANEL = "app/game/HeritagePanelV152.tsx";
const compiled = await build({ stdin: { contents: `
export * from "./app/game/systems/campaignSlots";
export {defaultSave, SAVE_STORAGE_KEY} from "./app/game/save";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const S = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { async request(_n, _o, callback) { return callback({ name: "lock" }); } } } });

const owner = "2026-11-19T09:00:00.000Z", now = "2026-11-19T10:00:00.000Z";
function elder(createdAt = owner) {
  const save = defaultSave(createdAt);
  save.profile = { ...save.profile, hunterName: "Kha’ra", honor: 1900, rankId: "elder" };
  save.appearance = { ...save.appearance, biomaskId: "wolf" };
  return save;
}
function sealed(createdAt = owner, weaponId = "combistick") {
  const save = elder(createdAt);
  const r = H.sealHeritageTestamentV152(save, { trigger: "elder-retirement", weaponId }, now);
  assert.equal(r.ok, true, r.reason);
  return { ...save, heritageV152: r.state };
}
function store(entries = []) {
  const values = new Map(entries);
  return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: k => { values.delete(k); } };
}

test("sources : bonus et déclencheurs tels que la bible les fixe ; seul le déclencheur proposé est jouable", () => {
  assert.equal(H.HERITAGE_BONUS_HONOR_V152, 100);
  const reachable = H.HERITAGE_TRIGGERS_V152.filter(t => t.reachable).map(t => [t.id, t.origin]);
  assert.deepEqual(reachable, [["elder-retirement", "proposé"]]);
  const bb = H.HERITAGE_TRIGGERS_V152.find(t => t.id === "bad-blood-e2");
  assert.equal(bb.transmitsMask, false);
});

test("sceller : Elder requis, arme possédée, masque porté, une seule fois", () => {
  const young = { ...elder(), profile: { ...elder().profile, honor: 300, rankId: "blooded" } };
  assert.equal(H.sealHeritageTestamentV152(young, { trigger: "elder-retirement", weaponId: "combistick" }, now).ok, false);
  assert.equal(H.sealHeritageTestamentV152(elder(), { trigger: "elder-retirement", weaponId: "smart-disc" }, now).ok, false, "arme non possédée");
  assert.equal(H.sealHeritageTestamentV152(elder(), { trigger: "hardcore-death", weaponId: "combistick" }, now).ok, false, "déclencheur absent du jeu");
  const s = sealed();
  assert.equal(s.heritageV152.testament.maskId, "wolf");
  assert.equal(s.heritageV152.testament.legend.honor, 1900);
  const again = H.sealHeritageTestamentV152(s, { trigger: "elder-retirement", weaponId: "plasma-caster" }, now);
  assert.equal(again.ok, false);
});

test("boucle complète : sceller dans la partie 1, créer l’héritier dans la partie 2, déplacer l’original, refuser une seconde réception", async () => {
  const ancestor = sealed();
  const s = store([[S.SAVE_STORAGE_KEY, JSON.stringify(ancestor)]]);
  const migrated = await S.migrateLegacyCampaignSlot(s);
  assert.equal(migrated.ok, true, migrated.message);
  const offers = S.loadCampaignSlots(s).heritageOffers;
  assert.equal(offers.length, 1);
  assert.equal(offers[0].claimed, false);
  assert.equal(offers[0].hunterName, "Kha’ra");

  const created = await S.createHeirCampaignSlot(2, "Descendant", migrated.slotId, s);
  assert.equal(created.ok, true, created.message);
  const doc = JSON.parse(s.getItem(S.campaignSlotStorageKey(2)));
  const heir = doc.checkpoints[0].archive.campaign;
  assert.equal(heir.profile.honor, 100);
  assert.equal(heir.profile.rankId, "young-blood", "aucun rang n’est donné");
  const inh = heir.heritageV152.inheritance;
  assert.equal(inh.testament.id, H.testamentIdV152(owner));
  assert.equal(inh.weapon.locationId, "archives-des-lignees");
  assert.equal(inh.weapon.ownerId, heir.createdAt);
  // Le legs source n'est pas modifié.
  assert.deepEqual(JSON.parse(s.getItem(S.SAVE_STORAGE_KEY)).heritageV152, ancestor.heritageV152);

  // Double transmission refusée, sans écriture.
  assert.equal(S.loadCampaignSlots(s).heritageOffers[0].claimed, true);
  const before = s.getItem(S.campaignSlotStorageKey(3));
  const twice = await S.createHeirCampaignSlot(3, "Second", migrated.slotId, s);
  assert.equal(twice.ok, false);
  assert.match(twice.message, /déjà été reçu/);
  assert.equal(s.getItem(S.campaignSlotStorageKey(3)), before);

  // L'original légué : rang Blooded requis (proposé), un seul emplacement.
  assert.equal(H.moveHeritageWeaponV152(heir, "porte-par-heritier").ok, false);
  const blooded = { ...heir, profile: { ...heir.profile, honor: 260, rankId: "blooded" } };
  const taken = H.moveHeritageWeaponV152(blooded, "porte-par-heritier");
  assert.equal(taken.ok, true, taken.reason);
  assert.equal(taken.state.inheritance.weapon.locationId, "porte-par-heritier");
  const carried = { ...blooded, heritageV152: taken.state };
  assert.equal(H.moveHeritageWeaponV152(carried, "porte-par-heritier").ok, false);
  // Re-normaliser ne redonne jamais le bonus.
  assert.equal(normalizeSave(carried).profile.honor, 260);
});

test("une partie déjà jouée ou le propriétaire du legs ne reçoit pas l’héritage", () => {
  const testament = sealed().heritageV152.testament;
  const played = defaultSave("2026-11-20T00:00:00.000Z"); played.profile.honor = 40;
  assert.equal(H.receiveHeritageV152(played, testament, new Set(), now).ok, false);
  assert.equal(H.receiveHeritageV152(defaultSave(owner), testament, new Set(), now).ok, false);
  assert.equal(H.receiveHeritageV152(defaultSave("2026-11-20T00:00:00.000Z"), testament, new Set([testament.id]), now).ok, false);
});

test("sauvegarde : forme inchangée sans héritage, aller-retour exact, version future et legs copié refusés", () => {
  const plain = defaultSave(owner);
  assert.equal(Object.hasOwn(normalizeSave(plain), "heritageV152"), false);
  const s = sealed();
  const parsed = parseSaveImport(exportSave(s));
  assert.ok(parsed.save, parsed.failure);
  assert.deepEqual(parsed.save.heritageV152, s.heritageV152);
  const heir = H.receiveHeritageV152(defaultSave("2026-11-20T00:00:00.000Z"), s.heritageV152.testament, new Set(), now).save;
  const heirParsed = parseSaveImport(exportSave(heir));
  assert.deepEqual(heirParsed.save.heritageV152, heir.heritageV152);
  assert.equal(heirParsed.save.profile.honor, 100);
  assert.equal(parseSaveImport(JSON.stringify({ ...plain, heritageV152: { version: 2 } })).failure, "future-version");
  // Un legs scellé recopié dans une autre partie ne correspond pas à son propriétaire.
  assert.equal(parseSaveImport(JSON.stringify({ ...defaultSave("2026-11-21T00:00:00.000Z"), heritageV152: s.heritageV152 })).failure, "invalid-save");
});

test("panneau SSR : niche de l’ancêtre, arme aux Archives, legs scellé", () => {
  const onAction = () => ({ ok: true, message: "" });
  const heir = H.receiveHeritageV152(defaultSave("2026-11-20T00:00:00.000Z"), sealed().heritageV152.testament, new Set(), now).save;
  const html = source.render(PANEL, { save: heir, disabled: false, onAction });
  assert.match(html, /Descendant de <strong>Kha’ra<\/strong>/);
  assert.match(html, /data-heritage-mask="wolf"/);
  assert.match(html, /data-heritage-weapon-location="archives-des-lignees"/);
  assert.match(html, /Rang Blooded requis/);
  const open = source.render(PANEL, { save: elder(), disabled: false, onAction });
  assert.match(open, /data-heritage-testament="open"/);
  assert.match(open, /data-heritage-prepare/);
  const done = source.render(PANEL, { save: sealed(), disabled: false, onAction });
  assert.match(done, /data-heritage-sealed/);
  const future = source.render(PANEL, { save: { ...elder(), heritageV152: { version: 9 } }, disabled: false, onAction });
  assert.match(future, /version plus récente/);
});
