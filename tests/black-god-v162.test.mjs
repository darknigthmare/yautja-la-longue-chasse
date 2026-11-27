import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Real modules (save, Black God, heritage and Hardcore rules, campaign slots, panel); nothing is mocked.
const source = homeworldSceneSsrV78();
const { defaultSave, normalizeSave, parseSaveImport, exportSave } = source.load("app/game/save.ts");
const BG = source.load("app/game/systems/blackGodV162.ts");
const H = source.load("app/game/systems/heritageV152.ts");
const HC = source.load("app/game/systems/hardcoreV155.ts");
const PANEL = "app/game/BlackGodPanelV162.tsx";
const compiled = await build({ stdin: { contents: `
export * from "./app/game/systems/campaignSlots";
export {defaultSave, SAVE_STORAGE_KEY} from "./app/game/save";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const S = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { async request(_n, _o, callback) { return callback({ name: "lock" }); } } } });

const owner = "2026-11-19T09:00:00.000Z", won = "2026-11-19T10:00:00.000Z", gone = "2026-11-19T11:00:00.000Z";
function store(entries = []) {
  const values = new Map(entries);
  return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => { values.set(k, v); }, removeItem: k => { values.delete(k); } };
}
function legend(createdAt = owner, honor = 40_000) {
  const save = defaultSave(createdAt);
  save.profile = { ...save.profile, hunterName: "Kha’ra", honor, rankId: honor >= 1800 ? "elder" : "blooded" };
  save.appearance = { ...save.appearance, biomaskId: "wolf" };
  return save;
}
/** Plays a full winning run with the right answers. */
function winRun(save) {
  let run = BG.startBlackGodTrialV162(save).run;
  run = BG.actBlackGodTrialV162(run, "blesser-les-deux");
  run = BG.actBlackGodTrialV162(run, "achever-reine");
  const counter = { queue: "esquiver", "sang-acide": "frapper-a-distance", cri: "tenir-la-position" };
  for (let i = 0; i < 3; i++) run = BG.actBlackGodTrialV162(run, counter[BG.blackGodCurrentAttackV162(run)]);
  run = BG.actBlackGodTrialV162(run, "piste-vraie");
  for (let i = 0; i < 3; i++) run = BG.actBlackGodTrialV162(run, "point-faible");
  return BG.actBlackGodTrialV162(run, "coup-final");
}
function victorious(save = legend()) {
  const r = BG.recordBlackGodTrialV162(save, winRun(save), won);
  assert.equal(r.ok, true, r.reason);
  return { ...save, blackGodV162: r.state };
}
function sacrificed(save = victorious(), weaponId = "combistick") {
  const r = BG.sacrificeBlackGodV162(save, { weaponId, maskId: null, gesture: "transmettre" }, gone);
  assert.equal(r.ok, true, r.reason);
  return { ...save, blackGodV162: r.state, heritageV152: r.heritage ?? save.heritageV152 };
}

test("sources : seuil de la bible, hors canon annoncé, sacrifice non proposé au Mausolée", () => {
  assert.equal(BG.BLACK_GOD_HONOR_THRESHOLD_V162, 40_000);
  assert.match(BG.BLACK_GOD_SOURCE_V162.rank, /hors canon/);
  assert.deepEqual(BG.BLACK_GOD_PHASES_V162.map(p => p.id), ["reines", "ancienne", "mental", "avatar", "arene"]);
  const t = H.HERITAGE_TRIGGERS_V152.find(x => x.id === "black-god-sacrifice");
  assert.deepEqual([t.origin, t.reachable, t.transmitsMask, t.transmitsWeapon], ["bible", false, true, true]);
  assert.equal(H.sealHeritageTestamentV152(victorious(), { trigger: "black-god-sacrifice", weaponId: "combistick" }, gone).ok, false);
});

test("le tribunal et la voie Bad Blood contrôlent l’accès au Black God sans effacer la victoire", () => {
  const recognized = legend();
  const T = source.load("app/game/systems/honorTribunalV147.ts");
  const frozen = { ...recognized, tribunalV147: {
    ...T.emptyHonorTribunalV147(), freeze: { verdictId: "ver-1", rankId: "elder" },
  } };
  assert.match(BG.startBlackGodTrialV162(frozen).reason, /rang est gelé/);
  assert.equal(BG.recordBlackGodTrialV162(frozen, winRun(recognized), won).ok, false);

  const declared = { ...recognized, justice: { ...recognized.justice, declaration: "bad-blood" } };
  assert.match(BG.startBlackGodTrialV162(declared).reason, /voie Bad Blood/);

  const victoriousBadBlood = { ...victorious(), justice: declared.justice };
  assert.equal(BG.blackGodStatusV162(victoriousBadBlood), "victory");
  const choice = { weaponId: "combistick", maskId: null, gesture: "transmettre" };
  assert.match(BG.sacrificeBlackGodV162(victoriousBadBlood, choice, gone).reason, /voie Bad Blood/);
  assert.equal(BG.sacrificeBlackGodV162({ ...victoriousBadBlood, justice: recognized.justice }, choice, gone).ok, true);
});

test("accès refusé sans seuil d’honneur, sans rang Elder, après une mort Hardcore", () => {
  const low = legend(owner, 39_999);
  const access = BG.blackGodTrialAccessV162(low);
  assert.equal(access.allowed, false);
  assert.match(access.reasons.join(" "), /39999 \/ 40000/);
  assert.equal(BG.startBlackGodTrialV162(low).ok, false);
  assert.equal(BG.blackGodTrialAccessV162({ ...legend(), profile: { ...legend().profile, rankId: "elite" } }).allowed, false);
  const hc = { ...legend(), hardcoreV155: HC.createHardcoreStateV155(owner) };
  assert.equal(BG.blackGodTrialAccessV162(hc).allowed, true, "Hardcore vivant : accès");
  const dead = HC.recordHardcoreDeathV155(hc, "jungle-vey", won);
  assert.equal(BG.blackGodTrialAccessV162({ ...hc, hardcoreV155: dead.hardcore }).allowed, false);
  assert.equal(BG.blackGodTrialAccessV162(legend()).allowed, true);
  // Une tentative terminée ne s’inscrit pas sans l’accès.
  const run = winRun(legend());
  assert.equal(BG.recordBlackGodTrialV162(low, { ...run, ownerCreatedAt: low.createdAt }, won).ok, false);
});

test("épreuve : phases dans l’ordre de la bible, blessures, défaite inscrite puis victoire", () => {
  const save = legend();
  let run = BG.startBlackGodTrialV162(save).run;
  assert.equal(run.phase, "reines");
  assert.equal(BG.actBlackGodTrialV162(run, "action-inconnue"), run, "action hors liste ignorée");
  run = BG.actBlackGodTrialV162(run, "tuer-une-reine");
  assert.equal(run.enraged, true, "tuer une reine enrage l’autre (bible)");
  run = BG.actBlackGodTrialV162(run, "achever-reine");
  assert.deepEqual([run.phase, run.wounds], ["ancienne", 1]);
  // Défaite : trois blessures.
  const counter = { queue: "esquiver", "sang-acide": "frapper-a-distance", cri: "tenir-la-position" };
  const wrong = r => ["esquiver", "frapper-a-distance", "tenir-la-position"].find(x => x !== counter[BG.blackGodCurrentAttackV162(r)]);
  let lost = BG.actBlackGodTrialV162(run, wrong(run));
  assert.equal(lost.phase, "ancienne");
  lost = BG.actBlackGodTrialV162(lost, wrong(lost));
  assert.equal(lost.phase, "defaite");
  assert.equal(lost.wounds, 3);
  assert.deepEqual(BG.blackGodActionsV162(lost), []);
  const retreat = BG.recordBlackGodTrialV162(save, lost, won);
  assert.equal(retreat.ok, true, retreat.reason);
  assert.deepEqual([retreat.state.failedAttempts, retreat.state.victoryAt], [1, null]);
  assert.equal(BG.recordBlackGodTrialV162({ ...save, blackGodV162: retreat.state }, lost, won).ok, false, "tentative déjà inscrite");
  // Phase 3a : la vraie piste reprend la chronique réelle.
  const after = { ...save, blackGodV162: retreat.state };
  const second = BG.startBlackGodTrialV162(after).run;
  assert.equal(second.attempt, 2);
  assert.equal(second.trails.filter(t => t.true)[0].text, `${save.statistics.missionsCompleted} chasse(s) réussie(s), ${save.trophies.length} trophée(s) rapporté(s)`);
  assert.equal(BG.recordBlackGodTrialV162(after, BG.startBlackGodTrialV162(after).run, won).ok, false, "épreuve non terminée");
  const v = victorious(after);
  assert.equal(BG.blackGodStatusV162(v), "victory");
  assert.equal(v.blackGodV162.failedAttempts, 1);
  assert.equal(BG.startBlackGodTrialV162(v).ok, false, "déjà remportée");
  // « Le rang acquis reste » : la victoire tient même si l’honneur redescend.
  assert.equal(BG.blackGodStatusV162({ ...v, profile: { ...v.profile, honor: 10 } }), "victory");
});

test("sacrifice au choix : le refuser n’écrit rien ; l’accomplir clôt la chronique et scelle le legs complet", () => {
  const v = victorious();
  // Refuser = ne rien appeler : l’état reste « victoire », le sacrifice reste disponible plus tard.
  assert.equal(BG.blackGodStatusV162(v), "victory");
  assert.equal(BG.sacrificeBlackGodV162(legend(), { weaponId: "combistick", maskId: null, gesture: "partir" }, gone).ok, false, "pas de sacrifice sans victoire");
  assert.equal(BG.sacrificeBlackGodV162(v, { weaponId: "combistick", maskId: null, gesture: "nope" }, gone).ok, false, "geste requis");
  assert.equal(BG.sacrificeBlackGodV162(v, { weaponId: "smart-disc", maskId: null, gesture: "partir" }, gone).ok, false, "arme non possédée");
  const end = sacrificed(v);
  assert.equal(BG.blackGodStatusV162(end), "sacrificed");
  assert.deepEqual(end.blackGodV162.sacrifice, { sacrificedAt: gone, gesture: "transmettre" });
  const t = end.heritageV152.testament;
  assert.deepEqual([t.trigger, t.maskId, t.weaponId, t.legend.hunterName, t.legend.honor], ["black-god-sacrifice", "wolf", "combistick", "Kha’ra", 40_000]);
  for (const key of ["profile", "inventory", "missionProgress", "trophies", "statistics", "appearance"]) assert.deepEqual(end[key], v[key], key);
  assert.equal(BG.sacrificeBlackGodV162(end, { weaponId: "combistick", maskId: null, gesture: "partir" }, gone).ok, false, "irréversible, une seule fois");
  // Sans masque porté : le joueur le désigne (proposé).
  const bare = victorious({ ...legend(), appearance: { ...legend().appearance, biomaskId: null } });
  assert.equal(BG.sacrificeBlackGodV162(bare, { weaponId: "combistick", maskId: null, gesture: "partir" }, gone).ok, false);
  assert.equal(BG.sacrificeBlackGodV162(bare, { weaponId: "combistick", maskId: "jungle", gesture: "partir" }, gone).heritage.testament.maskId, "jungle");
});

test("exclusivité : retraite à Elder déjà scellée, Hardcore, panneau du Mausolée", () => {
  const retired = H.sealHeritageTestamentV152(legend(), { trigger: "elder-retirement", weaponId: "combistick" }, won);
  assert.equal(retired.ok, true, retired.reason);
  const v = victorious({ ...legend(), heritageV152: retired.state });
  const end = BG.sacrificeBlackGodV162(v, { weaponId: null, maskId: null, gesture: "accueillir" }, gone);
  assert.equal(end.ok, true, end.reason);
  assert.equal(end.heritage, null, "aucun second legs");
  assert.equal(end.state.sacrifice.gesture, "accueillir");
  // Après le sacrifice, ni la retraite ni le Mausolée ne scellent un autre legs.
  const s = sacrificed();
  assert.equal(H.sealHeritageTestamentV152(s, { trigger: "elder-retirement", weaponId: "combistick" }, gone).ok, false);
  // Hardcore vivant : le sacrifice est possible ; après une mort Hardcore inscrite, non.
  const hc = victorious({ ...legend(), hardcoreV155: HC.createHardcoreStateV155(owner) });
  const dead = { ...hc, hardcoreV155: HC.recordHardcoreDeathV155(hc, "jungle-vey", won).hardcore };
  assert.equal(BG.sacrificeBlackGodV162(dead, { weaponId: "combistick", maskId: null, gesture: "partir" }, gone).ok, false);
  const hcEnd = sacrificed(hc);
  assert.equal(HC.hardcoreStatusV155(hcEnd), "alive", "le sacrifice ne réécrit pas l’état Hardcore");
  // Une clôture Hardcore ultérieure ne crée pas de second legs (V155 garde le legs existant).
  const after = HC.closeHardcoreChronicleV155({ ...hcEnd, hardcoreV155: HC.recordHardcoreDeathV155(hcEnd, "jungle-vey", gone).hardcore }, { weaponId: null, maskId: null }, gone);
  assert.equal(after.ok, true, after.reason);
  assert.equal(after.heritage, null);
});

test("héritier : reçoit le legs du sacrifice une seule fois ; sauvegarde antérieure non chargeable", async () => {
  const ancestor = sacrificed();
  const s = store([[S.SAVE_STORAGE_KEY, JSON.stringify(ancestor)]]);
  const migrated = await S.migrateLegacyCampaignSlot(s);
  assert.equal(migrated.ok, true, migrated.message);
  const catalog = S.loadCampaignSlots(s);
  assert.equal(catalog.slots[0].blackGodV162, "sacrificed");
  assert.equal(catalog.heritageOffers.length, 1);
  const ancestorRaw = s.getItem(S.SAVE_STORAGE_KEY), ancestorSlot = s.getItem(S.campaignSlotStorageKey(1));
  const heir = await S.createHeirCampaignSlot(2, "Descendant", migrated.slotId, s);
  assert.equal(heir.ok, true, heir.message);
  const campaign = JSON.parse(s.getItem(S.campaignSlotStorageKey(2))).checkpoints[0].archive.campaign;
  assert.deepEqual([campaign.profile.honor, campaign.profile.rankId], [100, "young-blood"]);
  assert.equal(campaign.heritageV152.inheritance.testament.trigger, "black-god-sacrifice");
  assert.equal(campaign.heritageV152.inheritance.weapon.locationId, "archives-des-lignees");
  assert.equal(Object.hasOwn(campaign, "blackGodV162"), false, "l’héritier ne reçoit aucun statut Black God");
  assert.equal(s.getItem(S.SAVE_STORAGE_KEY), ancestorRaw);
  assert.equal(s.getItem(S.campaignSlotStorageKey(1)), ancestorSlot);
  const twice = await S.createHeirCampaignSlot(3, "Second", migrated.slotId, s);
  assert.equal(twice.ok, false);
  assert.match(twice.message, /déjà été reçu/);

  // Une sauvegarde d’avant le sacrifice reste conservée mais ne se charge plus.
  const s2 = store([[S.SAVE_STORAGE_KEY, JSON.stringify(victorious())]]);
  assert.equal((await S.migrateLegacyCampaignSlot(s2)).ok, true);
  s2.setItem(S.SAVE_STORAGE_KEY, JSON.stringify(sacrificed()));
  const c2 = S.loadCampaignSlots(s2);
  const before = s2.getItem(S.campaignSlotStorageKey(1));
  const refused = await S.activateCampaignCheckpoint(1, "auto-1", { expectedRevision: c2.slots[0].revision }, s2);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /sacrifice/);
  assert.equal(s2.getItem(S.campaignSlotStorageKey(1)), before);
});

test("sauvegarde : aller-retour exact, ancienne forme intacte, version future et état recopié refusés", () => {
  const plain = defaultSave(owner);
  assert.equal(Object.hasOwn(normalizeSave(plain), "blackGodV162"), false);
  const legacy = JSON.parse(JSON.stringify(plain));
  delete legacy.blackGodV162;
  const parsedLegacy = parseSaveImport(JSON.stringify(legacy));
  assert.ok(parsedLegacy.save, parsedLegacy.failure);
  assert.equal(Object.hasOwn(parsedLegacy.save, "blackGodV162"), false);
  for (const save of [victorious(), sacrificed()]) {
    const parsed = parseSaveImport(exportSave(save));
    assert.ok(parsed.save, parsed.failure);
    assert.deepEqual(parsed.save.blackGodV162, save.blackGodV162);
    assert.deepEqual(parsed.save.heritageV152 ?? null, save.heritageV152 ?? null);
  }
  assert.equal(parseSaveImport(JSON.stringify({ ...plain, blackGodV162: { version: 2 } })).failure, "future-version");
  assert.equal(parseSaveImport(JSON.stringify({ ...defaultSave("2026-11-21T00:00:00.000Z"), blackGodV162: victorious().blackGodV162 })).failure, "invalid-save");
  // Un sacrifice sans victoire n’est pas une forme valide.
  assert.equal(BG.normalizeBlackGodV162({ ...sacrificed().blackGodV162, victoryAt: null }, owner), null);
  assert.equal(BG.startBlackGodTrialV162({ ...legend(), blackGodV162: { version: 9 } }).ok, false);
  assert.equal(BG.sacrificeBlackGodV162({ ...victorious(), blackGodV162: { version: 9 } }, { weaponId: "combistick", maskId: null, gesture: "partir" }, gone).ok, false);
});

test("panneau SSR : hors canon affiché, accès verrouillé, sacrifice en deux temps, chronique close", async () => {
  const props = { disabled: false, onTrialEnd: () => ({ ok: true, message: "" }), onSacrifice: () => ({ ok: true, message: "" }) };
  const locked = source.render(PANEL, { ...props, save: legend(owner, 500) });
  assert.match(locked, /data-black-god-out-of-canon/);
  assert.match(locked, /data-black-god-locked/);
  assert.doesNotMatch(locked, /data-black-god-start/);
  assert.match(source.render(PANEL, { ...props, save: legend() }), /data-black-god-start/);
  const won = source.render(PANEL, { ...props, save: victorious() });
  assert.match(won, /data-black-god-v162="victory"/);
  assert.match(won, /data-black-god-prepare/);
  assert.doesNotMatch(won, /data-black-god-sacrifice(?!-)/, "la confirmation demande deux étapes");
  const client = await readFile("app/game/GameClient.tsx", "utf8");
  assert.match(client, /blackGodStatusV162\(save\) === "sacrificed"/);
  assert.match(client, /persistSocialProgress\(\{ blackGodV162: change\.state, \.\.\.\(change\.heritage/);
  assert.match(client, /blackGodV162: update\.blackGodV162/);
  const closedPanel = source.load(PANEL).BlackGodChronicleClosedV162;
  assert.equal(typeof closedPanel, "function");
});
