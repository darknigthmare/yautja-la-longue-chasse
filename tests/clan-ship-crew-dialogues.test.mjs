import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const dialogue = qa.load('app/game/clanShipCrewDialogues.ts');
const incidents = qa.load('app/game/systems/clanShipIncidents.ts');
const operations = qa.load('app/game/systems/clanShipOperations.ts');
const OWNER = '2026-11-05T10:30:00.000Z';

// Presentation inputs only. The campaign reducer and save boundary separately
// validate prerequisite receipts; a conversation cannot grant one.
function presenting(id, index = 0) {
  const definition = incidents.clanShipIncident(id);
  return { ...incidents.createClanShipIncidents(OWNER), revision: index + 1,
    activeIncident: { incidentId: id, acceptedRevision: 1, stepIndex: index,
      choices: definition.steps.slice(0, index).filter(step => step.kind === 'choice').map(step => ({ stepId: step.id, choiceId: step.correctChoiceId })),
      lastRejectedChoice: null } };
}
function completed(id) {
  const definition = incidents.clanShipIncident(id), revision = definition.steps.length + 1;
  return { ...incidents.createClanShipIncidents(OWNER), revision, completedIncidents: [{ incidentId: id, completedRevision: revision,
    proof: { stepIds: definition.steps.map(step => step.id), choices: definition.steps.filter(step => step.kind === 'choice').map(step => ({ stepId: step.id, choiceId: step.correctChoiceId })) } }] };
}

test('the six stationed recruits each own a base line and every contextual line refers to a real incident step', () => {
  assert.deepEqual(dialogue.CLAN_SHIP_CREW_DIALOGUES.map(npc => npc.id).sort(), [...operations.CLAN_SHIP_NPC_IDS].sort());
  const ids = new Set();
  for (const npc of dialogue.CLAN_SHIP_CREW_DIALOGUES) {
    assert.ok(npc.fallback.trim().length > 20);
    assert.equal(dialogue.selectClanShipCrewDialogue(npc.id, null).id, `${npc.id}-daily`);
    for (const line of npc.lines) {
      assert.ok(!ids.has(line.id)); ids.add(line.id);
      const condition = line.when;
      assert.equal(Number(Boolean(condition.activeIncidentId)) + Number(Boolean(condition.completedIncidentId)), 1);
      const definition = incidents.clanShipIncident(condition.activeIncidentId ?? condition.completedIncidentId);
      assert.ok(definition);
      assert.ok(line.text.trim().length > 20 && Number.isFinite(line.priority));
      for (const stepId of condition.currentStepIds ?? []) assert.ok(definition.steps.some(step => step.id === stepId), `${line.id}: missing ${stepId}`);
    }
  }
  assert.equal(ids.size, 30);
});

test('all thirty contextual lines are reachable without an impossible phase or a shadowed branch', () => {
  const observed = new Set();
  const expected = dialogue.CLAN_SHIP_CREW_DIALOGUES.flatMap(npc => npc.lines.map(line => line.id));
  for (const definition of incidents.CLAN_SHIP_INCIDENTS) {
    for (const index of definition.steps.keys()) for (const npc of dialogue.CLAN_SHIP_CREW_DIALOGUES) {
      observed.add(dialogue.selectClanShipCrewDialogue(npc.id, presenting(definition.id, index)).id);
    }
    for (const npc of dialogue.CLAN_SHIP_CREW_DIALOGUES) observed.add(dialogue.selectClanShipCrewDialogue(npc.id, completed(definition.id)).id);
  }
  assert.deepEqual(expected.filter(id => !observed.has(id)), []);
});

test('an ongoing transfer takes priority over an older repair or trophy conclusion', () => {
  const source = presenting('return-transfer', 3);
  source.completedIncidents = [...completed('relay-flicker').completedIncidents, ...completed('trophy-provenance').completedIncidents];
  assert.equal(dialogue.selectClanShipCrewDialogue('ash-scar', source).id, 'ash-return-active');
  assert.equal(dialogue.selectClanShipCrewDialogue('black-suture', source).id, 'suture-return-escort');
  source.activeIncident.stepIndex = 6;
  assert.equal(dialogue.selectClanShipCrewDialogue('star-watch', source).id, 'star-return-report');
});

test('consulting and replaying a crew line never mutates evidence, rewards or the dialogue catalogue', () => {
  const source = presenting('relay-flicker', 4), before = structuredClone(source);
  const catalogue = structuredClone(dialogue.CLAN_SHIP_CREW_DIALOGUES);
  for (let index = 0; index < 20; index++) for (const npc of dialogue.CLAN_SHIP_CREW_DIALOGUES) dialogue.selectClanShipCrewDialogue(npc.id, source);
  assert.deepEqual(source, before);
  assert.deepEqual(dialogue.CLAN_SHIP_CREW_DIALOGUES, catalogue);
  assert.equal(source.completedIncidents.length, 0);
});
