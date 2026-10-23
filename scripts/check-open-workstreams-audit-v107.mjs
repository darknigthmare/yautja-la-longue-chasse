import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>fs.readFile(path.join(ROOT,file));
const json=async file=>JSON.parse(await read(file));
const EXPECTED={'pit-roster-kits':7,'war-structures':6,'enforcer-pngs':18,'preserve-expansion':2,'enforcer-provenance':2,'pit-actions':12,'pit-campaigns':16,'pit-variants':14};
const DOMAIN={'The Pit':'pit-roster-kits','Guerre de clans':'war-structures','Enforcers':'enforcer-pngs','Preserve Hunt':'preserve-expansion','Provenance Enforcers':'enforcer-provenance','The Pit · action':'pit-actions','The Pit · campagne':'pit-campaigns','The Pit · variante':'pit-variants'};

/** Check an audit against immutable source rows. This grants no gameplay PASS. */
export async function verifyOpenWorkstreamsAuditV107(audit=undefined){
 audit??=await json('docs/v107-open-workstreams-audit.json');
 assert.equal(audit.schemaVersion,1);assert.equal(audit.release,'V107');assert.equal(audit.status,'AUDIT_ONLY_NO_DELIVERY_PROMOTION');
 assert.equal(audit.baseCommit,'92e7c824fd80d6b8152855b3d66560448f8c48c0');
 const originalBytes=await read('docs/v106-workstreams.json');assert.equal(sha(originalBytes),'5b53f62f7e5b643c1cbd679f0c7177f35ca8e91f5d27e828963329d53463bfe2');
 const original=JSON.parse(originalBytes);assert.equal(audit.trackedOpenItems,77);assert.equal(audit.items.length,77);
 assert.equal(new Set(audit.items.map(item=>item.id)).size,77,'Duplicate open ID');
 assert.deepEqual(audit.families.map(f=>f.id).sort(),Object.keys(EXPECTED).sort(),'All eight families required');
 for(const row of original.openItems){
  const item=audit.items.find(item=>item.id===row.id);assert.ok(item,'Missing open source ID: '+row.id);
  for(const key of Object.keys(row))assert.deepEqual(item[key],row[key],'Changed original open row: '+row.id+'/'+key);
  assert.equal(item.familyId,DOMAIN[row.domain],'Misclassified source domain');assert.equal(item.auditStatus,'OUVERT_NON_PROMU','Audit cannot close delivery');
  assert.ok(item.evidenceRequired.length>=3,'Explicit proof requirements required');
 }
 for(const family of audit.families){
  const ids=audit.items.filter(item=>item.familyId===family.id).map(item=>item.id);
  assert.equal(family.count,EXPECTED[family.id]);assert.equal(family.expected,EXPECTED[family.id]);assert.deepEqual(family.itemIds,ids,'Family coverage changed');
 }
 for(const input of audit.inputs){
  assert.ok(typeof input.path==='string'&&!path.isAbsolute(input.path)&&!input.path.includes('\\')&&!input.path.split('/').includes('..'));
  const bytes=await read(input.path);assert.equal(bytes.length,input.bytes,'Audit input size changed: '+input.path);assert.equal(sha(bytes),input.sha256,'Audit input SHA changed: '+input.path);
 }
 const partials=[['add-last-hunt-super','user-last-hunt-super','last-hunt-super-referenced-stance-v79'],['add-avp-classic','user-avp-classic-2000','avp-classic-2000-referenced-stance-v79']];
 const roster=await json('app/game/data/pitUserHuntersV79.json');
 for(const[id,fighterId,variantId]of partials){
  const assessment=audit.items.find(item=>item.id===id).assessmentV107;
  assert.equal(assessment.status,'PARTIAL_REFERENCE_PRESENT_KIT_OPEN');assert.equal(assessment.fighterId,fighterId);assert.equal(assessment.variantId,variantId);
  assert.deepEqual(assessment.nativeFacings,['right']);assert.equal(assessment.leftDisplay,'PROVISIONAL_MIRROR_NOT_NATIVE');assert.equal(assessment.animated,false);assert.equal(assessment.canonicalFidelityCertified,false);
  const variant=roster.fighters.find(fighter=>fighter.id===fighterId).variants.find(variant=>variant.id===variantId);
  assert.equal(assessment.nativePages.length,1);const page=assessment.nativePages[0],bytes=await read(page.path);
  assert.equal(page.path,'public'+variant.src);assert.equal(page.sha256,sha(bytes));assert.equal(page.bytes,bytes.length);assert.equal(page.width,bytes.readUInt32BE(16));assert.equal(page.height,bytes.readUInt32BE(20));assert.equal(page.frames,1);assert.equal(page.nativeFacing,'right');
  assert.deepEqual(assessment.sourceUrls,variant.sourceUrls);assert.deepEqual(assessment.sourceNotes,variant.sourceNotes);
 }
 const rosterFamily=audit.families.find(family=>family.id==='pit-roster-kits');assert.equal(rosterFamily.existingStaticReferencedIdentities,2);assert.equal(rosterFamily.unresolvedIdentityAndArtFiles,4);assert.equal(rosterFamily.aggregateFullKitRecord,1);
 const hw=audit.supplementalHomeworld;assert.equal(hw.status,'OUTSIDE_THE_77_TRACKED_ROWS_NOT_COMPLETE');
 const catalogue=await json(hw.artTarget.path);assert.equal(catalogue.entries.length,354);assert.equal(hw.artTarget.entries,354);
 const corpus=await json('public/game/dialogues/v85/bible-dialogues.json');
 const ids=sheet=>corpus.sheets.find(s=>s.name===sheet).rows.flatMap(row=>row.cells.filter(cell=>/^A\d+$/.test(cell.address)&&typeof cell.value==='string'&&cell.value.startsWith('D6-')).map(cell=>cell.value));
 assert.deepEqual(hw.sourceDesignCounts,{allDomainsScenes:ids('Scènes de dialogue V6').length,allDomainsLines:ids('Répliques V6').length,allDomainsOptions:ids('Choix et actions V6').length,worldPrefixedSceneIds:ids('Scènes de dialogue V6').filter(id=>id.startsWith('D6-W-')).length});
 assert.equal(hw.sourceWorkbookAvailable,true);assert.equal(hw.sourceWorkbookSha256,corpus.source.sha256);
 assert.equal(sha(await read(hw.sourceWorkbook)),hw.sourceWorkbookSha256,'Original V6 source mismatch');
 const xml=JSON.parse(execFileSync('python3',['-c',String.raw`
import json,sys,xml.etree.ElementTree as E
from zipfile import ZipFile
with ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 book=E.fromstring(z.read('xl/workbook.xml'))
 ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 print(json.dumps({'sheets':len(book.find('s:sheets',ns)),'formulaExecution':False}))
`,path.join(ROOT,hw.sourceWorkbook)],{timeout:30000,maxBuffer:100000}).toString());
 assert.equal(xml.sheets,139);assert.equal(xml.formulaExecution,false);
 return {result:'PASS_AUDIT_STRUCTURE',trackedOpenItems:77,families:EXPECTED,originalV6Sheets:xml.sheets,sourceFingerprintsVerified:audit.inputs.length,runtimeOrBrowserValidationGranted:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await verifyOpenWorkstreamsAuditV107()));
