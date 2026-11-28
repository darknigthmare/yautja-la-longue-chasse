import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// V165 : boucle Warp W-02 (1629). Modules réels, aucun mock de logique de jeu.
const source = homeworldSceneSsrV78();
const warp = source.load("app/game/systems/warpEpochsV165.ts");
const { MISSIONS } = source.load("app/game/data.ts");
const { defaultSave, normalizeSave, parseSaveImport, exportSave, SAVE_VERSION } = source.load("app/game/save.ts");

const owner = "2026-11-20T10:00:00.000Z";
const full = { blooded: true, personalShip: true, adjutant: true };
const ok = update => { assert.equal(update.accepted, true, update.message); return update.state; };

function readyState() {
  let s = warp.createWarpEpochsV165(owner);
  s = ok(warp.startWarpCommonQuestV165(s, full, "stabilite"));
  for (const c of warp.WARP_COMPONENTS_V165) s = ok(warp.verifyWarpComponentV165(s, c.id, "reparer"));
  s = ok(warp.installWarpModuleV165(s, "marge"));
  return ok(warp.selectWarpBranchV165(s, "W-02"));
}
const huntResult = (outcome, extra = {}) => ({
  outcome, completedObjectiveIds: ["scan-vanguard", "recover-transponder", "defeat-vey", "extract-jungle-trophy"],
  kills: 6, trophyClaims: outcome === "success" ? [{ id: "claim-1" }] : [], completedAt: owner, ...extra,
});

test("accès refusé sans quête commune ni module, et sans Adjutant pour commencer", () => {
  const empty = warp.createWarpEpochsV165(owner);
  const ids = warp.evaluateWarpDepartureV165(empty, full).missing.map(m => m.id);
  assert(ids.includes("quest") && ids.includes("module"));
  assert.equal(warp.departWarpV165(empty, full).accepted, false);
  assert.equal(warp.startWarpCommonQuestV165(empty, { ...full, adjutant: false }, "energie").accepted, false);
  // Posséder les pièces n'installe pas le module (STATE5-26).
  let s = ok(warp.startWarpCommonQuestV165(empty, full, "energie"));
  for (const c of warp.WARP_COMPONENTS_V165) s = ok(warp.verifyWarpComponentV165(s, c.id, "variante"));
  assert.equal(s.warpModuleInstalled, false);
  assert(warp.evaluateWarpDepartureV165(s, full).missing.some(m => m.id === "module"));
  // Une branche non implémentée ne peut pas être choisie.
  assert.equal(warp.selectWarpBranchV165(readyState(), "W-03").accepted, false);
});

test("voyage engagé vers W-02, retour réservé même après la perte d'Adjutant", () => {
  const ready = readyState();
  assert.equal(warp.evaluateWarpDepartureV165(ready, { ...full, adjutant: false }).allowed, false);
  const gone = ok(warp.departWarpV165(ready, full));
  assert.equal(gone.activeWarpTripId, "warp-trip-1");
  assert.equal(gone.warpReturnReservation, "reservee");
  assert.equal(warp.branchVisitV165(gone, "W-02").visits, 1);
  // Adjutant perdu après le départ : le retour n'en dépend pas (STATE5-29).
  assert.equal(warp.canReturnFromWarpV165(gone), true);
  assert.equal(warp.departWarpV165(gone, full).accepted, false);
  const back = ok(warp.returnFromWarpV165(gone));
  assert.equal(back.warpReturnReservation, "utilisee");
  assert.equal(back.activeWarpTripId, null);
  // Le prochain départ exige de nouveau la fonction Adjutant.
  assert.equal(warp.departWarpV165(back, { ...full, adjutant: false }).accepted, false);
});

test("mission 1629 jouable via la chasse existante adaptée, sans honneur ni rang", () => {
  const base = MISSIONS.find(m => m.id === warp.W02_HUNT_BASE_MISSION_ID_V165);
  const mission = warp.warpW02HuntMissionV165(base);
  assert.equal(mission.id, "jungle-vey");
  assert.equal(mission.baseRewards.honor, 0);
  assert.deepEqual(mission.objectives.map(o => o.id), base.objectives.map(o => o.id));
  assert.match(mission.planetName, /1629/);
  assert.equal(base.presentation, undefined);
  assert.equal(mission.presentation.backgroundLayout, "single");
  assert.match(mission.presentation.revealAnnouncement, /garde/);
  const panorama = readFileSync(new URL(`../public${mission.presentation.backgroundPath}`, import.meta.url));
  assert.equal(panorama.toString("ascii", 0, 4), "RIFF");
  assert.equal(panorama.toString("ascii", 8, 12), "WEBP");
  let s = ok(warp.departWarpV165(readyState(), full));
  assert.equal(warp.canLaunchW02HuntV165(s).allowed, false);
  s = ok(warp.resolveW02StepV165(s, "WARP-M16", "declencher"));
  s = ok(warp.resolveW02StepV165(s, "WARP-M17", "affronter"));
  assert.equal(warp.branchVisitV165(s, "W-02").steps["WARP-M17"].resolved, false);
  assert.equal(warp.canLaunchW02HuntV165(s).allowed, true);
  const after = ok(warp.applyW02HuntResultV165(s, huntResult("success"), false));
  const visit = warp.branchVisitV165(after, "W-02");
  assert.equal(visit.huntSuccess, true);
  assert.deepEqual(visit.steps["WARP-M17"], { resolved: true, success: true, choice: "affronter" });
  assert.equal(visit.trophy.branchId, "W-02");
  assert.equal(visit.trophy.year, 1629);
  assert(visit.deadIds.includes(warp.W02_CHAMPION_ID_V165));
  // Le même événement ne s'applique pas deux fois ; le champion mort ferme la chasse.
  assert.equal(warp.applyW02HuntResultV165(after, huntResult("success"), false).accepted, false);
  const final = ok(warp.resolveW02StepV165(after, "WARP-M18", "accepter-don"));
  assert.equal(warp.branchVisitV165(final, "W-02").epochCompleted, true);
});

test("la cloche de W-02 détourne un garde sans changer l'effectif de la chasse", () => {
  const base = MISSIONS.find(mission => mission.id === warp.W02_HUNT_BASE_MISSION_ID_V165);
  const gone = ok(warp.departWarpV165(readyState(), full));
  const sounded = ok(warp.resolveW02StepV165(gone, "WARP-M16", "declencher"));
  const saved = parseSaveImport(exportSave({ ...defaultSave(owner), warpEpochsV165: sounded }));
  assert.ok(saved.save, saved.failure);
  const visit = warp.branchVisitV165(saved.save.warpEpochsV165, "W-02");
  assert.deepEqual(visit.alertedPassages, [warp.WARP_W02_TERRACE_ALERT_V165]);

  const clear = warpWaves(base, false);
  const alarm = warpWaves(base, visit.alertedPassages.includes(warp.WARP_W02_TERRACE_ALERT_V165));
  assert.equal(alarm.waves[0].count, clear.waves[0].count - 1);
  assert.deepEqual(alarm.waves.find(wave => wave.id === "w02-terrace-guard"),
    { ...clear.waves[0], id: "w02-terrace-guard", count: 1, trigger: "objective", triggerId: "recover-transponder" });
  assert.equal(alarm.total, clear.total);
  assert.equal(alarm.waves.at(-1), clear.waves.at(-1), "profil des renforts du boss conservé");
  assert.equal(warp.resolveW02StepV165(sounded, "WARP-M16", "contourner").changed, false);
  assert.equal(warp.resolveW02StepV165(readyState(), "WARP-M16", "declencher").accepted, false);

  const art = readFileSync(new URL(`../public${warp.WARP_W02_BONSHO_V165}`, import.meta.url));
  assert.equal(createHash("sha256").update(art).digest("hex"),
    "d636d7fd399bb2dabb1c05caec8213bf28321d4d89fba424767d0e801e1428e0");
  const panel = source.render("app/game/WarpEpochsPanelV165.tsx", { save: saved.save, onPersist: () => true, onClose: () => {} });
  assert.match(panel, /data-warp-bonsho/);
  assert.match(panel, /a détourné un garde de la terrasse vers le camp/);

  function warpWaves(mission, alerted) {
    const waves = warp.warpW02HuntMissionV165(mission, alerted).enemyWaves;
    return { waves, total: waves.reduce((total, wave) => total + wave.count, 0) };
  }
});

test("échec, retrait et technologie laissée : pas de trophée, un écho vers W-03", () => {
  let s = ok(warp.departWarpV165(readyState(), full));
  s = ok(warp.resolveW02StepV165(s, "WARP-M16", "contourner"));
  const failed = ok(warp.applyW02HuntResultV165(s, huntResult("failure", { completedObjectiveIds: ["scan-vanguard"] }), true));
  const visit = warp.branchVisitV165(failed, "W-02");
  assert.equal(visit.trophy, null);
  assert.equal(visit.deadIds.includes(warp.W02_CHAMPION_ID_V165), false);
  assert.equal(failed.echoes.length, 1);
  assert.equal(failed.echoes[0].toBranchId, "W-03");
  assert.equal(warp.canLaunchW02HuntV165(failed).allowed, true);
});

test("état de branche conservé à la revisite : morts et objets pris non réinitialisés", () => {
  let s = ok(warp.departWarpV165(readyState(), full));
  s = ok(warp.resolveW02StepV165(s, "WARP-M16", "declencher"));
  s = ok(warp.resolveW02StepV165(s, "WARP-M17", "affronter"));
  s = ok(warp.applyW02HuntResultV165(s, huntResult("success"), false));
  s = ok(warp.resolveW02StepV165(s, "WARP-M18", "accepter-don"));
  s = ok(warp.returnFromWarpV165(s));
  const before = warp.branchVisitV165(s, "W-02");
  s = ok(warp.departWarpV165(s, full));
  assert.equal(s.activeWarpTripId, "warp-trip-2");
  const again = warp.branchVisitV165(s, "W-02");
  assert.equal(again.visits, 2);
  assert.deepEqual({ ...again, visits: 0 }, { ...before, visits: 0 });
  assert.equal(warp.canLaunchW02HuntV165(s).allowed, false);
  assert.equal(warp.resolveW02StepV165(s, "WARP-M16", "contourner").changed, false);
});

test("héros canon intouchables : aucune issue ne les tue", () => {
  assert.deepEqual([...warp.WARP_CANON_HERO_IDS_V165].sort(), ["kenji", "naru", "torres", "ursa"]);
  const s = ok(warp.departWarpV165(readyState(), full));
  for (const id of warp.WARP_CANON_HERO_IDS_V165) assert.equal(warp.recordBranchDeathV165(s, "W-02", id).accepted, false);
  const mission = warp.warpW02HuntMissionV165(MISSIONS.find(m => m.id === "jungle-vey"));
  for (const hero of ["Kenji", "Ursa", "Naru", "Torres"]) {
    assert.doesNotMatch(mission.targetName + mission.boss.name, new RegExp(hero));
  }
  // Toutes les issues de la boucle : aucune ne place un héros parmi les morts.
  let t = ok(warp.resolveW02StepV165(s, "WARP-M16", "contourner"));
  t = ok(warp.applyW02HuntResultV165(t, huntResult("success"), false));
  for (const id of warp.WARP_CANON_HERO_IDS_V165) assert.equal(warp.branchVisitV165(t, "W-02").deadIds.includes(id), false);
  // Une sauvegarde forgée qui tue un héros est rejetée.
  const forged = JSON.parse(JSON.stringify(t));
  forged.branchVisitState["W-02"].deadIds.push("kenji");
  assert.equal(warp.normalizeWarpEpochsV165(forged, owner), null);
});

test("sauvegarde : aller-retour, ancienne forme intacte, version future refusée", () => {
  let s = ok(warp.departWarpV165(readyState(), full));
  s = ok(warp.resolveW02StepV165(s, "WARP-M16", "declencher"));
  const save = { ...defaultSave(owner), warpEpochsV165: s };
  const round = parseSaveImport(exportSave(save));
  assert.equal(round.failure ?? null, null);
  assert.deepEqual(round.save.warpEpochsV165, s);
  assert.equal(round.save.version, SAVE_VERSION);
  // Ancienne sauvegarde : pas de champ Warp, rien d'ajouté ni de perdu.
  const legacy = defaultSave(owner);
  delete legacy.warpEpochsV165;
  const normalized = normalizeSave(legacy);
  assert.equal("warpEpochsV165" in normalized, false);
  assert.deepEqual(normalized.gauntletV134, legacy.gauntletV134);
  // Version future : refusée, pas effacée.
  const future = { ...save, warpEpochsV165: { ...s, version: 2 } };
  assert.equal(parseSaveImport(JSON.stringify(future)).failure, "future-version");
  assert.equal(warp.inspectWarpEpochsV165({ ...s, version: 2 }, owner).status, "future-version");
  // Autre campagne ou incohérence voyage/retour : invalide.
  assert.equal(warp.inspectWarpEpochsV165(s, "2020-01-01T00:00:00.000Z").status, "invalid-save");
  assert.equal(warp.inspectWarpEpochsV165({ ...s, warpReturnReservation: "inactive" }, owner).status, "invalid-save");
});

test("contexte d'accès lu depuis la chronique existante", () => {
  const save = defaultSave(owner);
  const ctx = warp.warpAccessContextFromSaveV165(save, { personalShipAvailable: true });
  assert.equal(ctx.personalShip, true);
  assert.equal(ctx.adjutant, false);
});

test("rendu SSR du panneau et intégration au client", () => {
  const save = defaultSave(owner);
  const html = source.render("app/game/WarpEpochsPanelV165.tsx", { save, onPersist: () => true, onClose: () => {} });
  assert.match(html, /data-warp-epochs-v165/);
  assert.match(html, /data-warp-quest="non_commence"/);
  assert.match(html, /data-warp-condition="module" data-met="false"/);
  assert.match(html, /W-02 · Japon féodal, 1629/);
  assert.match(html, /data-warp-branch-card="W-01" data-status="jouable"/);
  assert.match(html, /data-warp-branch-card="W-03" data-status="non-implemente"/);
  const ready = { ...save, warpEpochsV165: ok(warp.departWarpV165(readyState(), full)) };
  const html2 = source.render("app/game/WarpEpochsPanelV165.tsx", { save: ready, onPersist: () => true, onClose: () => {} });
  assert.match(html2, /data-warp-trip="warp-trip-1"/);
  assert.match(html2, /data-warp-return="reservee"/);
  assert.match(html2, /disabled="" data-warp-village-order="meet-weavers"/);
  const client = readFileSync(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
  assert.match(client, /const WarpEpochsPanelV165 = React\.lazy\(\(\) => import\("\.\/WarpEpochsPanelV165"\)\)/);
  // V167 : l'écriture efface aussi l'ancien dossier tantalusV164 une fois repris dans l'état Warp.
  assert.match(client, /warpEpochsV165: state, \.\.\.\(clearLegacyTantalus \? \{ tantalusV164: null \} : \{\}\)/);
});

test("R2-M048 garde l’aide bornée et l’observation dans W-02 après le retour", () => {
  const base = readyState();
  const campaign = defaultSave(owner);
  const elite = { ...campaign, profile: { ...campaign.profile, rankId: "elite", honor: 5000 } };
  assert.equal(warp.actWarpVillageV165(base, elite, "meet-weavers").accepted, false);
  const active = ok(warp.departWarpV165(base, full));
  assert.equal(warp.actWarpVillageV165(active, campaign, "meet-weavers").accepted, false);
  assert.equal(warp.actWarpVillageV165(active, { ...elite, createdAt: "other" }, "meet-weavers").accepted, false);
  assert.equal(warp.actWarpVillageV165(active, elite, "verify-granary").accepted, false);
  const branch2204 = ok(warp.selectWarpBranchV165(base, warp.WARP_TANTALUS_BRANCH_ID_V165));
  assert.equal(warp.actWarpVillageV165(ok(warp.departWarpV165(branch2204, full)), elite, "meet-weavers").accepted, false);

  for (const choice of ["limited-aid", "observation"]) {
    const afterward = choice === "limited-aid" ? "guide-from-bank" : "follow-locals";
    const other = afterward === "guide-from-bank" ? "follow-locals" : "guide-from-bank";
    let state = active;
    const orders = ["meet-weavers", "survey-mill", choice, afterward, "verify-granary", "record-trace"];
    for (const order of orders) {
      state = ok(warp.actWarpVillageV165(state, elite, order));
      const current = warp.branchVisitV165(state, "W-02").r2M048;
      assert.equal(current.advancedBranchResolved, order === "record-trace");
      const loaded = parseSaveImport(exportSave({ ...elite, warpEpochsV165: state }));
      assert.equal(loaded.failure, null);
      assert.deepEqual(warp.branchVisitV165(loaded.save.warpEpochsV165, "W-02").r2M048, current);
      state = loaded.save.warpEpochsV165;
      if (order === choice) {
        assert.equal(warp.actWarpVillageV165(state, elite, other).accepted, false);
        state = ok(warp.returnFromWarpV165(state));
        assert.equal(warp.actWarpVillageV165(state, elite, afterward).accepted, false);
        state = ok(warp.departWarpV165(state, full));
      }
    }
    assert.deepEqual(warp.branchVisitV165(state, "W-02").r2M048, { orders, advancedBranchResolved: true });
    assert.equal(warp.actWarpVillageV165(state, elite, "record-trace").changed, false);
    const completed = ok(warp.returnFromWarpV165(state));
    const { r2M048, ...mainVisit } = warp.branchVisitV165(completed, "W-02");
    assert.equal(r2M048.advancedBranchResolved, true);
    assert.deepEqual(mainVisit, { ...warp.emptyBranchVisitV165(), visits: 2 });
    assert.deepEqual(completed.echoes, []);
    const out = parseSaveImport(exportSave({ ...elite, warpEpochsV165: completed }));
    assert.equal(out.failure, null);
    assert.deepEqual(out.save.warpEpochsV165.branchVisitState["W-02"].r2M048, r2M048);
    assert.deepEqual(out.save.trophies, elite.trophies);
    assert.equal(out.save.profile.honor, elite.profile.honor);
    for (const alter of [
      bad => { bad.branchVisitState["W-02"].r2M048.orders[1] = "record-trace"; },
      bad => { bad.branchVisitState["W-02"].r2M048.advancedBranchResolved = false; },
      bad => { bad.consumedEventIds = bad.consumedEventIds.filter(id => !id.startsWith("W-02:R2-M048:")); },
      bad => { bad.branchVisitState["W-01"] = bad.branchVisitState["W-02"]; },
    ]) {
      const bad = structuredClone(completed);
      alter(bad);
      assert.equal(warp.inspectWarpEpochsV165(bad, owner).status, "invalid-save");
    }
  }
});
