import test from 'node:test';
import assert from 'node:assert/strict';
import { qa, ops, saves, residence, fixture, aboard, clone, completeInterior,
  recruit, refit, residenceAct, gathered } from './helpers/clan-ship-trophy-hearing-fixture.mjs';

// Render the actual panel and actual selectors. SSR establishes content and
// action availability, not hydration, layout, keyboard or gamepad interaction.
const dialogue = qa.load('app/game/systems/clanShipCrewDialogue.ts');
const rooms = qa.load('app/game/systems/clanShipInterior.ts').CLAN_SHIP_INTERIOR_ROOMS;
const count = (html, attribute) => [...html.matchAll(new RegExp(`\\b${attribute}="`, 'g'))].length;
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#x27;');

function act(save, action, roomId = 'conseil') {
  const state = save.clanShipOperations ?? ops.createClanShipOperations(save.createdAt);
  const located = aboard(save, roomId);
  const result = ops.actClanShipOperations(state, { ...action, expectedRevision: state.revision }, {
    ownerCreatedAt: save.createdAt, campaign: located, docking: located.clanShipDocking,
    availableCrewIds: residence.availableClanResidenceCrew(located),
  });
  assert.equal(result.accepted, true, `${action.type}: ${result.message}`);
  return { ...located, clanShipOperations: result.state,
    profile: { ...located.profile, clanMarks: located.profile.clanMarks + result.clanMarksReward } };
}
function welcome() {
  let save = saves.defaultSave('2026-11-09T12:00:00.000Z');
  for (const step of ops.CLAN_SHIP_ONBOARDING_STEPS) save = act(save, { type: 'onboard-step', stepId: step.id }, step.roomId);
  return act(save, { type: 'accept-mandate' });
}
function allProofs() {
  let save = fixture({ evidence: false });
  for (const id of ['ship-seal-check', 'ship-armory-audit', 'ship-triage-route']) save = completeInterior(save, id);
  return save;
}
// Legacy campaign appointments remain at their original physical posts. Modern
// recruitment and its separate refit are covered below with the real bridge.
function legacyAgreements(save = allProofs()) {
  for (const npc of ops.CLAN_SHIP_RECRUITS) save = act(save, { type: 'recruit', npcId: npc.id }, npc.roomId);
  return save;
}
function escort(save) {
  save = act(save, { type: 'accept-contract', contractId: 'space-screening' });
  for (const type of ['scan', 'manoeuvre', 'brace', 'brace', 'extract']) {
    save = act(save, { type: 'space-command', command: { type, expectedTurn: save.clanShipOperations.spaceEncounter.turn } });
  }
  assert.equal(save.clanShipOperations.spaceEncounter.status, 'victory');
  return save;
}
function render(save, npcId, overrides = {}) {
  const npc = ops.clanShipRecruit(npcId);
  const roomId = overrides.roomId ?? npc.roomId;
  const located = aboard(save, roomId);
  const before = JSON.stringify(located);
  const calls = [];
  const html = qa.render('app/game/ClanShipOperationsPanel.tsx', {
    save: located, state: located.clanShipOperations, roomId, suspended: false, crewFocus: npcId,
    onAction: action => { calls.push(action); return false; }, onClose: () => calls.push('close'),
    onNavigate: target => calls.push(target), onClanWar: () => calls.push('war'), ...overrides,
  });
  assert.deepEqual(calls, [], 'reading the panel invokes no durable action or navigation');
  assert.equal(JSON.stringify(located), before, 'rendering preserves every campaign field');
  return { html, located };
}
function assertSpeech(save, npc, context) {
  const { html, located } = render(save, npc.id);
  const expected = dialogue.selectClanShipCrewDialogue(located, npc.id, { roomId: npc.roomId, focusedNpcId: npc.id });
  assert.equal(expected.context, context, `${npc.id}: earned context`);
  assert.equal(expected.status, 'spoken');
  assert.equal(count(html, 'data-clan-crew-dialogue'), 1, 'only the actual interlocutor speaks');
  assert.match(html, new RegExp(`data-clan-crew-dialogue="${npc.id}" data-clan-crew-dialogue-context="${context}"`));
  assert.ok(html.includes(`<blockquote id="clan-crew-dialogue-${npc.id}">${escape(expected.line)}</blockquote>`));
  for (const fact of expected.facts) assert.ok(html.includes(`<li>${escape(fact)}</li>`), 'verified facts reach the UI');
  assert.equal(count(html, 'data-clan-recruit'), 6, 'other crew dossiers remain present');
  assert.equal(count(html, 'data-clan-crew-dialogue-ack'), 1);
  assert.ok(html.includes(`aria-describedby="clan-crew-dialogue-${npc.id}"`));
  for (const other of ops.CLAN_SHIP_RECRUITS) assert.ok(!html.includes(escape(other.joinLine)), 'stored agreement quotes are not broadcast');
  return html;
}

test('SSR: each of six real crew members has all five earned contexts, with one physical speaker', () => {
  const proven = allProofs(), agreed = legacyAgreements(proven), returned = escort(agreed);
  const circle = act(returned, { type: 'confirm-circle' });
  const contexts = [
    ['missing-proof', welcome()], ['recent-proof', proven], ['agreement', agreed],
    ['operation-return', returned], ['circle-confirmed', circle],
  ];
  for (const [context, save] of contexts) {
    for (const npc of ops.CLAN_SHIP_RECRUITS) assertSpeech(save, npc, context);
  }
});

test('SSR: remote, unfocused and suspended dossiers never attribute contextual B05 speech and retain routes', () => {
  const save = legacyAgreements();
  for (const npc of ops.CLAN_SHIP_RECRUITS) {
    const remoteRoom = npc.roomId === 'hangar' ? 'archives' : 'hangar';
    for (const overrides of [{ roomId: remoteRoom }, { crewFocus: 'star-watch', roomId: npc.roomId, suspended: true }]) {
      const { html } = render(save, npc.id, overrides);
      assert.equal(count(html, 'data-clan-crew-dialogue'), 0);
      assert.equal(count(html, 'data-clan-crew-dialogue-ack'), 0);
      // Topic conversations have their own closed native drawer at an occupied
      // post. The focused B05 response must remain absent from the whole panel.
      for (const other of ops.CLAN_SHIP_RECRUITS) {
        const available = dialogue.selectClanShipCrewDialogue(aboard(save, other.roomId), other.id, {
          roomId: other.roomId, focusedNpcId: other.id,
        });
        if (available.line) assert.ok(!html.includes(escape(available.line)), other.id);
      }
      assert.equal(count(html, 'data-clan-recruit'), 6);
    }
    const { html } = render(save, npc.id, { roomId: remoteRoom });
    assert.ok(html.includes(`data-clan-operation-route="${npc.roomId}"`));
  }
  // Council defaults to operations when there is no focused physical contact.
  const { html } = render(save, 'star-watch', { crewFocus: null });
  assert.equal(count(html, 'data-clan-crew-dialogue'), 0);
});

test('SSR: a modern recruit must be ready at the real assigned Clan room before speaking', () => {
  let save = recruit(allProofs(), 'cold-trace');
  let rendered = render(save, 'cold-trace');
  assert.equal(count(rendered.html, 'data-clan-crew-dialogue'), 0, 'reserve is no remote speaker');
  assert.ok(rendered.html.includes('Recruté · réserve du réseau'));
  save = refit(save, 'cold-trace');
  const present = residence.companionResidencePresence(save, { kind: 'clan', shipId: 'avp-predator-mothership' })
    .find(entry => entry.id === 'cold-trace');
  assert.ok(present?.serviceAvailable);
  rendered = render(save, 'cold-trace', { roomId: present.avatarRoomId });
  assert.match(rendered.html, /data-clan-crew-dialogue="cold-trace" data-clan-crew-dialogue-context="agreement"/);
  assert.ok(rendered.html.includes(`Poste de rencontre : ${escape(rooms[present.avatarRoomId].label)}`));
  const suspended = residenceAct(save, { type: 'suspend', id: 'cold-trace' }, 'hangar');
  assert.equal(count(render(suspended, 'cold-trace', { roomId: present.avatarRoomId }).html, 'data-clan-crew-dialogue'), 0);
  const elsewhere = refit(save, 'cold-trace', { kind: 'personal', shipId: 'classic-predator-spaceship' });
  assert.equal(count(render(elsewhere, 'cold-trace').html, 'data-clan-crew-dialogue'), 0);
});

test('SSR: gathered C-37 witnesses keep their own audience and do not speak from legacy dossiers', () => {
  const save = gathered();
  for (const id of ['ash-scar', 'cold-trace']) {
    const { html } = render(save, id);
    assert.equal(count(html, 'data-clan-crew-dialogue'), 0);
    assert.equal(count(html, 'data-clan-crew-dialogue-ack'), 0);
    assert.ok(html.includes('audience'));
  }
});

test('SSR: recruitment and circle confirmation keep their explicit actions separate from listening', () => {
  const proven = allProofs();
  for (const npc of ops.CLAN_SHIP_RECRUITS) {
    const html = assertSpeech(proven, npc, 'recent-proof');
    assert.ok(html.includes(`data-clan-recruit-action="${npc.id}"`));
    assert.equal(count(html, 'data-clan-confirm-circle'), 0);
  }
  const returned = escort(legacyAgreements(proven));
  const { html } = render(returned, 'star-watch');
  assert.equal(count(html, 'data-clan-confirm-circle'), 1);
  assert.equal(count(html, 'data-clan-crew-dialogue-ack'), 1);
});

test('SSR: invalid/future/foreign presence records expose no spoken text and never normalize the save', () => {
  const modern = refit(recruit(allProofs(), 'cold-trace'), 'cold-trace');
  const post = residence.companionResidencePresence(modern, { kind: 'clan', shipId: 'avp-predator-mothership' })
    .find(entry => entry.id === 'cold-trace').avatarRoomId;
  const hearing = gathered().clanShipTrophyHearing;
  const cases = [];
  for (const record of ['clanShipDocking', 'clanShipOperations', 'companionResidence', 'clanShipTrophyHearing']) {
    for (const [field, value] of [['version', 999], ['version', 'invalid'], ['ownerCreatedAt', '2026-11-09T20:00:00.000Z']]) {
      const candidate = clone(aboard(modern, post));
      if (!candidate[record]) candidate[record] = clone(hearing);
      candidate[record][field] = value;
      // render() supplies a fresh valid dock; use the explicit save prop to
      // verify that the selector refuses the original invalid payload.
      cases.push([candidate, post]);
    }
  }
  for (const [save, roomId] of cases) {
    const bytes = JSON.stringify(save);
    const { html } = render(save, 'cold-trace', { save, roomId });
    assert.equal(count(html, 'data-clan-crew-dialogue'), 0);
    assert.equal(count(html, 'data-clan-crew-dialogue-ack'), 0);
    assert.equal(JSON.stringify(save), bytes);
  }
});
