import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ROOT,REGISTRY,OUTPUTS,verifyRegistryV107,collectFollowupV107,buildSheetsV107,writeWorkbookV107,verifyWorkbookV107,generateFollowupV107} from '../scripts/build-excel-followup-v107.mjs';
const source=()=>fs.readFile(path.join(ROOT,REGISTRY),'utf8').then(JSON.parse);
const snapshot=await collectFollowupV107();
const workbook=await writeWorkbookV107(snapshot.baseline,buildSheetsV107(snapshot));
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'excel-v107-tests-'));after(()=>fs.rm(temporary,{recursive:true,force:true}));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('all eight original families and the supplemental Homeworld flow have bounded current workstreams',async()=>{
 const registry=await source();verifyRegistryV107(registry);assert.equal(snapshot.workstreams.length,9);assert.equal(snapshot.families.length,8);assert.equal(snapshot.originalOpenItems.length,77);assert.equal(snapshot.facts.completeCharacters,0);
});

test('a naked PASS, missing freeze, source disarm fiction and unknown family cannot promote delivery',async()=>{
 for(const mutate of [r=>r.workstreams[0].status='TERMINE',r=>r.workstreams.find(row=>row.id==='pit-actions').status='VALIDE_CIBLE',r=>r.sourceActionClaims.find(row=>row.actionId==='CIN_F003_CLEMENCE').status='VALIDE_CIBLE',r=>r.workstreams.pop(),r=>r.baseline.sha256='0'.repeat(64)]){const registry=await source();mutate(registry);assert.throws(()=>verifyRegistryV107(registry));}
});

test('73 worksheets retain every historical value, formula, table, style prefix and60 sheet parts',async()=>{
 const structural=await verifyWorkbookV107(workbook,snapshot.baseline);assert.equal(structural.sheetNames.length,73);assert.equal(structural.originalSheetsPreserved,60);assert.equal(structural.originalSheetValuesFormulasTablesPreserved,true);assert.equal(structural.originalStylePrefixPreserved,true);assert.equal(structural.activeSheet,'SyntheseV107');assert.ok(structural.originalZipPartsByteIdentical>=73);assert.equal(structural.formulas.length,6);
});

test('all77 original open rows remain exact and their V107 partial reference annotations cannot close a kit',async()=>{
 const original=JSON.parse(await fs.readFile(path.join(ROOT,'docs/v106-workstreams.json')));
 for(const row of original.openItems){const next=snapshot.originalOpenItems.find(item=>item.id===row.id);for(const key of Object.keys(row))assert.deepEqual(next[key],row[key]);}
 assert.equal(snapshot.facts.existingV79ReferencedIdentities,2);assert.equal(snapshot.facts.unresolvedRosterIdentities,4);assert.equal(snapshot.delivery.completeKits,'OUVERT');
});

test('source campaigns and variant cells survive independently of exercises, skins and mechanics',async()=>{
 const scope=JSON.parse(await fs.readFile(path.join(ROOT,'app/game/data/pitWorkbookScopeV105.json')));
 assert.equal(snapshot.campaignStages.length,16);assert.equal(snapshot.variantConstraints.length,14);
 for(const row of snapshot.variantConstraints){const source=scope.fighters.find(item=>item.fighterId===row.fighterId).variantConstraints.find(item=>item.id===row.id);for(const key of ['id','key','sheet','cell','sourceText'])assert.equal(row[key],source[key]);assert.equal(row.status,'OPEN_SOURCE_CONSTRAINT');assert.equal(row.fullKitComplete,false);}
 assert.ok(snapshot.campaignStages.every(row=>row.status==='OUVERT_SOURCE_NOT_DELIVERED'));assert.equal(snapshot.facts.campaignStagesComplete,0);assert.equal(snapshot.facts.variantConstraintsComplete,0);
});

test('source drawings, separate workshops and declared Preserve counts grant no unproved complete-state claims',()=>{
 assert.equal(snapshot.actions.length,52);assert.equal(snapshot.variantCapabilities[0].nativeActions.length,26);assert.equal(snapshot.variantCapabilities[1].nativeActions.length,26);assert.equal(snapshot.variantCapabilities[2].nativeClips.length,7);assert.equal(snapshot.clans.length,6);assert.ok(snapshot.clans.every(row=>row.campaignAcquisitionAdmitted===false));assert.equal(snapshot.facts.preserveDeclaredSectors,8);assert.equal(snapshot.facts.preserveDeclaredFighters,16);assert.equal(snapshot.preserve[0].sourceH001H100Bindings,0);
 if(snapshot.baselineFreeze==='PENDING_RUNTIME_FREEZE'){assert.equal(snapshot.facts.sourceRuntimeBindings,40);assert.equal(snapshot.facts.sourceActionsRemaining,12);assert.equal(snapshot.openItems.length,77);assert.equal(snapshot.facts.preserveSectors,4);assert.equal(snapshot.facts.preserveFighters,8);}
});

test('a modified historical cell is rejected by the independent ZIP/XML verifier',async()=>{
 const current=path.join(temporary,'valid.xlsx'),forged=path.join(temporary,'forged.xlsx');await fs.writeFile(current,workbook);
 execFileSync('python3',['-c',String.raw`import sys
from zipfile import ZipFile,ZIP_STORED
import xml.etree.ElementTree as E
with ZipFile(sys.argv[1]) as a,ZipFile(sys.argv[2],'w',compression=ZIP_STORED) as b:
 for name in a.namelist():
  raw=a.read(name)
  if name=='xl/worksheets/sheet1.xml':
   root=E.fromstring(raw);next(root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')).text='999999';raw=E.tostring(root)
  b.writestr(name,raw)
`,current,forged]);
 await assert.rejects(verifyWorkbookV107(await fs.readFile(forged),snapshot.baseline));
});

test('generation and --check reproduce the exact current products without pretending native Excel ran',async()=>{
 const outputDir=path.join(temporary,'products');const generated=await generateFollowupV107({outputDir});const checked=await generateFollowupV107({outputDir,check:true});assert.equal(generated.workbookSha256,checked.workbookSha256);assert.equal(sha(await fs.readFile(path.join(outputDir,OUTPUTS[1]))),generated.workbookSha256);assert.equal(generated.qa.nativeExcelApplicationVerified,false);assert.equal(generated.qa.nativeExcelCalculationEngineExecuted,false);
});
