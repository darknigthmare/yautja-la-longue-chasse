import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { build as buildVite, preview } from 'vite';
import react from '@vitejs/plugin-react';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = await fs.readFile(new URL('../scripts/qa-planet-arrival-spatial.mjs', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('spatial.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['startHarness', 'closeHarness']);
const declarations = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text));
assert.equal(declarations.length, names.size);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('the actual spatial host serves production React and unchanged original artwork, then removes only its temporary build', async () => {
  // Exercise the recipe's exact host functions with the locked real Vite and
  // React packages. This is a build/HTTP regression, not a browser pose proof.
  const publicFiles = ['game/sprites/v62/heads/classic-head.png', 'game/assets/v139/rig-gauntlets/jungle-hunter/base.svg'];
  const originals = await Promise.all(publicFiles.map(file => fs.readFile(path.join(root, 'public', file))));
  const out = await fs.mkdtemp(path.join(root, '.spatial-host-test-'));
  const report = {};
  const host = vm.runInNewContext('let harness, harnessDir;\n' + declarations.map(node => node.getText(parsed)).join('\n') +
    '\n({ startHarness, closeHarness, state: () => ({ harness, harnessDir }) })',
  { assert, fs, path, root, out, harnessPort: 0, buildVite, preview, react, report, Buffer, sha256 });
  let directory;
  try {
    await host.startHarness();
    const state = host.state(); directory = state.harnessDir;
    const address = state.harness.httpServer.address();
    assert.equal(address.address, '127.0.0.1');
    assert.equal(state.harness.config.preview.strictPort, true);
    const origin = `http://127.0.0.1:${address.port}`;
    const htmlResponse = await fetch(origin + '/?mission=jungle-vey&shot=egress&method=ship&team=triad&cloak=1');
    assert.equal(htmlResponse.status, 200);
    const html = await htmlResponse.text();
    assert.doesNotMatch(html, /@vite\/client|@react-refresh|host\.tsx|RefreshRuntime/);
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
    assert.ok(scripts.length > 0);
    for (const url of scripts) {
      assert.ok(url.startsWith('/__spatial_build/'));
      const response = await fetch(origin + url);
      assert.equal(response.status, 200);
      const bytes = Buffer.from(await response.arrayBuffer());
      const receipt = report.harnessBuild.files.find(file => '/' + file.file === url);
      assert.ok(receipt, 'The served script must be the recorded production build artifact.');
      assert.equal(bytes.length, receipt.bytes); assert.equal(sha256(bytes), receipt.sha256);
      const script = bytes.toString('utf8');
      assert.doesNotMatch(script, /@react-refresh|RefreshRuntime|react-dom-client\.development\.js|react-jsx-dev-runtime/);
      assert.match(script, /data-arrival-run/);
      assert.match(script, /data-arrival-elapsed-exact/);
      assert.match(script, /Minified React error/);
    }
    assert.equal(report.harnessBuild.mode, 'production');
    assert.ok(report.harnessBuild.runtimeModules.some(file => file.endsWith('/react.production.js')));
    assert.ok(report.harnessBuild.runtimeModules.some(file => file.endsWith('/react-dom-client.production.js')));
    assert.ok(report.harnessBuild.runtimeModules.every(file => !file.includes('.development.js')));
    const mount = path.join(directory, 'dist/game');
    assert.equal((await fs.lstat(mount)).isSymbolicLink(), true);
    assert.equal(await fs.realpath(mount), await fs.realpath(path.join(root, 'public/game')));
    assert.deepEqual((await fs.readdir(path.join(directory, 'dist'))).sort(), ['__spatial_build', 'game', 'index.html']);
    for (let index = 0; index < publicFiles.length; index += 1) {
      const response = await fetch(origin + '/' + publicFiles[index]);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), index ? /image\/svg\+xml/ : /image\/png/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), originals[index],
        'Artwork must retain its original URL and every original byte.');
    }
    await host.closeHarness();
    await assert.rejects(fs.stat(directory), { code: 'ENOENT' });
    await host.closeHarness();
    for (let index = 0; index < publicFiles.length; index += 1) {
      assert.deepEqual(await fs.readFile(path.join(root, 'public', publicFiles[index])), originals[index]);
    }
  } finally {
    await host.closeHarness();
    await fs.rm(out, { recursive: true, force: true });
  }
});
