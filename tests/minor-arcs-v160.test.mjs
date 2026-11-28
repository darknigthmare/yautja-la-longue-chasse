import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { homeworldInteriorPointFixture } from './helpers/homeworld-interior-point-fixture.mjs';
import { createRequire } from 'node:module';
const requirePackage = createRequire(new URL('../package.json', import.meta.url));
const React = requirePackage('react');
const { renderToStaticMarkup } = requirePackage('react-dom/server');

// Graphe TypeScript réel du projet ; aucune fonction de sauvegarde, de contrat
// ou de mini-arc n'est simulée. Les événements de terrain sont des fixtures de
// modèle (mêmes que les suites V69), revalidées par le validateur physique V68.
const source = homeworldSceneSsrV78();
const arcs = source.load('app/game/systems/minorArcsV160.ts');
const saveApi = source.load('app/game/save.ts');
const interiors = source.load('app/game/systems/homeworldInteriorsV64.ts');
const regions = source.load('app/game/systems/homeworldRegionsV68.ts');

const owner = '2026-11-06T09:00:00.000Z';
function bloodedSave() {
  const save = saveApi.defaultSave(owner);
  save.profile.rankId = 'blooded';
  save.profile.acquiredRankIdV166 = 'blooded';
  save.profile.honor = saveApi.RANK_THRESHOLDS.blooded + 50;
  // Chasses 1 et 2 réussies : la chaîne normalisée ouvre alors Cinder-12.
  for (const id of ['jungle-vey', 'ice-cryostalker']) save.missionProgress[id] = { ...save.missionProgress[id], status: 'completed', completions: 1 };
  save.missionProgress['volcano-bad-blood'] = { ...save.missionProgress['volcano-bad-blood'], status: 'available' };
  return save;
}
const where = stageId => {
  const giver = arcs.minorArcStageV160(stageId).giver, room = interiors.homeworldInteriorForBuildingV64(giver.buildingId);
  return { interiorId: room.buildingId, pointId: giver.pointId, npcId: giver.npcId, actor: homeworldInteriorPointFixture(interiors, room, giver.pointId) };
};
const act = (save, stageId, kind = 'accept', context = where(stageId)) => arcs.applyMinorArcV160(save, { kind, stageId }, context);
const event = (regionId, action, runId, tick = 1500) => ({ version: 1, regionId, action, runId, tick, walked: 2300, trailCount: 3, evaded: 2, armed: false, observedTicks: 90, touches: 3, interventions: 2,
  actor: action === 'report' ? { x: regions.HOMEWORLD_REGIONS_V68[regionId].residents[0].x, y: regions.HOMEWORLD_REGIONS_V68[regionId].residents[0].y + 45 } : { x: 7450, y: 2050 },
  siteId: `${regionId}-${action === 'report' ? 'guide' : action}`, targetId: `${regionId}-${action === 'report' ? 'guide' : 'fauna'}` });
function fieldStep(state, regionId, run) {
  state = arcs.bindMinorArcsRunV160(state, owner, regionId, run).state;
  const proof = arcs.recordMinorArcsFieldEventV160(state, owner, event(regionId, 'track', run), { regionId, runId: run });
  assert.ok(proof.changed, regionId + ' track');
  const report = arcs.recordMinorArcsFieldEventV160(proof.state, owner, event(regionId, 'report', run, 1800), { regionId, runId: run });
  assert.ok(report.changed, regionId + ' report');
  return report.state;
}
const badBloodResult = (honored = true) => ({ missionId: 'volcano-bad-blood', difficultyId: 'hunter', outcome: 'success', score: 80, elapsedSeconds: 600,
  completedObjectiveIds: ['scan-fallen-hunters', 'recover-stolen-beacons', 'defeat-bad-blood', 'escape-self-destruct'],
  honorEvents: [{ id: 'honor-rule:stop-purge', label: 'Ne laisser aucune trace', value: honored ? 30 : -25, kind: honored ? 'objective' : 'violation' }],
  trophyQuality: 'blooded', kills: 3, scans: 3, secondWindUsed: false, completedAt: '2026-11-07T10:00:00.000Z' });

test('données : six étapes sourcées, missions proposées, seules LT-1 et SC-1 jouables', () => {
  assert.deepEqual(arcs.MINOR_ARC_STAGES_V160.map(stage => stage.id), ['LT-1', 'LT-2', 'LT-3', 'SC-1', 'SC-2', 'SC-3']);
  assert.ok(arcs.MINOR_ARC_STAGES_V160.every(stage => stage.missionStatus === 'proposé' && stage.bible.conduct && stage.bible.outcome));
  assert.deepEqual(arcs.MINOR_ARC_STAGES_V160.filter(stage => stage.implementation === 'jouable').map(stage => stage.id), ['LT-1', 'SC-1']);
  assert.deepEqual(arcs.MINOR_ARC_STAGES_V160.map(stage => stage.prerequisite), [null, 'LT-1', 'LT-2', null, 'SC-1', 'SC-2']);
  const status = id => arcs.MINOR_ARC_CHARACTERS_V160.find(item => item.id === id).status;
  for (const id of ['greyback', 'warrior', 'shaman', 'scout', 'guardian', 'boar', 'stalker', 'snake', 'viper']) assert.equal(status(id), 'canon', id);
  for (const id of ['ssikthar', 'vharnesh', 'nhalvesh', 'kyradhen', 'theska']) assert.equal(status(id), 'proposé', id);
  assert.equal(arcs.MINOR_ARC_CHARACTERS_V160.filter(item => item.faction === 'matriarches').length, 3);
});

test('conditions d’accès : Blooded, villages ouverts, prérequis, chasse ouverte', () => {
  const young = saveApi.defaultSave(owner);
  assert.equal(arcs.minorArcAccessV160(young, 'LT-1').allowed, false);
  assert.match(arcs.minorArcAccessV160(young, 'LT-1').reason, /Blooded/);
  const save = bloodedSave();
  assert.equal(arcs.minorArcAccessV160(save, 'LT-1').allowed, true);
  assert.equal(arcs.minorArcAccessV160(save, 'SC-1').allowed, true);
  assert.equal(arcs.minorArcAccessV160(save, 'LT-2').unlocked, false);
  assert.match(arcs.minorArcAccessV160(save, 'LT-2').reason, /LT-1/);
  const locked = bloodedSave(); locked.missionProgress['volcano-bad-blood'].status = 'locked';
  assert.match(arcs.minorArcAccessV160(locked, 'SC-1').reason, /Cinder-12/);
  assert.equal(act(young, 'LT-1').ok, false);
  const remote = act(save, 'LT-1', 'accept', { ...where('LT-1'), pointId: 'market-service' });
  assert.equal(remote.ok, false); assert.match(remote.message, /en personne/);
  assert.equal(act(save, 'LT-1', 'accept', where('SC-1')).ok, false, 'Scout ne se rencontre pas au Bastion');
  assert.equal(act(save, 'LT-2', 'accept', where('LT-1')).ok, false);
});

test('LT-1 de bout en bout : trois observations ordonnées, issue unique, LT-2 débloquée mais non implémentée', () => {
  const save = bloodedSave();
  let result = act(save, 'LT-1'); assert.ok(result.changed); save.minorArcsV160 = result.state;
  // Une sortie de la deuxième région avant la première confirmation ne compte pas.
  const early = arcs.bindMinorArcsRunV160(save.minorArcsV160, owner, 'storm-chain', 'early-run');
  assert.equal(early.changed, false);
  assert.equal(act(save, 'LT-1', 'deliver').ok, false);
  let state = save.minorArcsV160;
  state = fieldStep(state, 'pillar-jungle', 'run-a');
  state = fieldStep(state, 'storm-chain', 'run-b');
  state = fieldStep(state, 'cold-crown', 'run-c');
  save.minorArcsV160 = state;
  assert.equal(arcs.minorArcsJournalV160(save).arcs[0].views[0].phase, 'return');
  result = act(save, 'LT-1', 'deliver'); assert.ok(result.changed); save.minorArcsV160 = result.state;
  const entry = save.minorArcsV160.entries.find(item => item.stageId === 'LT-1');
  assert.equal(entry.status, 'completed'); assert.equal(entry.outcomeId, 'lost-tribe-listens');
  const again = act(save, 'LT-1', 'deliver');
  assert.equal(again.changed, false); assert.match(again.message, /pas enregistrée deux fois/);
  assert.equal(act(save, 'LT-1', 'accept').changed, false);
  const lt2 = arcs.minorArcAccessV160(save, 'LT-2');
  assert.equal(lt2.unlocked, true); assert.equal(lt2.allowed, false); assert.match(lt2.reason, /non implémentée/);
  assert.equal(arcs.minorArcsJournalV160(save).arcs[0].views[1].phase, 'not-implemented');
  assert.equal(act(save, 'LT-2', 'accept', where('LT-1')).ok, false);
  assert.equal(arcs.minorArcAccessV160(save, 'LT-3').unlocked, false);
});

test('SC-1 de bout en bout : seule une chasse réussie après l’accord et sans trace compte', () => {
  let save = bloodedSave();
  // Une réussite antérieure à l'accord ne remplit pas le contrat.
  save = saveApi.applyMissionResult(save, badBloodResult());
  assert.equal(save.minorArcsV160, undefined, 'champ non créé par une chasse');
  assert.equal(save.profile.rankId, 'blooded', 'la chasse conserve le rang acquis');
  const accepted = act(save, 'SC-1'); assert.ok(accepted.changed, accepted.message); save.minorArcsV160 = accepted.state;
  const violated = saveApi.applyMissionResult(save, badBloodResult(false));
  assert.equal(violated.minorArcsV160.entries[0].steps[0].proof, null);
  const other = saveApi.applyMissionResult(save, { ...badBloodResult(), missionId: 'jungle-vey' });
  assert.equal(other.minorArcsV160.entries[0].steps[0].proof, null);
  save = saveApi.applyMissionResult(save, badBloodResult());
  assert.equal(save.minorArcsV160.entries[0].steps[0].proof.honorRuleId, 'stop-purge');
  const delivered = act(save, 'SC-1', 'deliver'); assert.ok(delivered.changed); save.minorArcsV160 = delivered.state;
  assert.equal(save.minorArcsV160.entries[0].outcomeId, 'serpent-clan-judged');
  assert.equal(act(save, 'SC-1', 'deliver').changed, false);
  // Une nouvelle chasse ne réécrit pas l'issue enregistrée.
  const replay = saveApi.applyMissionResult(save, badBloodResult());
  assert.deepEqual(replay.minorArcsV160, save.minorArcsV160);
  assert.equal(arcs.minorArcAccessV160(save, 'SC-2').unlocked, true);
  assert.equal(arcs.minorArcAccessV160(save, 'SC-2').allowed, false);
});

test('abandon puis reprise : les preuves sont effacées', () => {
  const save = bloodedSave();
  save.minorArcsV160 = act(save, 'LT-1').state;
  save.minorArcsV160 = fieldStep(save.minorArcsV160, 'pillar-jungle', 'run-a');
  save.minorArcsV160 = act(save, 'LT-1', 'abandon').state;
  save.minorArcsV160 = act(save, 'LT-1', 'resume').state;
  assert.equal(save.minorArcsV160.entries[0].steps[0].proof, null);
});

test('sauvegarde : aller-retour, ancienne sauvegarde intacte, version future refusée', () => {
  const save = bloodedSave();
  save.minorArcsV160 = act(save, 'LT-1').state;
  save.minorArcsV160 = fieldStep(save.minorArcsV160, 'pillar-jungle', 'run-a');
  const normalized = saveApi.normalizeSave(JSON.parse(JSON.stringify(save)));
  assert.deepEqual(normalized.minorArcsV160, save.minorArcsV160);
  const imported = saveApi.parseSaveImport(JSON.stringify(save));
  assert.equal(imported.failure ?? null, null);
  assert.deepEqual(imported.save.minorArcsV160, save.minorArcsV160);

  const old = saveApi.defaultSave(owner);
  const oldNormalized = saveApi.normalizeSave(JSON.parse(JSON.stringify(old)));
  assert.equal('minorArcsV160' in oldNormalized, false, 'aucun champ ajouté à une ancienne sauvegarde');
  assert.equal('minorArcsV160' in saveApi.parseSaveImport(JSON.stringify(old)).save, false);

  const future = { ...save, minorArcsV160: { ...save.minorArcsV160, version: 2 } };
  assert.equal(saveApi.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
  assert.equal(arcs.inspectMinorArcsV160(future.minorArcsV160, owner).status, 'future');
  assert.equal(act(future, 'SC-1').ok, false, 'aucune écriture sur un registre futur');
  const foreign = { ...save, minorArcsV160: { ...save.minorArcsV160, ownerCreatedAt: '2020-01-01T00:00:00.000Z' } };
  assert.equal(saveApi.parseSaveImport(JSON.stringify(foreign)).failure, 'invalid-save');
  const forged = structuredClone(save.minorArcsV160); forged.entries[0].status = 'completed'; forged.entries[0].outcomeId = 'lost-tribe-listens'; forged.entries[0].completionSerial = 1;
  assert.equal(arcs.inspectMinorArcsV160(forged, owner).status, 'invalid', 'issue sans preuves refusée');
});

test('rendu SSR : panneaux au relais des quais et au Bastion, journal, rien ailleurs', () => {
  const save = bloodedSave();
  const dock = source.render('app/game/HomeworldMinorArcsV160.tsx', { save, npcId: 'dock-officer', disabled: false, onAction() {} });
  assert.match(dock, /data-minor-arcs-v160="lost-tribe"/);
  assert.match(dock, /data-minor-arc-stage="LT-1" data-minor-arc-phase="offer"/);
  assert.match(dock, /data-minor-arc-stage="LT-2" data-minor-arc-phase="locked"/);
  assert.match(dock, /data-minor-arc-action="accept"/);
  assert.match(dock, /mission proposée/);
  const bastion = source.render('app/game/HomeworldMinorArcsV160.tsx', { save, npcId: 'enforcer-captain', disabled: false, onAction() {} });
  assert.match(bastion, /data-minor-arcs-v160="serpent-clan"/);
  assert.match(bastion, /Ssik’thar \(proposé\)/);
  assert.equal(source.render('app/game/HomeworldMinorArcsV160.tsx', { save, npcId: 'market-artisan', disabled: false, onAction() {} }), '');
  const young = source.render('app/game/HomeworldMinorArcsV160.tsx', { save: saveApi.defaultSave(owner), npcId: 'dock-officer', disabled: false, onAction() {} });
  assert.doesNotMatch(young, /data-minor-arc-action/);
  const { HomeworldMinorArcsJournalV160 } = source.load('app/game/HomeworldMinorArcsV160.tsx');
  const journal = renderToStaticMarkup(React.createElement(HomeworldMinorArcsJournalV160, { save }));
  assert.match(journal, /data-minor-arc-journal-stage="LT-1" data-minor-arc-phase="offer"/);
  assert.match(journal, /data-minor-arc-journal-stage="SC-3" data-minor-arc-phase="locked"/);
});
