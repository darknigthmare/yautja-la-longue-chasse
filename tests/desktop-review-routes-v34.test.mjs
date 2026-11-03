import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  APP_DOCUMENT_ROUTES,
  APP_ORIGIN,
  appDownloadKind,
  appRoutePath,
  isAppRoute,
  resolveAppFile,
} from '../desktop/protocol.mjs';

const root = path.resolve('work/v34/desktop-review-fixture');

test('allowlisted art workshops navigate to their own documents rather than the game SPA', () => {
  for (const route of APP_DOCUMENT_ROUTES) {
    assert.equal(appRoutePath(APP_ORIGIN + route), route);
    assert(isAppRoute(APP_ORIGIN + route));
    assert.equal(resolveAppFile(root, APP_ORIGIN + route), path.join(root, route));
    assert.notEqual(resolveAppFile(root, APP_ORIGIN + route), path.join(root, 'index.html'));
  }
  for (const route of ['/game/unknown/index.html', '/game/assets/v34/vehicle-assembly-review/review.js', '/game/assets/v34/production-review/manifest.json']) {
    assert.equal(appRoutePath(APP_ORIGIN + route), null);
    assert.equal(isAppRoute(APP_ORIGIN + route), false);
  }
  assert.equal(appRoutePath('https://game/game/assets/v34/production-review/index.html'), null);
});

test('art download permission accepts exact JSON media and bundled raster URLs only', () => {
  assert.equal(appDownloadKind(APP_ORIGIN + '/game/vehicles/v34/test.png'), 'image');
  assert.equal(appDownloadKind('blob:' + APP_ORIGIN + '/local-save'), 'save');
  assert.equal(appDownloadKind('data:application/json,{}'), 'save');
  assert.equal(appDownloadKind('data:application/json;charset=utf-8,%7B%7D'), 'save');
  for (const url of [
    'data:application/jsonp,alert(1)',
    'data:application/json-seq,%1E%7B%7D',
    'https://game/game/test.png',
    'file:///C:/test.png',
    'yautja://game.evil/game/test.png',
    'yautja://game/game/%2e%2e%2fsecret.png',
    'yautja://game/game/%5ctest.png',
    'yautja://game/game/test.svg',
    'yautja://game/game/test.js',
    'yautja://game/.env',
    'blob:yautja://evil/local-save',
  ]) assert.equal(appDownloadKind(url), null, url);
});
