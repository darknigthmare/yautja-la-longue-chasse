import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: 'export * from "./app/game/systems/studioIntroV174";', resolveDir: process.cwd(), loader: 'ts'},
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const intro = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));

test('the intro plays the studio card, then the author card, then waits on the title screen', () => {
  let state = intro.initialStudioIntroV174();
  assert.equal(state.phase, 'studio');
  state = intro.advanceStudioIntroV174(state, {type: 'tick', seconds: intro.STUDIO_INTRO_TIMINGS_V174.studio - 0.01});
  assert.equal(state.phase, 'studio');
  state = intro.advanceStudioIntroV174(state, {type: 'tick', seconds: 0.02});
  assert.equal(state.phase, 'author');
  state = intro.advanceStudioIntroV174(state, {type: 'tick', seconds: intro.STUDIO_INTRO_TIMINGS_V174.author});
  assert.equal(state.phase, 'title');
  state = intro.advanceStudioIntroV174(state, {type: 'tick', seconds: 600});
  assert.equal(state.phase, 'title', 'the title screen waits for the player');
  assert.equal(intro.advanceStudioIntroV174(state, {type: 'press'}).phase, 'done');
});

test('a press during a card skips straight to the title screen, never past it', () => {
  const skipped = intro.advanceStudioIntroV174(intro.initialStudioIntroV174(), {type: 'press'});
  assert.equal(skipped.phase, 'title');
  const fromAuthor = intro.advanceStudioIntroV174({phase: 'author', elapsed: 0.3}, {type: 'press'});
  assert.equal(fromAuthor.phase, 'title');
  const done = {phase: 'done', elapsed: 0};
  assert.equal(intro.advanceStudioIntroV174(done, {type: 'press'}), done);
  assert.equal(intro.advanceStudioIntroV174(done, {type: 'tick', seconds: 5}), done);
});

test('the cards carry the approved credits', () => {
  assert.deepEqual(intro.STUDIO_INTRO_TEXT_V174, {
    studio: 'A Darknigthmare Kingdoms Games production',
    author: 'by Darknigthmare',
    title: 'Yautja', subtitle: 'La Longue Chasse', prompt: 'Appuyez sur une touche',
  });
});

test('automation and ?intro=0 skip the intro; ?intro=1 forces it', () => {
  assert.equal(intro.studioIntroEnabledV174('', false), true);
  assert.equal(intro.studioIntroEnabledV174('', true), false, 'existing browser recipes reach the menu directly');
  assert.equal(intro.studioIntroEnabledV174('?intro=0', false), false);
  assert.equal(intro.studioIntroEnabledV174('?intro=1', true), true);
});
