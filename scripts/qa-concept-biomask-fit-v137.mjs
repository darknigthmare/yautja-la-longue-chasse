/** Full two-direction matrix for the seven original V133 biomasks on the native DOM rig. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(root, 'public');
const output = resolve(root, process.env.BIOMASK_FIT_OUTPUT ?? 'outputs/biomask-fit-v137');
const catalog = JSON.parse(await readFile(resolve(root, 'app/game/data/conceptBiomasksV133.json'), 'utf8')).records;
const morphs = ['classic', 'young', 'elder', 'super', 'feral', 'huntress'];
const poses = ['idle', 'run', 'jump', 'fall', 'climb', 'extract'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

const fixture = {
  contents: [
    "import { createRoot } from 'react-dom/client';",
    "import { HunterRigPreview } from './app/game/HunterRigPreview';",
    "const params = new URLSearchParams(location.search);",
    "const mask = params.get('mask');",
    "const pose = params.get('pose');",
    "const arms = pose === 'run' ? { speed: 170 } : pose === 'fall' ? { verticalVelocity: 220 } : {};",
    "const morphs = " + JSON.stringify(morphs) + ";",
    "createRoot(document.querySelector('main')).render(morphs.flatMap(morph => [1, -1].map(facing =>",
    "  <section key={morph + facing} data-case data-facing={facing}>",
    "    <span>{morph} · {facing === 1 ? 'profil droit' : 'profil gauche'}</span>",
    "    <HunterRigPreview size={180} appearance={{ presetId: 'custom', bodyMorphId: morph,",
    "      headStyleId: 'reference', skinId: 'ochre-mottle', biomaskId: mask,",
    "      dreadStyleId: morph === 'feral' || morph === 'huntress' ? morph : 'classic',",
    "      dreadTintId: 'obsidian', armorStyleId: 'classic', armorTintId: 'bronze', trophyAdornmentId: 'none' }}",
    "      armorId='scout' weaponIds={[]} facing={facing} pose={pose} phase={.36} extractionProgress={.45} {...arms} />",
    "  </section>)));",
  ].join('\n'),
  resolveDir: root,
  sourcefile: 'qa-biomask-fit-v137.tsx',
  loader: 'tsx',
};
const { outputFiles } = await build({
  stdin: fixture, absWorkingDir: root, bundle: true, jsx: 'automatic', platform: 'browser',
  format: 'iife', outfile: 'biomask-fit.js', write: false,
});
const bundle = outputFiles.find(file => file.path.endsWith('.js'));
assert.ok(bundle, 'The native rig fixture must bundle');
const html = [
  '<!doctype html><html lang="fr"><meta charset="UTF-8"><title>Biomasks originaux V133</title>',
  '<style>body{margin:16px;background:#101920;color:#cadad1;font:14px system-ui}',
  'main{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}',
  'section{padding:4px;text-align:center;background:#172429}img{image-rendering:auto}</style>',
  '<main></main><script src="/biomask-fit.js"></script>',
].join('');
const mime = new Map([
  ['.webp', 'image/webp'], ['.png', 'image/png'], ['.svg', 'image/svg+xml'],
]);
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/') {
    response.writeHead(200, { 'content-type': 'text/html;charset=utf-8' }).end(html);
    return;
  }
  if (url.pathname === '/biomask-fit.js') {
    response.writeHead(200, { 'content-type': 'text/javascript' }).end(bundle.contents);
    return;
  }
  if (url.pathname === '/favicon.ico') {
    response.writeHead(204).end();
    return;
  }
  const file = resolve(publicRoot, '.' + url.pathname);
  const type = mime.get(extname(file));
  if (url.pathname.startsWith('/game/') && file.startsWith(publicRoot + sep) && type) {
    const bytes = await readFile(file).catch(() => null);
    if (bytes) {
      response.writeHead(200, { 'content-type': type }).end(bytes);
      return;
    }
  }
  response.writeHead(404).end(url.pathname);
});

await mkdir(output, { recursive: true });
for (const mask of catalog) {
  assert.equal(digest(await readFile(resolve(publicRoot, '.' + mask.assetPath))), mask.fileSha256);
}
const report = {
  source: process.env.GITHUB_SHA ?? null,
  scope: 'Composant HunterRigPreview natif. Deux directions miroir de la même projection 2D, six morphologies et six poses.',
  limitations: ['Vue de face et vue de dos dédiées absentes du rig', 'Captures Chromium de la couche DOM uniquement',
    'Aucune homologation artistique, détection de collision anatomique humaine ou fidélité PHG 1:1'],
  cases: [], captures: [], failedRequests: [], runtimeErrors: [],
};
let browser;
try {
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', accept);
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  report.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.runtimeErrors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) report.failedRequests.push(response.url());
  });
  const origin = 'http://127.0.0.1:' + server.address().port;

  for (const mask of catalog) {
    for (const pose of poses) {
      await page.goto(origin + '/?' + new URLSearchParams({ mask: mask.id, pose }));
      await page.waitForFunction(() => {
        const rigs = [...document.querySelectorAll('[data-hunter-rig]')];
        return rigs.length === 12 && rigs.every(rig =>
          [...rig.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
      });
      const cases = await page.evaluate(id => {
        const size = { width: 256, height: 384 };
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        Object.assign(canvas, size);

        function surface(image) {
          const left = parseFloat(image.style.left) * size.width / 100;
          const top = parseFloat(image.style.top) * size.height / 100;
          const width = parseFloat(image.style.width) * size.width / 100;
          const height = parseFloat(image.style.height) * size.height / 100;
          context.clearRect(0, 0, size.width, size.height);
          context.drawImage(image, left, top, width, height);
          return context.getImageData(0, 0, size.width, size.height).data;
        }

        return [...document.querySelectorAll('[data-case]')].map(item => {
          const rig = item.querySelector('[data-hunter-rig]');
          const mask = rig.querySelector('img[data-rig-slot="mask-' + id + '"]');
          const head = rig.querySelector('img[data-rig-slot="body-head"]');
          const dreads = [...rig.querySelectorAll('[data-rig-slot^="dread-side-"]')];
          const maskStyle = getComputedStyle(mask.parentElement);
          const headStyle = getComputedStyle(head.parentElement);
          const det = new DOMMatrixReadOnly(maskStyle.transform);
          const maskAlpha = surface(mask);
          const headAlpha = surface(head);
          let maskPixels = 0;
          let overHead = 0;
          const bounds = { left: size.width, top: size.height, right: 0, bottom: 0 };
          for (let index = 3; index < maskAlpha.length; index += 4) {
            if (maskAlpha[index] < 128) continue;
            maskPixels++;
            if (headAlpha[index] >= 128) overHead++;
            const pixel = (index - 3) / 4;
            const x = pixel % size.width;
            const y = Math.floor(pixel / size.width);
            bounds.left = Math.min(bounds.left, x);
            bounds.top = Math.min(bounds.top, y);
            bounds.right = Math.max(bounds.right, x);
            bounds.bottom = Math.max(bounds.bottom, y);
          }
          return {
            morph: rig.dataset.bodyMorph, pose: rig.dataset.pose, facing: Number(item.dataset.facing),
            image: mask.getAttribute('src'), width: mask.naturalWidth, height: mask.naturalHeight,
            sameHeadMatrix: maskStyle.transform === headStyle.transform,
            handedness: Math.sign(det.a * det.d - det.b * det.c),
            maskInFront: Number(maskStyle.zIndex) > Number(headStyle.zIndex) && dreads.length > 0 &&
              dreads.every(layer => Number(maskStyle.zIndex) > Number(getComputedStyle(layer).zIndex)),
            maskPixels, overHead, bounds,
          };
        });
      }, mask.id);
      report.cases.push(...cases);
      for (const entry of cases) {
        const label = [mask.id, entry.morph, pose, entry.facing].join(' ');
        assert.equal(entry.image, mask.assetPath, label);
        assert.deepEqual([entry.width, entry.height], mask.canvas, label);
        assert.equal(entry.pose, pose, label);
        assert.equal(entry.handedness, entry.facing, label);
        assert.ok(entry.sameHeadMatrix && entry.maskInFront && entry.overHead > 0, label);
        assert.ok(Math.abs((entry.bounds.left + entry.bounds.right) / 2 - 147) <= 2, label);
        assert.ok(Math.abs((entry.bounds.top + entry.bounds.bottom) / 2 - 60) <= 2, label);
      }
      assert.deepEqual([...new Set(cases.map(entry => entry.morph))], morphs);
      assert.deepEqual(cases.map(entry => entry.facing), morphs.flatMap(() => [1, -1]));
      const name = mask.id + '-' + pose + '.png';
      const bytes = await page.screenshot({ path: resolve(output, name) });
      report.captures.push({ name, sha256: digest(bytes) });
    }
  }
  assert.equal(report.cases.length, catalog.length * morphs.length * 2 * poses.length);
  assert.deepEqual(report.failedRequests, []);
  assert.deepEqual(report.runtimeErrors, []);
  report.passed = true;
  console.log(JSON.stringify({ cases: report.cases.length, captures: report.captures.length, passed: true }));
} catch (error) {
  report.passed = false;
  report.error = String(error?.stack ?? error);
  throw error;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  server.close();
}
