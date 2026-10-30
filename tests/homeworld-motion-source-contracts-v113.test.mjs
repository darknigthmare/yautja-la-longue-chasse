import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Exercise the actual loader used by the hook. Decoder dimensions below are
// controlled fixtures; these tests do not certify production PNGs or their art.
const artifact = new URL(`../work-local/v113/motion-contracts-${process.pid}.mjs`, import.meta.url);
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../app/game/useHomeworldMotionAssetsV74.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm', external: ['react'],
});
await fs.mkdir(new URL('../work-local/v113/', import.meta.url), { recursive: true });
await fs.writeFile(artifact, bundle.outputFiles[0].text);
let api;
try { api = await import(artifact.href); }
finally { await fs.unlink(artifact); }

const extra = { src: '/test-only/shared-motion-contract.png', sourceWidth: 20, sourceHeight: 30 };
const wrongExtra = { ...extra, sourceWidth: 21 };

async function withDecoder(run) {
  const previousImage = globalThis.Image;
  const previousFetch = globalThis.fetch;
  const sizes = new Map(api.homeworldMotionSourcesV74(true)
    .map(source => [source.src, [source.sourceWidth, source.sourceHeight]]));
  sizes.set(extra.src, [20, 30]);
  const images = [], requests = [], handles = [];
  class ImageFixture {
    src = ''; decoding = ''; naturalWidth = 0; naturalHeight = 0;
    constructor() { images.push(this); }
    async decode() {
      assert.ok(sizes.has(this.src), `Unexpected decoder source: ${this.src}`);
      [this.naturalWidth, this.naturalHeight] = sizes.get(this.src);
    }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  globalThis.Image = ImageFixture;
  globalThis.fetch = async (src, options) => {
    requests.push({ src, options });
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  try {
    await run({ images, requests, load(options) {
      const handle = api.preloadHomeworldMotionAssetsV74(options);
      handles.push(handle);
      return handle;
    } });
  } finally {
    for (const handle of handles) handle.cancel();
    await Promise.all(handles.map(handle => handle.done));
    globalThis.Image = previousImage;
    globalThis.fetch = previousFetch;
  }
}

test('identical source contracts still share one decoder in adult and youth batches', async () => {
  for (const youth of [false, true]) await withDecoder(async ({ images, load }) => {
    const reports = [];
    const native = api.homeworldMotionSourcesV74(youth);
    await load({ youth, additionalSources: [{ ...native[0] }, extra, { ...extra }],
      onProgress: progress => reports.push(progress) }).done;
    const total = native.length + 1;
    assert.deepEqual(reports.at(-1), { ready: true, error: null, loaded: total, total });
    assert.equal(images.length, total);
    assert.equal(images.filter(image => image.src === extra.src).length, 1);
  });
});

for (const [label, additionalSources] of [
  ['correct declaration last', [wrongExtra, extra]],
  ['incorrect declaration last', [extra, wrongExtra]],
]) test(`conflicting dimensions cannot be hidden by source order: ${label}`, async () => {
  await withDecoder(async ({ load }) => {
    const reports = [];
    await load({ youth: false, additionalSources,
      onProgress: progress => reports.push(progress) }).done;
    assert.ok(reports.every(progress => !progress.ready), 'no consumer may be admitted with an unchecked crop contract');
    assert.match(reports.at(-1).error, /Dimensions d’animation incompatibles/);
    assert.ok(reports.at(-1).error.includes(extra.src));
    assert.ok(reports.at(-1).loaded < reports.at(-1).total);
  });
});

test('a duplicate of native metadata cannot erase a contradictory consumer of the same PNG', async () => {
  await withDecoder(async ({ load }) => {
    const native = api.homeworldMotionSourcesV74(false)[0];
    const reports = [];
    await load({ youth: false,
      additionalSources: [{ ...native, sourceHeight: native.sourceHeight + 1 }, { ...native }],
      onProgress: progress => reports.push(progress) }).done;
    assert.equal(reports.at(-1).ready, false);
    assert.match(reports.at(-1).error, /Dimensions d’animation incompatibles/);
    assert.ok(reports.at(-1).error.includes(native.src));
  });
});

test('retry retains all dimension contracts and refreshes the exact renderer URL', async () => {
  await withDecoder(async ({ requests, load }) => {
    const reports = [];
    await load({ youth: false, reload: true, additionalSources: [wrongExtra, extra],
      onProgress: progress => reports.push(progress) }).done;
    assert.equal(reports.at(-1).ready, false);
    assert.match(reports.at(-1).error, /Dimensions d’animation incompatibles/);
    assert.ok(requests.some(request => request.src === extra.src));
    assert.ok(requests.every(request => request.options.cache === 'reload'));
    assert.ok(requests.every(request => !request.src.includes('?')));
  });
});
