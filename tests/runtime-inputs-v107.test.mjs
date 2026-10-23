import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {collectRuntimeInputsV107} from '../scripts/collect-v107-runtime-inputs.mjs';
const inventory=await collectRuntimeInputsV107();

test('the pre-freeze inventory covers all four domains and keeps proof/master documents outside its inputs',()=>{
 assert.equal(inventory.schemaVersion,1);assert.equal(inventory.status,'INPUTS_ONLY');assert.ok(inventory.assets.length>=170);assert.equal(new Set(inventory.assets.map(row=>row.path)).size,inventory.assets.length);assert.ok(inventory.inputs.every(row=>!row.path.startsWith('docs/')));
 for(const file of ['public/audio/ambience/ship/v54.wav','public/audio/sfx/scan/v54.wav','public/game/homeworld/v77/fauna/yautja-horse-corrected.png','public/game/sprites/v7/enemies/humanoid-badblood/colonial-marine-sheet.png','public/game/sprites/v93/pit/scar/006-scar-masked-idle-r2-v93.png','public/game/homeworld/v80/sealed-cargo-case-left.png'])assert.ok(inventory.assets.some(row=>row.path===file),file);
 assert.equal(inventory.assets.filter(row=>row.mediaType==='audio/wav').length,2);assert.equal(inventory.variantCapabilities[2].nativeClips.length,7);assert.equal(inventory.variantCapabilities[2].sourceRecipeOwnershipAllowed,false);
 for(const row of inventory.assets){assert.match(row.sha256,/^[a-f0-9]{64}$/);assert.ok(row.bytes>0);assert.equal(inventory.inputs.find(input=>input.path===row.path).sha256,row.sha256);}
});

test('root-pinned art deduplicates safely without overwriting a historical identity or modifying its file',async()=>{
 const source=JSON.parse(await fs.readFile('docs/suivi-production/v613/data/production-manifest.json'));
 const asset=source.assets[0],row={path:asset.repoPngPath,sha256:asset.sha256,bytes:asset.bytes,scope:'Existing static historical art, no new identity/animation.'};
 const bytes=await fs.readFile(row.path),result=await collectRuntimeInputsV107({additionalAssets:[row,row]});assert.equal(result.assets.length,inventory.assets.length+(inventory.assets.some(input=>input.path===row.path)?0:1));assert.equal(result.assets.find(input=>input.path===row.path).sha256,row.sha256);assert.deepEqual(await fs.readFile(row.path),bytes);
});

test('unbounded public paths, unpinned additions and contradictory hashes are rejected',async()=>{
 const row=inventory.assets[0];
 for(const changed of [{...row,path:'../docs/secret.json'},{...row,path:'/tmp/art.png'},{...row,sha256:undefined},{...row,sha256:'0'.repeat(64)}])await assert.rejects(collectRuntimeInputsV107({additionalAssets:[changed]}));
});
