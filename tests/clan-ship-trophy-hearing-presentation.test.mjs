import test from 'node:test';
import assert from 'node:assert/strict';
import { qa, SHIP, clone, hearing, fixture, actHearing, actIncident, gathered, ready, completed,
  recruit, refit, residenceAct, aboard } from './helpers/clan-ship-trophy-hearing-fixture.mjs';

// Actual components rendered by React SSR. These checks do not claim browser
// hydration, pixels, layout, keyboard play or physical controller validation.
const rooms = ['hangar', 'conseil', 'armurerie', 'soins', 'entrainement', 'archives', 'trophees'];
const witnesses = ['ash-scar', 'cold-trace'];
const count = (html, attr, id) => html.split(`${attr}="${id}"`).length - 1;
function interior(save, roomId) {
  const located = aboard(save, roomId);
  return qa.render('app/game/ClanShipInterior.tsx', {
    save: located, roomId, suspended: false, onRoomChange: () => false, onService: () => {},
    onOperations: () => {}, onReturnToPersonal: () => {},
    incidents: { save: located, onAction: () => false, onHearingAction: () => false },
  });
}
const ship = save => Object.fromEntries(rooms.map(roomId => [roomId, interior(save, roomId)]));
const joined = rendered => Object.values(rendered).join('\n');
function scene(save, roomId = 'trophees') {
  return qa.render('app/game/ClanShipIncidentScene.tsx', { save: aboard(save, roomId), roomId,
    position: { roomId, x: 830, y: 650 }, suspended: false, onNavigate: () => {}, onAction: () => {},
    onHearingAction: () => {}, onOpenDossier: () => {},
  });
}
function managed() {
  let save = fixture();
  for (const id of ['cold-trace', 'ash-scar']) save = refit(recruit(save, id), id);
  return save;
}
function tags(html, name) { return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(match => match[0]); }

test('SSR: an unconfirmed or single invitation leaves both witnesses at their real legacy posts', () => {
  const base = fixture();
  for (const save of [base, actHearing(base, { type: 'invite', witnessId: 'ash-scar' })]) {
    const rendered = ship(save), all = joined(rendered);
    for (const id of witnesses) {
      assert.equal(count(all, 'data-trophy-hearing-witness', id), 0);
      assert.equal(count(all, 'data-clan-crew', id), 1);
      assert.equal(count(all, 'data-companion-avatar', id), 0);
    }
    assert.equal(count(rendered.entrainement, 'data-clan-crew', 'ash-scar'), 1);
    assert.equal(count(rendered.archives, 'data-clan-crew', 'cold-trace'), 1);
  }
});

test('SSR: confirmed witnesses appear together once at C-37 and their legacy actors disappear', () => {
  const save = gathered(), bytes = JSON.stringify(save), rendered = ship(save), all = joined(rendered);
  for (const id of witnesses) {
    assert.equal(count(rendered.trophees, 'data-trophy-hearing-witness', id), 1);
    assert.equal(count(all, 'data-trophy-hearing-witness', id), 1);
    assert.equal(count(all, 'data-clan-crew', id), 0);
    assert.equal(count(all, 'data-companion-avatar', id), 0);
    assert.equal(count(all, 'data-homeworld-npc-identity-v84', `clan-ship-crew:${id}`), 1);
  }
  assert.match(rendered.trophees, /data-trophy-hearing-projection/);
  assert.match(rendered.trophees, /data-trophy-hearing-witness="ash-scar" data-companion-motion="static"/);
  assert.match(rendered.trophees, /data-trophy-hearing-witness="cold-trace" data-companion-motion="static"/);
  assert.equal(JSON.stringify(save), bytes, 'Rendering does not recruit or move a resident in the durable save.');
});

test('SSR: managed quarters stay installed while their avatars are shown only at the hearing', () => {
  const original = managed(), before = joined(ship(original));
  const save = gathered(original), all = joined(ship(save));
  assert.deepEqual(save.companionResidence, original.companionResidence);
  for (const id of witnesses) {
    assert.equal(count(before, 'data-companion-module', id), 1);
    assert.equal(count(before, 'data-companion-avatar', id), 1);
    assert.equal(count(all, 'data-companion-module', id), 1);
    assert.equal(count(all, 'data-companion-avatar', id), 0);
    assert.equal(count(all, 'data-clan-crew', id), 0);
    assert.equal(count(all, 'data-trophy-hearing-witness', id), 1);
  }
});

test('SSR: witnesses remain for the shared replies and return to real posts only after acknowledgement', () => {
  for (const initial of [fixture(), managed()]) {
    const pending = actIncident(ready(gathered(initial)), 'conclude-provenance', { conclusion: 'paired-roles' });
    const pendingHtml = scene(pending);
    for (const id of witnesses) assert.equal(count(pendingHtml, 'data-trophy-hearing-witness', id), 1);
    const ended = completed(pending), restored = ship(ended), all = joined(restored);
    for (const id of witnesses) {
      assert.equal(count(all, 'data-trophy-hearing-witness', id), 0);
      const post = hearing.clanShipTrophyWitnessPost(ended, id);
      assert.ok(post);
      const actorAttr = initial.companionResidence ? 'data-companion-avatar' : 'data-clan-crew';
      assert.equal(count(restored[post], actorAttr, id), 1);
      assert.equal(count(all, actorAttr, id), 1);
      if (initial.companionResidence) assert.equal(count(all, 'data-companion-module', id), 1);
    }
    assert.doesNotMatch(all, /data-trophy-hearing-projection/);
  }
});

test('SSR: a suspended or reassigned witness never becomes a ghost actor in the gallery', () => {
  const base = gathered(managed());
  const states = [residenceAct(base, { type: 'suspend', id: 'cold-trace' }, 'hangar'),
    refit(base, 'cold-trace', { kind: 'personal', shipId: SHIP })];
  for (const save of states) {
    const all = joined(ship(save)), gallery = scene(save);
    assert.equal(count(all, 'data-trophy-hearing-witness', 'cold-trace'), 0);
    assert.equal(count(all, 'data-clan-crew', 'cold-trace'), 0);
    assert.equal(count(all, 'data-companion-avatar', 'cold-trace'), 0);
    assert.equal(count(gallery, 'data-trophy-hearing-witness', 'ash-scar'), 1);
    assert.match(gallery, /Trace Froide doit être présent et disponible au Clan Ship/);
    assert.equal(hearing.clanShipTrophyHearingPresence(save).allowed, false);
  }
});

test('SSR: the actual telemetry starts with B-17 alone, names the sources and offers native accessible controls', () => {
  let callbacks = 0;
  const html = qa.render('app/game/ClanShipTrophyTelemetry.tsx', { recordedSampleIds: [], disabled: false, onRecord: () => { callbacks++; } });
  assert.match(html, /data-telemetry-sample="hunt-mark"/);
  assert.match(html, /aria-label="Relecture des enregistrements C-37"/);
  const svg = html.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/)?.[0]; assert.ok(svg);
  assert.match(svg, />B-17<\/text>/); assert.doesNotMatch(svg, />T-04<\/text>/);
  assert.match(svg, /aria-describedby="[^"]+"/);
  assert.ok(html.includes(hearing.CLAN_SHIP_TROPHY_TELEMETRY[0].description));
  assert.ok(html.includes(hearing.CLAN_SHIP_TROPHY_TELEMETRY[0].source));
  const buttons = tags(html, 'button');
  assert.equal(buttons.length, 7);
  for (const button of buttons) assert.match(button, /type="button"/);
  for (const { id } of hearing.CLAN_SHIP_TROPHY_TELEMETRY) assert.equal(count(html, 'data-telemetry-select', id), 1);
  assert.match(buttons.find(tag => tag.includes('data-telemetry-select="hunt-mark"')), /aria-pressed="true"/);
  assert.match(buttons.find(tag => tag.includes('data-telemetry-select="transfer-seal"')), /aria-pressed="false"/);
  assert.match(buttons.find(tag => tag.includes('Passage précédent')), /disabled=""/);
  assert.doesNotMatch(buttons.find(tag => tag.includes('data-telemetry-record=')), /disabled=""/);
  assert.match(html, /aria-live="polite"/); assert.match(html, /La lecture seule ne confirme aucune observation/);
  assert.equal(callbacks, 0, 'Rendering a replay never records an observation.');
});

test('SSR: out-of-reach or already recorded telemetry cannot expose an enabled duplicate record control', () => {
  for (const props of [{ recordedSampleIds: [], disabled: true }, { recordedSampleIds: ['hunt-mark'], disabled: false },
    { recordedSampleIds: hearing.CLAN_SHIP_TROPHY_TELEMETRY.map(entry => entry.id), disabled: false }]) {
    const before = clone(props);
    const html = qa.render('app/game/ClanShipTrophyTelemetry.tsx', { ...props, onRecord: () => assert.fail('SSR must never record') });
    assert.match(tags(html, 'button').find(tag => tag.includes('data-telemetry-record=')), /disabled=""/);
    assert.deepEqual(props, before);
    if (props.disabled) for (const button of tags(html, 'button')) assert.match(button, /disabled=""/);
  }
});

test('SSR: the native interior exposes a dossier button with documented keyboard and controller labels', () => {
  const html = interior(gathered(), 'trophees');
  const dossier = tags(html, 'button').find(tag => tag.includes('data-interior-incidents'));
  assert.ok(dossier); assert.match(dossier, /type="button"/); assert.doesNotMatch(dossier, /disabled=""/);
  assert.match(html, /I \/ Y · Dossiers du bord/);
  assert.match(html, /data-clan-incident-panel/);
  assert.match(html, /I : incidents/); assert.match(html, /Y : incidents/);
});
