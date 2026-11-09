import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { qa, ops, saves, aboard, recruit, refit, residenceAct, gathered, completed, clone, SHIP, OWNER } from './helpers/clan-ship-trophy-hearing-fixture.mjs';
import { huntDialogueFixture, cradleDialogueFixture } from './helpers/clan-ship-hunt-dialogue-fixture.mjs';
const { clanShipHuntDialogue: dialogue, CLAN_FIELD_STORIES: field, CLAN_CRADLE_STORIES: queen } = qa.load('app/game/systems/clanShipHuntDialogue.ts');
const hearing = qa.load('app/game/systems/clanShipTrophyHearing.ts');
const residence = qa.load('app/game/systems/companionResidence.ts');
const base = huntDialogueFixture();
const at = (save, id) => aboard(save, hearing.clanShipTrophyWitnessPost(save, id) ?? ops.CLAN_SHIP_RECRUITS.find(n => n.id === id).roomId);
const ask = (save, id, selected = null, active = true) => { const located = at(save, id); return dialogue(located, id, located.clanShipDocking.roomId, selected, active); };
const publicReturns = Object.fromEntries(['retreat', 'victory', 'crown'].map(outcome => [outcome, cradleDialogueFixture(base, outcome)]));

test('four field and three Cradle situations have 42 original, distinct, bounded lines', () => {
  const lines = [...Object.values(field), ...Object.values(queen)].flatMap(voices => {
    assert.deepEqual(Object.keys(voices).sort(), ops.CLAN_SHIP_RECRUITS.map(n => n.id).sort());
    return Object.values(voices);
  });
  assert.equal(lines.length, 42); assert.equal(new Set(lines).size, 42);
  for (const line of lines) {
    assert(line.length >= 50 && line.length < 330);
    assert.doesNotMatch(line, /OPS-|workflow|expectedRevision|runtime|commit|tous les Yautja|[0-9]+ points|protocole|calibration/i);
  }
});
for (const id of Object.keys(field)) test(`six contacts discuss the actual archived field proof: ${id}`, () => {
  for (const npc of ops.CLAN_SHIP_RECRUITS) {
    const view = ask(base, npc.id, id), receipt = base.clanShipOperations.completedContracts.find(r => r.contractId === id);
    assert.equal(view.status, 'ready'); assert.equal(view.options.length, 4);
    assert.equal(view.selected.line, field[id][npc.id]);
    assert.deepEqual(view.selected.source, { kind: 'field', missionId: receipt.proof.missionId, encounterRun: receipt.proof.encounterRun,
      completedAt: receipt.proof.completedAt, revision: receipt.completedRevision });
    assert.match(view.selected.detail, /pas nécessairement ta dernière sortie/);
  }
});
for (const [outcome, expected] of [['retreat','retreated'], ['victory','victory-without-crown'], ['crown','crown-returned']]) {
  test(`six contacts distinguish the shared Cradle outcome: ${expected}`, () => {
    for (const npc of ops.CLAN_SHIP_RECRUITS) {
      const view = ask(publicReturns[outcome], npc.id, 'buried-cradle');
      assert.equal(view.options.length, 5); assert.equal(view.selected.source.kind, 'cradle');
      assert.equal(view.selected.source.outcome, expected); assert.equal(view.selected.line, queen[expected][npc.id]);
    }
  });
  test(`private workshop analysis stays private: ${expected}`, () => {
    const save = cradleDialogueFixture(base, outcome, 'analyze-workshop'), bytes = JSON.stringify(save);
    for (const npc of ops.CLAN_SHIP_RECRUITS) {
      const view = ask(save, npc.id, 'buried-cradle');
      assert.equal(view.selected, null); assert.equal(view.status, 'unavailable'); assert.equal(view.options.length, 4);
      assert(!view.options.some(option => option.id === 'buried-cradle'));
    }
    assert.equal(JSON.stringify(save), bytes);
  });
}
test('an extraction without the actual clan presentation does not unlock a queen story', () => {
  const save = cradleDialogueFixture(base, 'crown', null);
  assert.equal(save.buriedCradle.status, 'extracted');
  assert.equal(ask(save, 'iron-claw', 'buried-cradle').selected, null);
});
test('legacy reported dossiers lacking a disclosure choice are not retrospectively published', () => {
  for (const value of [undefined, null]) {
    const save = clone(publicReturns.crown);
    if (value === undefined) delete save.buriedCradle.returnVisit; else save.buriedCradle.returnVisit = value;
    assert.equal(ask(save, 'iron-claw', 'buried-cradle').selected, null);
  }
});
test('invalid, future and foreign queen records cannot add a story while field records remain available', () => {
  for (const mutation of [s => { s.version = 9; }, s => { s.ownerCreatedAt = 'other'; },
    s => { s.crownDelivered = false; }, s => { s.outcome = 'unresolved'; },
    s => { s.returnVisit.events.reverse(); }, s => { s.returnVisit.version = 9; }]) {
    const save = clone(publicReturns.crown); mutation(save.buriedCradle);
    const view = ask(save, 'iron-claw', 'buried-cradle'); assert.equal(view.selected, null); assert.equal(view.options.length, 4);
  }
});
test('wrong room, invalid hull, future docking, foreign owner and suspension remain silent', () => {
  const save = at(base, 'iron-claw');
  for (const patch of [{ roomId: 'hangar' }, { ownerCreatedAt: 'other' }, { version: 99 }, { personalShipId: 'invented' }, { status: 'docked' }])
    assert.equal(dialogue({ ...save, clanShipDocking: { ...save.clanShipDocking, ...patch } }, 'iron-claw', 'armurerie'), null);
  assert.equal(dialogue(save, 'iron-claw', 'archives'), null);
  assert.equal(dialogue(save, 'iron-claw', 'armurerie', null, false), null);
  assert.equal(dialogue(save, '__proto__', 'armurerie'), null);
});
test('future/foreign records and missing earned contacts cannot become remote speech', () => {
  for (const patch of [{ clanShipOperations: { ...base.clanShipOperations, version: 9 } },
    { clanShipOperations: { ...base.clanShipOperations, ownerCreatedAt: 'other' } },
    { companionResidence: { version: 9 } }, { clanShipTrophyHearing: { version: 9 } }])
    assert.equal(ask({ ...base, ...patch }, 'iron-claw'), null);
  assert.equal(dialogue(aboard(saves.defaultSave(OWNER),'armurerie'), 'iron-claw', 'armurerie'), null);
});
test('reserve, transfer, suspension and refit use the same real actor presence', () => {
  const reserved = recruit(clone(base), 'iron-claw'); assert.equal(ask(reserved, 'iron-claw'), null);
  const housed = refit(reserved, 'iron-claw'); assert.equal(ask(housed, 'iron-claw').status, 'ready');
  assert.equal(dialogue(aboard(housed,'armurerie'), 'iron-claw', 'armurerie'), null);
  for (const save of [residenceAct(housed,{type:'suspend',id:'iron-claw'},'hangar'), refit(housed,'iron-claw',{kind:'personal',shipId:SHIP})])
    assert.equal(ask(save,'iron-claw'), null);
});
test('C37 hearing stays the only conversation for gathered witnesses, and closure restores field talk', () => {
  const save = gathered();
  for (const id of ['ash-scar','cold-trace']) assert.equal(dialogue(aboard(save,'trophees'),id,'trophees'),null);
  for (const id of ['ash-scar','cold-trace']) assert.equal(ask(completed(),id).status,'ready');
});
test('contradictory mission counters refuse interpretation rather than infer a win', () => {
  for (const patch of [{ status:'locked' },{ attempts:0 },{ completions:0 }]) {
    const save=clone(base); Object.assign(save.missionProgress['jungle-vey'],patch);
    assert.equal(ask(save,'iron-claw').status,'inconsistent'); assert.equal(ask(save,'iron-claw').options.length,0);
  }
});
test('an unknown, removed, or non-field selection never silently selects a different victory', () => {
  for(const id of ['invented','__proto__','space-screening',false,{}]) {
    const view=ask(base,'iron-claw',id);assert.equal(view.selected,null);assert.equal(view.status,'unavailable');
  }
  const save=clone(base);save.clanShipOperations.completedContracts=save.clanShipOperations.completedContracts.filter(r=>r.contractId!=='field-bad-blood');
  assert.equal(ops.inspectClanShipOperations(save.clanShipOperations, save.createdAt).status,'valid');
  assert.equal(ask(save,'iron-claw','field-bad-blood').selected,null);
});
test('newer failed attempts do not relabel a historical completed contract as the last hunt', () => {
  const before=ask(base,'iron-claw','field-jungle-survey').selected;
  const save=clone(base);save.missionProgress['jungle-vey'].attempts+=3;save.missionProgress['jungle-vey'].lastPlayedAt='2026-11-09T09:00:00.000Z';
  assert.deepEqual(ask(save,'iron-claw','field-jungle-survey').selected,before);
});
test('field stories follow receipt revisions, not rewritten clocks or aggregate trophy counts', () => {
  const save=clone(base);const receipt=save.clanShipOperations.completedContracts.find(r=>r.contractId==='field-jungle-survey');
  receipt.proof.completedAt='2030-01-01T00:00:00.000Z';save.trophies=[];
  assert.equal(ask(save,'iron-claw').selected.id,'field-bad-blood');
});
test('no contract receipts means no inferred story from old trophies, rank or scores', () => {
  const save=clone(base); save.clanShipOperations.completedContracts=save.clanShipOperations.completedContracts.filter(r=>r.proof.kind!=='field');
  const view=ask(save,'iron-claw');assert.equal(view.status,'empty');assert.equal(view.options.length,0);
});
test('portable save round trip preserves all selected reports and does not create a new dialogue ledger', () => {
  const before=at(publicReturns.crown,'iron-claw'), parsed=saves.parseSaveImport(saves.exportSave(before));
  assert(parsed.save,parsed.failure);
  for(const id of [...Object.keys(field),'buried-cradle'])assert.deepEqual(ask(parsed.save,'iron-claw',id),ask(before,'iron-claw',id));
  assert.equal(Object.keys(parsed.save).some(k=>/dialogue/i.test(k)),false);
});
test('repeated views cannot pay, recruit, heal, disclose private returns or change equipment', () => {
  const save=at(publicReturns.crown,'iron-claw'), bytes=JSON.stringify(save);
  for(let round=0;round<30;round++)for(const id of [...Object.keys(field),'buried-cradle'])dialogue(save,'iron-claw','armurerie',id);
  assert.equal(JSON.stringify(save),bytes);
});
test('native parent keeps four original topics and adds one closed, accessible disclosure control', () => {
  const html=qa.render('app/game/ClanShipCrewDialogue.tsx',{save:at(base,'iron-claw'),npcId:'iron-claw',roomId:'armurerie',suspended:false});
  assert.equal((html.match(/data-clan-dialogue-topic=/g)??[]).length,4);
  assert.equal((html.match(/data-clan-hunt-toggle=/g)??[]).length,1);
  assert.match(html,/aria-expanded="false"/);assert.match(html,/aria-controls="[^"]+"/);
  assert.match(html,/hidden="" aria-label="Chasses évoquées/);
  assert.doesNotMatch(html,/data-clan-hunt-report=|data-clan-hunt-line=/);
});
test('absent, wrong-room, foreign and future contacts render no story controller', () => {
  const located=at(base,'iron-claw');
  for (const [save,roomId] of [[located,'archives'],
    [{...located,clanShipDocking:{...located.clanShipDocking,ownerCreatedAt:'other'}},'armurerie'],
    [{...located,clanShipDocking:{...located.clanShipDocking,version:999}},'armurerie']])
    for(const suspended of [false,true])assert.equal(qa.render('app/game/ClanShipHuntConversation.tsx',{save,npcId:'iron-claw',roomId,suspended}),'');
});
test('SSR retains a paused story controller hidden and inert without an enabled toggle or live speech', () => {
  const save=at(base,'iron-claw'),before=JSON.stringify(save);
  const html=qa.render('app/game/ClanShipHuntConversation.tsx',{save,npcId:'iron-claw',roomId:'armurerie',suspended:true});
  const root=html.match(/<div[^>]*data-clan-hunt-conversation="iron-claw"[^>]*>/)?.[0];
  assert.ok(root);assert.match(root,/hidden=""/);assert.match(root,/inert=""/);assert.match(root,/aria-live="off"/);
  const toggle=html.match(/<button[^>]*data-clan-hunt-toggle[^>]*>/)?.[0];
  assert.ok(toggle);assert.match(toggle,/disabled=""/);assert.match(toggle,/aria-expanded="false"/);
  assert.doesNotMatch(html,/aria-live="polite"|data-clan-hunt-report=|data-clan-hunt-line=/);
  assert.equal(JSON.stringify(save),before);
});
test('four recruitment rewrites preserve every non-prose value, branch, location, and numeric threshold', () => {
  const frozen=JSON.parse(fs.readFileSync('tests/fixtures/companion-recruitment-mechanics-19317af4.json','utf8'));
  const omit=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
  const mechanics=residence.COMPANION_RECRUITMENT.map(d=>({...omit(d,['briefing','consent','steps']),steps:d.steps.map(s=>({...omit(s,['description','choices']),choices:s.choices.map(c=>omit(c,['response']))}))}));
  assert.deepEqual(mechanics,frozen);
  assert.equal(residence.COMPANION_RESIDENCE_VERSION,1);
});
test('recruitment speakers do not recite scores, production identifiers, or universal racial commandments', () => {
  for(const d of residence.COMPANION_RECRUITMENT)for(const text of [d.briefing,d.consent,...d.steps.flatMap(s=>[s.description,...s.choices.map(c=>c.response)])])
    assert.doesNotMatch(text,/\bscore\b|\bpoints\b|OPS-|workflow|runtime|protocole|calibration|tous les Yautja/i);
  const panel=fs.readFileSync('app/game/CompanionResidencePanel.tsx','utf8');
  assert.match(panel,/definition.minimumScans/);assert.match(panel,/definition.minimumScore/);
});
