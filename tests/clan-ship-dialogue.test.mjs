import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { qa, ops, saves, fixture, completeInterior, aboard, recruit, refit, residenceAct, gathered, completed, clone, SHIP, OWNER } from './helpers/clan-ship-trophy-hearing-fixture.mjs';
const { clanShipDialogue: dialogue, CLAN_SHIP_DIALOGUE_TOPICS: topics, CLAN_SHIP_VOICES: voices } = qa.load('app/game/systems/clanShipDialogue.ts');
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const hearing = qa.load('app/game/systems/clanShipTrophyHearing.ts');
const base = ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route'].reduce(completeInterior, fixture({ evidence: false, ruins: false }));
const at = (save, id) => aboard(save, hearing.clanShipTrophyWitnessPost(save, id) ?? ops.CLAN_SHIP_RECRUITS.find(n => n.id === id).roomId);
const ask = (save, id, topic = 'greeting', active = true) => { const located = at(save, id); return dialogue(located, id, located.clanShipDocking.roomId, topic, active); };
function act(save, command, roomId = 'conseil') {
  save = aboard(save, roomId);
  const result = ops.actClanShipOperations(save.clanShipOperations, { ...command, expectedRevision: save.clanShipOperations.revision }, {
    ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking,
  });
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipOperations: result.state, profile: { ...save.profile, clanMarks: save.profile.clanMarks + result.clanMarksReward } };
}
function encounter(commands) {
  let save = act(clone(base), { type: 'accept-contract', contractId: 'space-screening' });
  for (const type of commands) {
    if (save.clanShipOperations.spaceEncounter.status !== 'active') break;
    save = act(save, { type: 'space-command', command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  }
  return save;
}
const won = encounter(['scan', 'manoeuvre', 'brace', 'brace', 'extract']);
const withdrawn = encounter(['withdraw']);
const lost = encounter(Array(16).fill('brace'));

test('all twelve contracts retain the exact baseline mechanics, rewards, rooms, identities and recruitment gates', () => {
  const frozen = JSON.parse(fs.readFileSync('tests/fixtures/clan-quest-mechanics-19317af4.json', 'utf8'));
  assert.equal(ops.CLAN_SHIP_OPERATIONS_VERSION, frozen.version);
  assert.deepEqual(ops.CLAN_SHIP_CONTRACTS.map(value => ({ ...without(value, ['name', 'summary', 'briefing', 'steps']), steps: value.steps.map(step => without(step, ['label', 'description'])) })), frozen.contracts);
  assert.deepEqual(ops.CLAN_SHIP_ONBOARDING_STEPS.map(step => without(step, ['label', 'description'])), frozen.onboarding);
  assert.deepEqual(ops.CLAN_SHIP_RECRUITS.map(value => without(value, ['summary', 'joinLine'])), frozen.recruits);
});
test('six original voices have complete, distinct responses without production IDs or a universal canon claim', () => {
  assert.equal(Object.keys(voices).length, 6); assert.equal(topics.length, 4);
  for (const key of ['greeting', 'work', 'invitation', 'agreement', 'noReport', 'victory', 'defeat', 'withdrawn']) {
    const lines = Object.values(voices).map(v => v[key]); assert.equal(new Set(lines).size, 6, key);
    for (const line of lines) {
      assert.ok(line.length > 35 && line.length < 330);
      assert.doesNotMatch(line, /OPS-|expectedRevision|runtime|workflow|commit|[0-9]+ points|tous les Yautja/i);
    }
  }
});
test('each earned interview uses its actual post without granting personal recruitment', () => {
  for (const npc of ops.CLAN_SHIP_RECRUITS) {
    const save = at(clone(base), npc.id), bytes = JSON.stringify(save);
    const view = dialogue(save, npc.id, save.clanShipDocking.roomId);
    assert.equal(view.present, true, npc.id); assert.equal(view.phase, 'greeting'); assert.equal(view.line, voices[npc.id].greeting);
    assert.equal(JSON.stringify(save), bytes); assert.equal(save.clanShipOperations.recruitedNpcIds.length, 0);
  }
});
test('unearned contacts stay silent instead of becoming automatic occupants', () => {
  const save = aboard(saves.defaultSave(OWNER), 'armurerie');
  assert.equal(dialogue(save, 'iron-claw', 'armurerie').line, null);
  const missing = fixture({ evidence: false, veteran: false, ruins: false });
  assert.equal(ask(missing, 'ash-scar').present, false);
});
test('wrong room, wrong hull context, owner mismatch and suspension cannot produce speech', () => {
  const save = at(clone(base), 'iron-claw');
  assert.equal(dialogue(save, 'iron-claw', 'archives').line, null);
  assert.equal(dialogue(save, 'iron-claw', 'armurerie', 'greeting', false).line, null);
  for (const change of [{ status: 'docked' }, { ownerCreatedAt: 'other' }, { roomId: 'hangar' }]) {
    const foreign = { ...save, clanShipDocking: { ...save.clanShipDocking, ...change } };
    assert.equal(dialogue(foreign, 'iron-claw', 'armurerie').present, false);
  }
});
test('unknown character and topic fail closed', () => {
  assert.equal(dialogue(base, 'invented', 'conseil'), null);
  assert.equal(dialogue(base, 'iron-claw', 'conseil', '__proto__'), null);
});
test('foreign or future campaign records are neither rewritten nor voiced', () => {
  for (const [field, value] of [
    ['clanShipOperations', { ...base.clanShipOperations, version: 999 }],
    ['clanShipOperations', { ...base.clanShipOperations, ownerCreatedAt: 'other' }],
    ['companionResidence', { version: 999 }], ['clanShipTrophyHearing', { version: 999 }],
    ['companionResidence', {}], ['clanShipTrophyHearing', {}],
  ]) {
    const save = aboard({ ...clone(base), [field]: value }, 'armurerie'), before = JSON.stringify(save);
    assert.equal(dialogue(save, 'iron-claw', 'armurerie').line, null, field);
    assert.equal(JSON.stringify(save), before);
  }
});
test('an invitation does not recruit, allocate a cabin or spend marks', () => {
  const save = at(clone(base), 'iron-claw'), before = JSON.stringify(save);
  const view = dialogue(save, 'iron-claw', 'armurerie', 'agreement');
  assert.equal(view.phase, 'invitation'); assert.equal(view.detail, 'Propose-lui de rejoindre ton cercle.');
  assert.equal(JSON.stringify(save), before);
});
test('a newly recruited contact in reserve cannot keep speaking from the former post', () => {
  const save = recruit(clone(base), 'iron-claw');
  assert.equal(ask(save, 'iron-claw', 'agreement').present, false);
  assert.equal(save.companionResidence.members.find(m => m.id === 'iron-claw').assignment, null);
});
test('after a confirmed refit, the same agreement is spoken at the real new room only', () => {
  const save = refit(recruit(clone(base), 'iron-claw'), 'iron-claw');
  const room = hearing.clanShipTrophyWitnessPost(save, 'iron-claw'); assert.ok(room); assert.notEqual(room, 'armurerie');
  assert.equal(dialogue(aboard(save, room), 'iron-claw', room, 'agreement').phase, 'agreement');
  assert.equal(dialogue(aboard(save, 'armurerie'), 'iron-claw', 'armurerie').line, null);
});
test('suspended or transferred residents do not leave a ghost conversation behind', () => {
  const managed = refit(recruit(clone(base), 'iron-claw'), 'iron-claw');
  const cases = [residenceAct(managed, { type: 'suspend', id: 'iron-claw' }, 'hangar'),
    refit(managed, 'iron-claw', { kind: 'personal', shipId: SHIP })];
  for (const save of cases) for (const room of ['conseil', 'hangar', 'armurerie', 'soins', 'entrainement', 'trophees', 'archives'])
    assert.equal(dialogue(aboard(save, room), 'iron-claw', room).line, null);
});
test('C37 gathering moves the conversation with both actual actors, without giving evidence', () => {
  const save = gathered(), before = JSON.stringify(save);
  for (const id of ['ash-scar', 'cold-trace']) {
    const view = dialogue(aboard(save, 'trophees'), id, 'trophees', 'agreement');
    assert.equal(view.phase, 'hearing'); assert.match(view.detail, /C-37/);
    assert.equal(ask(save, id).line, null, 'old post stays silent');
  }
  assert.equal(JSON.stringify(save), before); assert.equal(save.clanShipTrophyHearing.events.length, 2);
});
test('C37 completion restores ordinary conversations at the real posts without duplicate marks', () => {
  const save = completed(), marks = save.profile.clanMarks;
  for (const id of ['ash-scar', 'cold-trace']) assert.equal(ask(save, id).phase, 'greeting');
  assert.equal(save.profile.clanMarks, marks);
});
test('no-result responses do not manufacture a successful or failed encounter', () => {
  for (const npc of ops.CLAN_SHIP_RECRUITS) assert.equal(ask(base, npc.id, 'return').phase, 'no-report');
  const active = encounter(['scan']);
  assert.equal(ask(active, 'iron-claw', 'return').phase, 'no-report');
});
test('actual victory, defeat and withdrawal produce different reactions for all six contacts', () => {
  for (const [save, result] of [[won, 'victory'], [lost, 'defeat'], [withdrawn, 'withdrawn']]) {
    assert.equal(save.clanShipOperations.spaceEncounter.status, result);
    assert.equal(ops.inspectClanShipOperations(save.clanShipOperations, save.createdAt).status, 'valid');
    for (const npc of ops.CLAN_SHIP_RECRUITS) {
      const view = ask(save, npc.id, 'return'); assert.equal(view.phase, `return-${result}`, npc.id);
      assert.match(view.detail, /spatial/); assert.notEqual(view.line, voices[npc.id].noReport);
    }
  }
});
test('an archived successful encounter is still remembered after accepting another operation', () => {
  const save = act(won, { type: 'accept-contract', contractId: 'space-interception' });
  assert.equal(save.clanShipOperations.spaceEncounter.status, 'active');
  assert.equal(ask(save, 'iron-claw', 'return').phase, 'return-victory');
  assert.match(ask(save, 'iron-claw', 'work').detail, /L’interception mesurée/);
});
test('reloading preserves the same context and does not add a dialogue save format', () => {
  const before = at(won, 'iron-claw'), imported = saves.parseSaveImport(saves.exportSave(before));
  assert.equal(imported.failure, null); assert.ok(imported.save);
  for (const { id } of topics) assert.deepEqual(dialogue(imported.save, 'iron-claw', 'armurerie', id), dialogue(before, 'iron-claw', 'armurerie', id));
  assert.equal(Object.keys(imported.save).some(k => /dialogue/i.test(k)), false);
});
test('SSR renders the actual conversation and four accessible topic controls, but no recruitment command', () => {
  const save = at(base, 'iron-claw');
  const html = qa.render('app/game/ClanShipCrewDialogue.tsx', { save, npcId: 'iron-claw', roomId: 'armurerie', suspended: false });
  assert.match(html, /data-clan-dialogue="iron-claw"/); assert.match(html, /aria-live="polite"/);
  assert.equal((html.match(/data-clan-dialogue-topic=/g) ?? []).length, 4);
  assert.doesNotMatch(html, /data-clan-recruit-action/);
});
test('SSR has no conversation for absent, wrong-room, foreign or future contacts', () => {
  const located = at(base, 'iron-claw');
  for (const [save, roomId] of [[located, 'archives'], [at(recruit(base, 'iron-claw'), 'iron-claw'), 'armurerie'],
    [{ ...located, clanShipOperations: { ...located.clanShipOperations, version: 999 } }, 'armurerie'],
    [{ ...located, clanShipDocking: { ...located.clanShipDocking, ownerCreatedAt: 'other' } }, 'armurerie']]) {
    for (const suspended of [false, true]) {
      assert.equal(qa.render('app/game/ClanShipCrewDialogue.tsx', { save, npcId: 'iron-claw', roomId, suspended }), '');
    }
  }
});
test('SSR retains a paused interview subtree hidden, inert and non-announcing with all four topics disabled', () => {
  const save = at(base, 'iron-claw'), before = JSON.stringify(save);
  const html = qa.render('app/game/ClanShipCrewDialogue.tsx', { save, npcId: 'iron-claw', roomId: 'armurerie', suspended: true });
  const root = html.match(/<section[^>]*data-clan-dialogue="iron-claw"[^>]*>/)?.[0];
  assert.ok(root); assert.match(root, /hidden=""/); assert.match(root, /inert=""/);
  const buttons = html.match(/<button[^>]*data-clan-dialogue-topic="[^"]+"[^>]*>/g) ?? [];
  assert.equal(buttons.length, 4); assert.ok(buttons.every(button => /disabled=""/.test(button)));
  assert.match(html, /data-clan-hunt-conversation="iron-claw"/);
  assert.match(html, /aria-live="off"/); assert.doesNotMatch(html, /aria-live="polite"/);
  assert.equal(JSON.stringify(save), before);
});
test('SSR integrates the dialogue into the native operations panel and counts agreements, not assigned bodies', () => {
  const save = at(base, 'iron-claw');
  const html = qa.render('app/game/ClanShipOperationsPanel.tsx', { save, state: save.clanShipOperations, roomId: 'armurerie', suspended: false,
    crewFocus: 'iron-claw', onAction: () => { throw Error('Rendering must not act'); }, onClose() {}, onNavigate() {}, onClanWar() {} });
  assert.match(html, /data-clan-dialogue="iron-claw"/); assert.match(html, /accords conclus/);
  assert.doesNotMatch(html, /membres affectés/); assert.equal((html.match(/data-clan-dialogue=/g) ?? []).length, 1);
});
test('reading every topic repeatedly is a pure observation, including every operation outcome', () => {
  for (const scenario of [base, won, lost, withdrawn]) {
    const save = at(scenario, 'iron-claw'), bytes = JSON.stringify(save);
    for (let round = 0; round < 8; round++) for (const { id } of topics) dialogue(save, 'iron-claw', 'armurerie', id);
    assert.equal(JSON.stringify(save), bytes);
  }
});
