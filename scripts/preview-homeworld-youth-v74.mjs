import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { build } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright-core';

const output = process.env.V74_YOUTH_PREVIEW_OUTPUT ?? 'work-local/v74/qa/youth-native-poses';
await fs.mkdir(output, { recursive: true });
const compiled = await build({ stdin: { contents: "export * from './app/game/systems/homeworldYouthMotionV74.ts';export {default as Motion} from './app/game/HomeworldYouthMotionV74.tsx';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic' });
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const art = JSON.parse(await fs.readFile('app/game/data/homeworldYouthMotionArtV74.json', 'utf8'));
const directions = { n: [0, -260], ne: [250, -200], e: [330, 0], se: [250, 200], s: [0, 260], sw: [-250, 200], w: [-330, 0], nw: [-250, -200] };
const cells = Object.entries(directions).map(([direction, [x, y]]) => '<section data-pose-row="' + direction + '"><h2>' + direction.toUpperCase() + '</h2><div class="row">' + [null, 0, 21, 42, 63].map((distanceWorld, pose) => '<article><label>' + ['Idle', 'Contact A', 'Passing A', 'Contact B', 'Passing B'][pose] + '</label><div class="actor">' + renderToStaticMarkup(api.Motion({ seconds: 0, moving: distanceWorld !== null, distanceWorld: distanceWorld ?? 0, lastDirection: direction, velocity: { x, y }, height: 160 })) + '</div><div class="ground"></div></article>').join('') + '</div></section>').join('');
const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>V74 native youth gait inspection</title><style>body{margin:0;padding:18px;background:#102629;color:#e6ddbc;font:14px system-ui}h1{font-size:22px;margin:0 0 12px}h2{font-size:16px;margin:0 0 6px}section{padding:6px 0 12px}.row{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}article{height:204px;position:relative;background:#24413b;overflow:hidden;border:1px solid #446e62}label{position:absolute;left:10px;top:6px}.actor{position:absolute;left:50%;top:192px}.ground{position:absolute;left:0;right:0;top:192px;border-top:1px solid #bda868;pointer-events:none}</style><h1>Unblooded V74 — original native windows, uniform head/torso scale, ground pivots</h1>${cells}</html>`;
await fs.writeFile(output + '/inspection.html', html);
const server = http.createServer(async (request, response) => {
  try {
    if (request.url === '/') { response.setHeader('content-type', 'text/html;charset=utf-8'); response.end(html); return; }
    const clean = new URL(request.url, 'http://localhost').pathname;
    if (!clean.startsWith('/game/homeworld/v74/youth/') || !clean.endsWith('.png')) { response.statusCode = 404; response.end(); return; }
    response.setHeader('content-type', 'image/png'); response.end(await fs.readFile(path.join(process.cwd(), 'public', clean)));
  } catch { response.statusCode = 404; response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1450, height: 1030 } });
const errors = [], failures = [];
page.on('pageerror', error => errors.push(error.message)); page.on('response', r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('[data-motion-version="74"]').evaluateAll(nodes => Promise.all(nodes.map(async node => { const source = node.dataset.nativeSource; const image = new Image(); image.src = source; await image.decode(); })));
  const captures = [];
  for (const direction of Object.keys(directions)) {
    const file = output + '/' + direction + '-five-native-poses.png';
    await page.locator('[data-pose-row="' + direction + '"]').screenshot({ path: file }); captures.push(file);
  }
  const rows = await page.locator('[data-motion-version="74"]').evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect(), parent = node.parentElement.getBoundingClientRect();
    const scale = Number(node.dataset.frameScale), pivotY = Number(node.dataset.framePivotY);
    return { direction: node.dataset.nativeDirection, clip: node.dataset.homeworldUnbloodedV72, frame: node.dataset.nativeFrame, groundOffset: r.y + pivotY * scale - parent.y, source: node.dataset.nativeSource };
  }));
  if (errors.length || failures.length || rows.length !== 40 || rows.some(row => Math.abs(row.groundOffset) > .1)) throw new Error('Native renderer browser geometry failed');
  const report = { status: 'PASS', kind: 'native-art-render-inspection-not-gameplay', rows, captures, sourceCount: Object.keys(art.sources).length, errors, failures, limits: 'Actual physics integration, keyboard, collision, pause and mobile game flow remain a separate recipe; this preview only renders every selected native image window through the real V74 component.' };
  await fs.writeFile(output + '/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, captures: captures.length, rows: rows.length, output }));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
