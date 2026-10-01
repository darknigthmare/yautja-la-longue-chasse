import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
import { playHunt } from './helpers/solo-v67-played-route.mjs';
const renderer = homeworldQaModelV64(process.cwd(), ['../firstHuntSoloV67Rendering.ts', '../youthArtManifest.ts']);

test('real renderer keeps both warning orientations and distant recovery captions inside narrow and wide cameras', () => {
  const samples = new Map();
  playHunt({ onStep({ state }) {
    if (state.phase === 'encounter' && ['telegraph', 'recover'].includes(state.prey.phase)) {
      const key = state.prey.phase + state.prey.facing;
      if (!samples.has(key)) samples.set(key, state);
    }
  } });
  assert.equal(samples.size, 4);
  const image = { width: 2048, height: 1024 }, images = { get: () => image };
  for (const width of [320, 370, 960]) for (const state of samples.values()) {
    let tx = 0; const stack = [], captions = [];
    const measure = text => [...text].reduce((n, letter) => n + (letter === 'I' ? 5 : letter === 'M' ? 14 : 9), 0);
    const context = new Proxy({ canvas: { width, height: 540 }, globalAlpha: 1,
      save() { stack.push(tx); }, restore() { tx = stack.pop(); }, translate(x) { tx += x; },
      measureText(text) { return { width: measure(text) }; },
      fillText(text, x) { if (text.includes('CHARGE') || text.includes('FENÊTRE')) captions.push({ text, center: x + tx, width: measure(text) }); },
    }, { get(target, property) { return property in target ? target[property] : () => {}; } });
    renderer.drawFirstHuntSoloV67(context, state, { images, manifest: renderer.YOUTH_ART_MANIFEST }, false);
    assert.equal(captions.length, 1);
    for (const caption of captions) {
      assert(caption.center - caption.width / 2 >= 8, `${caption.text} clipped left at${width}`);
      assert(caption.center + caption.width / 2 <= width - 8, `${caption.text} clipped right at${width}`);
    }
  }
});
