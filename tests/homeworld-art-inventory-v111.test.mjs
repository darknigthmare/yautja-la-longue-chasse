import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateArtInventoryV111,verifyArtInventoryIdentityV111} from '../scripts/audit-homeworld-art-v111.mjs';
const report=JSON.parse(await fs.readFile('docs/v111-homeworld-art-inventory.json','utf8'));

test('current354 art families retain their original source IDs and candidate statuses without pretending to be all absent or complete',async()=>{
  validateArtInventoryV111(report);
  const targets=JSON.parse(await fs.readFile('app/game/data/homeworldAssetCatalogueTargetV81.json','utf8'));
  assert.deepEqual(report.entries.map(row=>row.id),targets.entries.map(row=>row.id));
  assert.equal(report.counts.codexRecords,2772);assert.equal(report.counts.referencedLocalAssets,108);
  assert.equal(report.installedFiles.length,790);assert.equal(report.nativeDrawingAssets.length,4);
  for(const id of ['target-v81-59-87','target-v81-61-123','target-v81-62-138','target-v81-71-275','target-v81-76-345'])assert(report.entries.some(row=>row.id===id));
  assert.equal(report.extraArtNeeds[0].catalogue354Id,null);
});

test('a family candidate, copied native asset or mismatched count cannot be promoted to visual/source completion',()=>{
  for(const mutate of [
    r=>r.sourceClosures.push('target-v81-59-87'),r=>r.sourceCompletion=true,
    r=>r.entries[0].status='EXISTING_GOOD',r=>r.entries[0].currentAssessment='VISUALLY_CERTIFIED',
    r=>r.entries[0].id=r.entries[1].id,r=>r.entries.pop(),r=>r.counts.byCandidateStatus.MISSING++,
    r=>r.nativeDrawingAssets[0].actual=null,r=>r.nativeDrawingAssets[0].actual.gitBlobOid='a'.repeat(40),
    r=>r.extraArtNeeds[0].catalogue354Id='target-v81-59-87',
  ]){const candidate=structuredClone(report);mutate(candidate);assert.throws(()=>validateArtInventoryV111(candidate));}
});

test('current source bytes and four new PNGs are mandatory; old image repository identity is checked without claiming visual quality',async()=>{
  const result=await verifyArtInventoryIdentityV111(report);
  assert.equal(result.oldGitTreeIdentitiesVerified,790);assert(result.oldBytesVerified>=0&&result.oldBytesVerified<=790);
  assert.equal(result.newNativeBytesVerified,4);assert.equal(result.sourceInputsVerified,report.sourceInputs.length);assert.equal(result.visualCompletionVerified,false);
  for(const mutate of [r=>r.installedFiles[0].gitBlobOid='a'.repeat(40),r=>r.nativeDrawingAssets[0].actual.sha256='b'.repeat(64),r=>r.sourceInputs[0].sha256='c'.repeat(64)]){
    const changed=structuredClone(report);mutate(changed);await assert.rejects(verifyArtInventoryIdentityV111(changed));
  }
});
