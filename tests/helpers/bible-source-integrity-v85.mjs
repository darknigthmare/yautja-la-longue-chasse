import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../../',import.meta.url);
const expectedSource={workbook:'Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx',sha256:'87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183',totalWorkbookSheets:139};
const paths=['public/game/dialogues/v85/bible-dialogues.json','public/game/dialogues/v85/bible-ships.json','app/game/data/shipFlightSourceV87.json','app/game/data/shipPreparationSourceV88.json'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function optionalFile(path,required=false){
 try{return await readFile(path);}catch(error){if(error.code==='ENOENT'&&!required)return null;throw error;}
}

/** Portable integrity audit of the committed authorized extraction. Historical
 * receipts attest the original import; absent private bytes are never reported
 * as re-read. Providing YAUTJA_V6_SOURCE_PATH makes that original mandatory. */
export async function verifyBibleSourceIntegrityV85(source){
 const receipt=JSON.parse(await readFile(new URL('docs/bible-dialogues-v85-integrity-receipt.json',root),'utf8'));
 assert.equal(receipt.schemaVersion,1);assert.deepEqual(receipt.source,expectedSource);
 for(const [key,value] of Object.entries(expectedSource))assert.equal(source[key],value,'unchanged workbook provenance: '+key);
 assert.deepEqual(receipt.files.map(file=>file.path).sort(),paths.slice().sort());
 const files=new Map();
 for(const file of receipt.files){
  assert.match(file.sha256,/^[a-f0-9]{64}$/);assert.match(file.unchangedSinceCommit,/^[a-f0-9]{40}$/);
  const bytes=await readFile(new URL(file.path,root));
  assert.equal(bytes.length,file.bytes,file.path+' byte count');assert.equal(sha(bytes),file.sha256,file.path+' immutable extraction bytes');
  const document=JSON.parse(bytes.toString('utf8'));
  for(const [key,value] of Object.entries(expectedSource))assert.equal(document.source[key],value,file.path+' source '+key);
  files.set(file.path,bytes);
 }
 const provenance=JSON.parse(await readFile(new URL(receipt.historicalSourceReceipt,root),'utf8'));
 const historical=JSON.parse(await readFile(new URL(receipt.historicalValidationReceipt,root),'utf8'));
 assert.equal(provenance.distribution,'public-approved');
 for(const [key,value] of Object.entries(expectedSource))assert.equal(provenance.source[key],value);
 assert.equal(historical.originalWorkbookSha256,expectedSource.sha256);
 assert.equal(historical.result,'passed');assert.equal(historical.failed,0);assert.equal(historical.publicCopiesEqualPrivateExtractions,true);
 assert.deepEqual(JSON.parse(await readFile(new URL('public/game/dialogues/v85/bible-dialogues-index.json',root),'utf8')),provenance);

 const originalPath=process.env.YAUTJA_V6_SOURCE_PATH??new URL('work-local/drive-import-20261007/downloads/'+expectedSource.workbook,root);
 const original=await optionalFile(originalPath,process.env.YAUTJA_V6_SOURCE_PATH!==undefined);
 if(original)assert.equal(sha(original),expectedSource.sha256,'original workbook bytes when supplied');
 let privateCopiesVerified=0;
 for(const name of ['bible-dialogues.json','bible-ships.json']){
  const copy=await optionalFile(new URL('work-local/drive-import-20261007/bible-v6-private/'+name,root));
  if(copy){assert.deepEqual(copy,files.get('public/game/dialogues/v85/'+name),'private/public bytes when supplied');privateCopiesVerified++;}
 }
 return{provenance,files,originalWorkbookVerified:original!==null,privateCopiesVerified};
}
