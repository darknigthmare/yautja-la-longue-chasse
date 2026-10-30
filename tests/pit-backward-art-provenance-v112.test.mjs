import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {buildPitBackwardArtV112, inspectNativeBackwardRegionV112} from '../scripts/build-pit-backward-art-v112.mjs';

const deliveryPath = 'docs/suivi-production/v112-pit-backward/native-frame-delivery.json';
const reviewPath = 'docs/suivi-production/v112-pit-backward/visual-review.json';
const delivery = JSON.parse(await fs.readFile(deliveryPath, 'utf8'));

test('all48 backward BODY regions reproduce byte-exact metadata and remain22 unchanged native source pages', async () => {
  const result = await buildPitBackwardArtV112();
  assert.deepEqual(JSON.parse(await fs.readFile('app/game/data/pitWorkbookThrowsV112.json', 'utf8')), result.manifest);
  assert.deepEqual(JSON.parse(await fs.readFile('docs/suivi-production/v112-pit-backward/native-uv-border-review.json', 'utf8')), result.borderReview);
  assert.equal(result.borderReview.validNativeRegions, 48);
  assert.equal(result.borderReview.sources.length, 22);
  assert.equal(result.borderReview.pendingNativeReplacements, 0);
  assert(result.borderReview.slots.every(slot => slot.boundaryMaxAlpha === 0));
  assert.equal(result.manifest.sourceCompletion, false);
  assert.deepEqual(result.manifest.closedSourceIds, []);
});

test('the native region admission rejects a nonzero source gutter and a displaced grounded support', async () => {
  const group = delivery.groups.find(row => row.fighterId === 'feral-hunter' && row.role === 'attacker' && row.facing === 'right');
  const frame = group.frames[0], page = group.pages.find(row => row.pageId === frame.pageId);
  const {data, info} = await sharp(await fs.readFile(page.path)).raw().toBuffer({resolveWithObject: true});
  assert.equal(inspectNativeBackwardRegionV112(data, info, frame).boundaryMaxAlpha, 0);
  // This in-memory test fixture is never encoded, saved, displayed or used by the game.
  const corrupted = Buffer.from(data), [x, y] = frame.rect;
  corrupted[(y * info.width + x) * info.channels + 3] = 1;
  assert.throws(() => inspectNativeBackwardRegionV112(corrupted, info, frame), /Every selected native UV border must be exactly alpha0/);
  assert.throws(() => inspectNativeBackwardRegionV112(data, info, {...frame, pivot: [frame.pivot[0], frame.pivot[1] + 1]}), /Grounded drawing must retain its measured lowest support/);
});

test('a source-byte change or an edited/rejected generation receipt cannot publish an admitted native registry', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-backward-provenance-v112-'));
  const page = delivery.groups[0].pages[0];
  const copy = async file => {const target = path.join(root, file); await fs.mkdir(path.dirname(target), {recursive: true}); await fs.copyFile(file, target);};
  try {
    for (const file of [deliveryPath, reviewPath, page.path, page.receiptPath]) await copy(file);
    const native = await fs.readFile(page.path);
    // Appending an irrelevant byte leaves a valid PNG image but must change its native source identity.
    await fs.writeFile(path.join(root, page.path), Buffer.concat([native, Buffer.from([0])]));
    await assert.rejects(buildPitBackwardArtV112(root), /Native PNG SHA256 changed/);
    await fs.writeFile(path.join(root, page.path), native);
    const receipt = JSON.parse(await fs.readFile(page.receiptPath, 'utf8'));
    await fs.writeFile(path.join(root, page.receiptPath), JSON.stringify({...receipt, filesEditedAfterGeneration: true}));
    await assert.rejects(buildPitBackwardArtV112(root), /true !== false/);
    await fs.writeFile(path.join(root, page.receiptPath), JSON.stringify({...receipt, status: 'REJECTED_DOUBLE_SHIELD'}));
    await assert.rejects(buildPitBackwardArtV112(root), /REJECTED_DOUBLE_SHIELD/);
  } finally {await fs.rm(root, {recursive: true, force: true});}
});
