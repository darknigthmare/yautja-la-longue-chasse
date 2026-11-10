#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const core = require('./playback_core.js');
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules', 'sharp')); }
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
async function check(folder) {
  const read = async name => JSON.parse(await fs.readFile(path.join(folder, name), 'utf8'));
  const [manifest, imports, playback, provenance] = await Promise.all(['animations.json','import_atlases.json','playback.json','provenance.json'].map(read));
  assert.equal(manifest.artisticStatus, 'draft'); assert.equal(manifest.rosterBinding, null);
  assert.equal(manifest.clips.length * 16, manifest.frameCount);
  assert.equal(imports.atlases.length, manifest.clips.length);
  const rebuilt = core.build(manifest.actions, manifest.clips, manifest.playbackOptions);
  assert.deepEqual(playback, rebuilt, 'Playback must follow the explicit action registry.');
  let frames = 0, protectedPixels = 0, transparentGuardPixels = 0;
  const decodedRgbaGroups=new Map(),edgeAbove2Pages=new Set();
  let sourceVisibleEdgeCells=0,sourceVisibleEdgePixels=0,sourceEdgeAbove2Cells=0;
  for (const clip of manifest.clips) {
    const sourceBuffer = await fs.readFile(path.join(folder, clip.atlas));
    assert.equal(sha(sourceBuffer), clip.sourceSha256);
    assert.equal(provenance.sourceAtlases.find(item => item.id === clip.id).sourceSha256, clip.sourceSha256);
    if (clip.anchorMethod === 'constant-page-calibration') {
      const reference=manifest.clips.find(item=>item.id===clip.registration.referenceSource.clip);
      assert.equal(reference?.sourceSha256,clip.registration.referenceSource.sourceSha256);
      for(const frame of clip.frames) {
        assert.deepEqual(frame.pivot,clip.frames[0].pivot,'Page calibration must not pin individual frames.');
        assert.ok(Math.abs(frame.drawOffset.x-clip.registration.drawOffset.x)<1e-9);
        assert.ok(Math.abs(frame.drawOffset.y-clip.registration.drawOffset.y)<1e-9);
        assert.equal(frame.registrationMethod,'constant-page-calibration');
      }
    }
    const source = await sharp(sourceBuffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const page = imports.atlases.find(item => item.id === clip.id);
    assert.equal(page.guardPixels, 2); assert.equal(page.frames.length, 16);
    const pageBuffer = await fs.readFile(path.join(folder, page.file));
    assert.equal(sha(pageBuffer), page.sha256);
    const guarded = await sharp(pageBuffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(guarded.info.width, page.atlasWidth); assert.equal(guarded.info.height, page.atlasHeight);
    for (const frame of clip.frames) {
      const buffer = await fs.readFile(path.join(folder, frame.file));
      assert.equal(sha(buffer), frame.sha256);
      const actual = await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      assert.equal(actual.info.width, clip.frameWidth); assert.equal(actual.info.height, clip.frameHeight);
      const decodedRgbaSha256=sha(actual.data);
      assert.equal(decodedRgbaSha256, frame.rgbaSha256);
      const rgbaKey=`${actual.info.width}x${actual.info.height}:${decodedRgbaSha256}`;
      if(!decodedRgbaGroups.has(rgbaKey))decodedRgbaGroups.set(rgbaKey,{rgbaSha256:decodedRgbaSha256,width:actual.info.width,height:actual.info.height,files:[]});
      decodedRgbaGroups.get(rgbaKey).files.push(frame.file);
      const expected = Buffer.alloc(actual.data.length), rect = frame.atlasRect;
      for (let y = 0; y < rect.height; y++) source.data.copy(expected, y * clip.frameWidth * 4, ((rect.y + y) * source.info.width + rect.x) * 4, ((rect.y + y) * source.info.width + rect.x + rect.width) * 4);
      assert.ok(actual.data.equals(expected), `${clip.id} #${frame.number}: source RGBA mismatch.`);
      let transparent = 0, visible = 0;
      for (let i = 3; i < actual.data.length; i += 4) { if (actual.data[i] === 0) transparent++; if (actual.data[i] >= 16) visible++; }
      assert.ok(transparent > 0 && visible > 0, `${clip.id} #${frame.number}: alpha requirement failed.`);
      let sourceTransparent=0,sourceVisible=0,sourceEdgeVisible=0,sourceAbove2=0;
      for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
        const alpha=actual.data[(y*clip.frameWidth+x)*4+3];
        if(alpha===0)sourceTransparent++;if(alpha>=16)sourceVisible++;
        if(x===0 || y===0 || x===rect.width-1 || y===rect.height-1){if(alpha>=16)sourceEdgeVisible++;if(alpha>2)sourceAbove2++;}
      }
      assert.ok(sourceTransparent>0 && sourceVisible>0,`${clip.id}: real transparency must exist before padding.`);
      assert.equal(frame.sourceCellAlphaInspection.transparentPixels,sourceTransparent);
      assert.equal(frame.sourceCellAlphaInspection.visiblePixelsAtAlpha16,sourceVisible);
      assert.equal(frame.sourceCellAlphaInspection.edgeVisiblePixelsAtAlpha16,sourceEdgeVisible);
      assert.equal(frame.sourceCellAlphaInspection.edgePixelsAboveAlpha2,sourceAbove2);
      if(sourceEdgeVisible)sourceVisibleEdgeCells++;
      sourceVisibleEdgePixels+=sourceEdgeVisible;
      if(sourceAbove2){sourceEdgeAbove2Cells++;edgeAbove2Pages.add(clip.id);}
      const imported = page.frames[frame.index];
      assert.equal(imported.number, frame.number);
      assert.deepEqual(imported.pivot, {x: frame.pivot.x + 2, y: frame.pivot.y + 2});
      assert.deepEqual(frame.drawOffset, {x: frame.anchorTarget.x - frame.pivot.x, y: frame.anchorTarget.y - frame.pivot.y});
      for (let y = 0; y < page.cellHeight; y++) {
        const rowStart = ((imported.atlasRect.y + y) * page.atlasWidth + imported.atlasRect.x) * 4;
        for (let x = 0; x < page.cellWidth; x++) {
          if (x < 2 || y < 2 || x >= page.cellWidth - 2 || y >= page.cellHeight - 2) { assert.equal(guarded.data[rowStart + x * 4 + 3], 0, `${clip.id}: nontransparent guard.`); transparentGuardPixels++; }
        }
        if (y >= 2 && y < page.cellHeight - 2) {
          const sourceStart = (y - 2) * clip.frameWidth * 4;
          assert.ok(guarded.data.subarray(rowStart + 8, rowStart + 8 + clip.frameWidth * 4).equals(actual.data.subarray(sourceStart, sourceStart + clip.frameWidth * 4)), `${clip.id}: guard packing altered RGBA.`);
          protectedPixels += clip.frameWidth;
        }
      }
      frames++;
    }
  }
  assert.equal(frames, manifest.frameCount);
  return {status: 'passed', sourceAtlases: manifest.clips.length, frames,uniqueDecodedRgbaFrames:decodedRgbaGroups.size,uniqueDecodedRgbaHashes:new Set([...decodedRgbaGroups.values()].map(group=>group.rgbaSha256)).size,duplicateDecodedRgbaGroups:[...decodedRgbaGroups.values()].filter(group=>group.files.length>1),exactRgbaPixels: protectedPixels, transparentGuardPixels,sourceCellEdges:{scope:'Actual source rectangles before transparent padding',visibleAtAlpha16Cells:sourceVisibleEdgeCells,visibleAtAlpha16Pixels:sourceVisibleEdgePixels,aboveAlpha2Cells:sourceEdgeAbove2Cells,aboveAlpha2Pages:edgeAbove2Pages.size},playbackRegistry: true, artisticApproval: false};
}
if (require.main === module) check(path.resolve(process.argv[2] || __dirname)).then(result => console.log(JSON.stringify(result))).catch(error => {console.error(error.stack); process.exitCode = 1;});
module.exports = {check};

