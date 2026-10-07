import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const bundle = await build({ entryPoints: [fileURLToPath(new URL('../app/game/systems/bibleVoiceProfilesV88.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2022', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const document = JSON.parse(await readFile(new URL('../public/game/dialogues/v85/bible-dialogues.json', import.meta.url), 'utf8'));
const sheet = document.sheets.find(item => item.name === 'Voix V6');
const profiles = api.readBibleVoiceProfilesV88(sheet);
const homonyms = ['Orha', 'Isha', 'Mara Venn', 'Saar', 'Yena', 'Artisane des Branches Entrelacées', 'Vigie de la Couronne', 'Artisane des Forges Souterraines'];

test('all 210 documentary profiles preserve their nine source cells and exact ranges without source mutation', () => {
  const before = JSON.stringify(sheet);
  assert.equal(profiles.length, 210); assert.equal(new Set(profiles.map(profile => profile.name)).size, 202);
  const columns = { id: 'A', name: 'B', context: 'C', direction: 'D', vocabulary: 'E', gestures: 'F', knowledge: 'G', limits: 'H', provenance: 'I' };
  for (const profile of profiles) {
    const row = sheet.rows.find(item => item.number === profile.source.row);
    for (const [field, column] of Object.entries(columns)) assert.equal(profile[field], row.cells.find(cell => cell.address === column + row.number)?.value ?? '');
    assert.equal(profile.source.sheet, 'Voix V6'); assert.equal(profile.source.range, `A${row.number}:I${row.number}`);
    assert.equal(profile.source.sha256, document.source.sha256);
    assert.equal(Object.hasOwn(profile, 'audioUrl'), false);
  }
  assert.equal(JSON.stringify(sheet), before);
});

test('all eight source homonyms remain unresolved and include every candidate regardless of corpus ordering', () => {
  for (const name of homonyms) {
    const forward = api.resolveBibleVoiceProfileV88(name, profiles), backward = api.resolveBibleVoiceProfileV88(name, [...profiles].reverse());
    assert.equal(forward.kind, 'ambiguous', name); assert.equal(forward.resolved, null); assert.equal(forward.candidates.length, 2);
    assert.equal(backward.kind, 'ambiguous'); assert.equal(backward.resolved, null);
    assert.deepEqual(forward.candidates.map(profile => profile.id).sort(), backward.candidates.map(profile => profile.id).sort());
  }
  assert.deepEqual(api.resolveBibleVoiceProfileV88('Orha', profiles).candidates.map(profile => profile.id), ['D6-V-O-06', 'D6-V-H087']);
});

test('a unique exact name links a documentary profile without changing its original context or claiming audio', () => {
  const resolution = api.resolveBibleVoiceProfileV88('Dhera', profiles);
  assert.equal(resolution.kind, 'unique'); assert.equal(resolution.resolved.id, 'D6-V-O-01');
  assert.equal(resolution.candidates.length, 1); assert.equal(resolution.resolved.context, 'Instructrice de O1');
});

test('only a literal source profile ID can resolve a shared name by explicit identity', () => {
  const resolution = api.resolveBibleVoiceProfileV88('D6-V-H087', profiles);
  assert.equal(resolution.kind, 'identity'); assert.equal(resolution.resolved.name, 'Orha');
  assert.equal(resolution.resolved.source.range, 'A197:I197');
  assert.equal(api.resolveBibleVoiceProfileV88('Orha', profiles).resolved, null);
});

test('case, accent removal, whitespace, partial titles and missing speakers cannot borrow another profile', () => {
  for (const speaker of ['', '   ', 'orha', 'Orha ', 'Artisane des Branches Entrelacees', 'Dhera - Instructrice', 'Pilote', 'not-a-person']) {
    const result = api.resolveBibleVoiceProfileV88(speaker, profiles);
    assert.equal(result.kind, 'missing', speaker); assert.equal(result.resolved, null); assert.deepEqual(result.candidates, []);
  }
});

test('conflicting duplicate identities are also ambiguous rather than silently choosing the first row', () => {
  const profile = profiles[0], duplicate = { ...profile, context: 'Contradictory fixture context', source: { ...profile.source, row: 999, range: 'A999:I999' } };
  for (const speaker of [profile.id, profile.name]) {
    const result = api.resolveBibleVoiceProfileV88(speaker, [profile, duplicate]);
    assert.equal(result.kind, 'ambiguous'); assert.equal(result.resolved, null); assert.equal(result.candidates.length, 2);
  }
});

test('an absent or different sheet supplies no profiles and formulas remain inert data', () => {
  assert.deepEqual(api.readBibleVoiceProfilesV88(undefined), []);
  assert.deepEqual(api.readBibleVoiceProfilesV88({ ...sheet, name: 'Répliques V6' }), []);
  const row = structuredClone(sheet.rows.find(item => item.number === 6));
  row.cells.find(cell => cell.address === 'D6').formula = 'IMPORTDATA("https://invalid.example/")';
  assert.equal(api.readBibleVoiceProfilesV88({ name: 'Voix V6', rows: [row] })[0].direction, profiles[0].direction);
});

test('the actual archive voice block renders both Orha source contexts, limits and the explicit ambiguity', () => {
  const qa = homeworldSceneSsrV78(), Voice = qa.load('app/game/DialogueBibleReaderV85.tsx').BibleVoiceDirectionsV88;
  const html = renderToStaticMarkup(React.createElement(Voice, { speaker: 'Orha', profiles }));
  assert.match(html, /data-bible-voice-resolution="ambiguous"/);
  assert.match(html, /D6-V-O-06/); assert.match(html, /D6-V-H087/);
  assert.match(html, /Voix V6!A11:I11/); assert.match(html, /Voix V6!A197:I197/);
  assert.match(html, /Aucun profil n’est attribué automatiquement/);
  for (const profile of api.resolveBibleVoiceProfileV88('Orha', profiles).candidates) assert.ok(html.includes(profile.context));
  assert.match(html, /Connaissances permises/); assert.match(html, /Provenance/);
  assert.match(html, /Aucun enregistrement, TTS ou attribution de voix canonique/);
  assert.equal((html.match(/data-voice-profile-id=/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<audio|<video|autoplay|audioUrl/);
});

test('actual unique and absent archive blocks distinguish documentary linkage from missing direction', () => {
  const qa = homeworldSceneSsrV78(), Voice = qa.load('app/game/DialogueBibleReaderV85.tsx').BibleVoiceDirectionsV88;
  const unique = renderToStaticMarkup(React.createElement(Voice, { speaker: 'Dhera', profiles }));
  assert.match(unique, /data-bible-voice-resolution="unique"/); assert.match(unique, /Un seul profil porte ce nom exact/);
  assert.equal((unique.match(/data-voice-profile-id=/g) ?? []).length, 1);
  const missing = renderToStaticMarkup(React.createElement(Voice, { speaker: 'missing-speaker', profiles }));
  assert.match(missing, /data-bible-voice-resolution="missing"/); assert.match(missing, /Aucun profil documentaire identifié/);
  assert.doesNotMatch(missing, /data-voice-profile-id=/);
});
