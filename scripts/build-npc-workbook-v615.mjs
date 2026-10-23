import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {FileBlob,SpreadsheetFile,Workbook} from '@oai/artifact-tool';

// Run this builder from an isolated primary-runtime tmp directory, with the
// repository root as cwd. --inspect-only never changes or exports a workbook.
// A serialized checkpoint allows bounded-memory export and rendering passes.
const repo=process.cwd();
const packagePath='docs/suivi-production/v615';
const sourcePath='docs/suivi-production/v614/Yautja_Suivi_Variantes_V614_2026-10-23.xlsx';
const baselinePath='docs/suivi-production/v614/data/current-master.json.gz';
const out=path.resolve(repo,process.argv.find(x=>x.startsWith('--out='))?.slice(6)??packagePath);
const source=path.join(repo,sourcePath);
const previewOut=path.join(out,'workbook-preview');
const checkpoint=process.argv.find(x=>x.startsWith('--checkpoint='))?.slice(13);
const resuming=process.argv.includes('--resume-checkpoint');
const inspectOnly=process.argv.includes('--inspect-only');
const renderOnly=process.argv.includes('--render-only');
const refreshProductionNotes=process.argv.includes('--refresh-production-notes');
if((resuming||process.argv.includes('--checkpoint-only'))&&!checkpoint)throw Error('Pass --checkpoint=<absolute path>');
if(renderOnly&&!resuming)throw Error('--render-only requires --resume-checkpoint');
if(refreshProductionNotes&&!resuming)throw Error('--refresh-production-notes requires --resume-checkpoint');
await fs.mkdir(previewOut,{recursive:true});
const read=async p=>JSON.parse(await fs.readFile(path.join(repo,p),'utf8'));
const gzip=async p=>JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(repo,p))));
const manifestPath=packagePath+'/data/production-manifest.json';
const masterPath=packagePath+'/data/current-master.json.gz';
const reconciliationPath=packagePath+'/data/main-reconciliation.json';
const baseWorkbooksPath=packagePath+'/data/base-workbooks.json';
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const noteText=value=>Array.isArray(value)?value.join(' '):value;
const sourceBytes=await fs.readFile(source);
if(sha256(sourceBytes)!=='92b5bbcb95919db1a9e8eced6153a91f3dbfa3944bd37484c8852311a8250faa')throw Error('Published V6.14 workbook changed');
const inputPaths=[sourcePath,baselinePath,manifestPath,masterPath,reconciliationPath,baseWorkbooksPath];
const inputHashes=inspectOnly?null:Object.fromEntries(await Promise.all(inputPaths.map(async p=>[p,sha256(await fs.readFile(path.join(repo,p)))])));
let serialized;
if(resuming){
 serialized=JSON.parse(zlib.gunzipSync(await fs.readFile(checkpoint)));
 if(serialized.schemaVersion!=='yautja-workbook-v615-checkpoint-1'||JSON.stringify(serialized.inputHashes)!==JSON.stringify(inputHashes))throw Error('Stale workbook checkpoint: an audited input changed');
}
const memory=label=>{
 global.gc?.();
 const usage=process.memoryUsage();
 console.log(label+' '+JSON.stringify({rssMiB:Math.round(usage.rss/1048576),heapUsedMiB:Math.round(usage.heapUsed/1048576)}));
};
console.log(resuming?'Loading the verified workbook checkpoint':'Importing the published V6.14 workbook');
const wb=resuming?Workbook.load(serialized.workbook):await SpreadsheetFile.importXlsx(await FileBlob.load(source));
serialized=undefined;
const summary=wb.worksheets.getItem('Synthèse');
const production=wb.worksheets.getItem('Production PR');
memory(resuming?'Loaded checkpoint':'Imported V6.14');
if(inspectOnly){
 console.log((await wb.inspect({kind:'region',sheetId:'Synthèse',range:'A10:J16',maxChars:2300,tableMaxRows:7,tableMaxCols:10})).ndjson);
 for(const [sheetName,range,name] of [['Synthèse','A1:J23','before-summary.png'],['Production PR','A166:J168','before-production.png'],['Classeurs','A26:F28','before-workbooks.png']]){
  const png=await wb.render({sheetName,range,scale:1.4,format:'png'});
  await fs.writeFile(path.join(previewOut,name),new Uint8Array(await png.arrayBuffer()));
  console.log('Rendered '+name);
 }
 process.exit(0);
}
const manifest=await read(manifestPath);
const master=await gzip(masterPath);
const reconciliation=await read(reconciliationPath);
const variants=wb.worksheets.getItem('Variantes');
if(manifest.assets.length!==18||new Set(manifest.assets.map(p=>p.id)).size!==18||manifest.assets.some(p=>p.variant!==2||p.familyId!=='sucklings'||p.plannedAppearance.lifeStage!=='infant'))throw Error('Expected the 18 infant Sucklings 02 assets');
const firstRow=169,lastRow=186;
if(!resuming){
 const baseline=await gzip(baselinePath);
 const allowedIds=new Set(manifest.assets.map(p=>p.id));
 const layout=await read('docs/suivi-production/v611/references/source-layout.json');
 const columnIndex=label=>[...label].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
 let changedCells=0;
 const oldById=new Map(baseline.rows.map(r=>[r.values.A,r]));
 const changes=[];
 if(master.rows.length!==5120||oldById.size!==5120)throw Error('Stable 5,120-row master required');
 for(const row of master.rows){
  const old=oldById.get(row.values.A);if(!old)throw Error('Unknown identity '+row.values.A);
  if(row.rowNumber!==old.rowNumber||row.rowNumber<7||row.rowNumber>5126)throw Error('Unexpected row '+row.values.A);
  const cells=[...new Set([...Object.keys(old.values),...Object.keys(row.values)])].filter(c=>row.values[c]!==old.values[c]).map(c=>[c,row.values[c]??null]);
  if(cells.length){
   if(!allowedIds.has(row.values.A))throw Error('Unaudited changed identity '+row.values.A);
   changes.push({id:row.values.A,rowNumber:row.rowNumber,cells});
  }
 }
 if(changes.length!==18)throw Error('Only the 18 new V6.15 rows may change; V6.14 remains unmerged');
 const allowedColumns=new Set(['E','G','AA','AB','AC','AE','AH','AI']);
 for(const row of changes)for(const [column] of row.cells)if(!allowedColumns.has(column))throw Error('Unaudited changed column '+column);
 // Two bounded writes preserve every source cell outside the audited changes.
 for(const band of [{address:'E7:G5126',offset:4,width:3},{address:'AA7:AI5126',offset:26,width:9}]){
  const range=variants.getRange(band.address),values=range.values;
  if(values.length!==5120||values.some(row=>row.length!==band.width))throw Error('Unexpected Variantes band');
  for(const row of changes)for(const [c,v] of row.cells){
   const column=columnIndex(c)-band.offset;
   if(column<0||column>=band.width)continue;
   values[row.rowNumber-7][column]=v;changedCells++;
  }
  range.values=values;memory('Updated '+band.address);
 }
 if(changedCells!==changes.reduce((n,row)=>n+row.cells.length,0))throw Error('An audited change was not applied');
 await fs.writeFile(path.join(previewOut,'applied-master-changes.json'),JSON.stringify({changedCells,changedRows:changes.length,changes},null,2)+'\n');
 const col=i=>{let s='';for(;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
 const added=manifest.assets.map(p=>{
  const values={A:p.id,B:p.groupFR,C:p.variant,D:p.nameFR,E:p.priorStatusFR,F:p.statusFR,G:'Oui',H:'Oui',I:'Non',J:'Non',
   K:p.repoPngPath,L:p.sha256,M:p.bytes,N:p.generatedAtUtc?new Date(p.generatedAtUtc):null,O:noteText(p.visualInspection.notesFR),
   P:Array.isArray(p.visualInspection.limitationsFR)?p.visualInspection.limitationsFR.join(' '):p.visualInspection.limitationsFR,
   Q:p.plannedAppearance.morphologyFR,R:p.plannedAppearance.skinDirectionFR,S:p.plannedAppearance.armorDirectionFR,
   T:p.references.map(r=>r.repoPath).join(' | '),U:'Non',V:p.userOverrides.join(' '),W:'Vérifié localement',X:'V6.15',Y:new Date(p.verifiedAtUtc??manifest.verifiedAtUtc)};
  if(!values.N||Number.isNaN(values.N.getTime())||Number.isNaN(values.Y.getTime()))throw Error('Missing receipt/verification timestamp '+p.id);
  return Array.from({length:25},(_,i)=>values[col(i+1)]??null);
 });
 production.tables.items[0].rows.add(null,added);
 production.getRange('A169:Y186').copyFrom(production.getRange('A151:Y168'),'all');
 production.getRange('A169:Y186').values=added;
 production.getRange('F169:F186').formulas=added.map((_,i)=>["=INDEX('Variantes'!$E$7:$E$5126,MATCH(A"+(firstRow+i)+",'Variantes'!$A$7:$A$5126,0))"]);
 production.getRange('N169:N186').setNumberFormat('dd/mm/yy hh:mm');
 production.getRange('Y169:Y186').setNumberFormat('dd/mm/yy hh:mm');
 production.getRange('A169:Y186').format.autofitRows();
 memory('Appended the 18 V6.15 production rows');

 // All 17 prior workbooks are inventoried separately and remain byte-identical.
 const baseWorkbooks=await read(baseWorkbooksPath);
 if(baseWorkbooks.sourceCommit!==reconciliation.previousProductionCommit||baseWorkbooks.count!==17)throw Error('Unexpected audited source workbook inventory');

 for(const name of ['Synthèse','Variantes','Production PR','Sources jeu','Classeurs','Contrôles']){
  const sheet=wb.worksheets.getItem(name);
  for(const table of sheet.tables.items)table.showFilterButton=true;
  // Restore the source solid CF fills lost by the importer, extending only
  // the production table whose rows were appended.
  sheet.getUsedRange().conditionalFormats.deleteAll();
  for(const cf of layout.sheets[name].conditionalFormats){
   const range=name==='Production PR'?cf.range.replace('42',String(lastRow)):name==='Classeurs'?cf.range.replace('25','28'):cf.range;
   sheet.getRange(range).conditionalFormats.add(cf.type,cf.config);
  }
 }
 production.getRange('W7:W186').conditionalFormats.add('containsText',{text:'Non retrouvé',format:{fill:'#FFF1D1',font:{color:'#785316',bold:true}}});
 const put=(sheet,address,value)=>{sheet.getRange(address).values=[[value]];global.gc?.();};
 const prNumber=reconciliation.successorPullRequestNumber;
 if(!Number.isInteger(prNumber))throw Error('Actual V6.15 pull request number required');
 put(summary,'A3',`État au 23 octobre 2026. Main vérifié : ${reconciliation.currentMainCommit.slice(0,7)} (V106). V6.11 à V6.13 fusionnés (PR nº 7, 9 et 10). V6.14 et V6.15 dans la PR nº ${prNumber}.`);
 put(summary,'A5','5 120 IDs suivis. Production PR conserve les 36 traces V6.10 et documente 144 PNG disponibles des lots V6.11 à V6.15.');
 put(summary,'A17','Historique V6.9 : 1 207 acceptés, dont 169 à vérifier. V6.10 : 36 PNG à retrouver. V6.11–V6.13 : 108 PNG dans main. V6.14–V6.15 : 36 hors main, dont 18 jeunes PNJ V6.15.');
 put(summary,'G12','Dans main V106');
 put(summary,'G13','Dont originaux V5 / V6 récupérés');
 put(summary,'G17','12 originaux dans main, dont V5 et V6 fusionnés via la PR nº 7. Les copies identiques ne sont pas recomptées. Le présent suivi s’y ajoute.');
 put(summary,'J11',12);put(summary,'J12',12);
 put(summary,'G20','Production V6.15 dans la branche');
 put(summary,'G21','Nouveaux PNG V6.15');
 put(summary,'G23','PNG disponibles V6.11–V6.15');
 summary.getRange('J21').formulas=[['=COUNTIFS(\'Production PR\'!$X$7:$X$186,"V6.15")']];
 summary.getRange('J22').formulas=[['=COUNTIFS(\'Production PR\'!$W$7:$W$186,"Non retrouvé")']];
 summary.getRange('J23').formulas=[['=COUNTIFS(\'Production PR\'!$W$7:$W$186,"Vérifié localement")']];
 put(production,'A2','Yautja — production PNJ V6.10 à V6.15');
 put(production,'A3',`180 productions : 36 PNG V6.10 à retrouver, 108 V6.11–V6.13 dans main et 36 V6.14–V6.15 dans la PR nº ${prNumber}. V6.15 : N observation du retour de génération (UTC), Y vérification (UTC). Les dates historiques absentes restent vides.`);
 const controls=wb.worksheets.getItem('Contrôles');
 put(controls,'B11','Quatre anciennes tentatives restent non retrouvées. Les PNG V6.10 restent à retrouver. Les lots V6.11 à V6.14 couvrent les variantes Enforcers 04 à 10 des 18 groupes. V6.15 ajoute les 18 jeunes PNJ Sucklings 02.');
 put(controls,'B14',`Main : blobs Git et registres. V6.10 : empreintes historiques de l’Excel récupéré. V6.11 à V6.13 : 108 PNG dans main ${reconciliation.currentMainCommit.slice(0,7)}. V6.14 et V6.15 : 36 PNG natifs contrôlés dans la PR nº ${prNumber}, dont 18 nouveaux V6.15.`);
 put(controls,'B36',2197);put(controls,'B39',2682);put(controls,'B41',36);
 put(controls,'A43','Statuts au 23/10/2026 : 36 traces V6.10 sans PNG retrouvé, 108 PNG V6.11–V6.13 dans main et 36 PNG V6.14–V6.15 hors main. Aucun nouveau placement ni animation. Les dates historiques manquantes restent vides.');
 for(const r of [11,14,43])controls.getRange('A'+r+':F'+r).format.autofitRows();
 memory('Updated delivery summaries and preserved source features');
}
if(refreshProductionNotes){
 production.getRange('O169:O186').values=manifest.assets.map(p=>[noteText(p.visualInspection.notesFR)]);
 production.getRange('A169:Y186').format.autofitRows();
 memory('Normalized the 18 new production notes as readable text');
}
wb.recalculate();
const expected=['Présente dans main','Produite — à vérifier','Perdue — à recréer','Pas faite','Conservée hors main'].map(k=>master.statusCounts[k]??0);
const actual=summary.getRange('B11:B15').values.flat();
if(JSON.stringify(actual)!==JSON.stringify(expected)||JSON.stringify(expected)!==JSON.stringify([2197,205,0,2682,36]))throw Error('Status counts: '+JSON.stringify({actual,expected}));
if(JSON.stringify(summary.getRange('J21:J23').values.flat())!==JSON.stringify([18,36,144]))throw Error('Production summary mismatch');
if(summary.getRange('J11').values[0][0]!==12||summary.getRange('J12').values[0][0]!==12||summary.getRange('J13').values[0][0]!==2)throw Error('Workbook summary mismatch');
if(!resuming){
 const first=manifest.assets[0];
 variants.getRange('E'+first.sourceWorkbookRow).values=[['Produite — à vérifier']];wb.recalculate();
 const reaction={checking:summary.getRange('B12').values[0][0],conserved:summary.getRange('B15').values[0][0],productionStatus:production.getRange('F169').values[0][0],conservedCheck:wb.worksheets.getItem('Contrôles').getRange('D41').values[0][0]};
 if(reaction.checking!==206||reaction.conserved!==35||reaction.productionStatus!=='Produite — à vérifier'||reaction.conservedCheck!=='Écart depuis l’audit')throw Error('Status recalculation failed: '+JSON.stringify(reaction));
 variants.getRange('E'+first.sourceWorkbookRow).values=[['Conservée hors main']];wb.recalculate();
 await fs.writeFile(path.join(previewOut,'recalculation-check.json'),JSON.stringify({passed:true,temporaryInputRestored:true,reaction,finalCounts:summary.getRange('B11:B15').values.flat(),finalControl:wb.worksheets.getItem('Contrôles').getRange('D41').values[0][0]},null,2)+'\n');
}
if(checkpoint&&(!resuming||refreshProductionNotes)){
 memory('Serializing the verified workbook checkpoint');
 await fs.writeFile(checkpoint,zlib.gzipSync(JSON.stringify({schemaVersion:'yautja-workbook-v615-checkpoint-1',inputHashes,workbook:wb.toProto()})));
 console.log('Saved checkpoint '+checkpoint);
 if(process.argv.includes('--checkpoint-only'))process.exit(0);
}
if(!renderOnly){
 memory('Exporting the verified workbook');
 const output=await SpreadsheetFile.exportXlsx(wb);
 const destination=path.join(out,'Yautja_Suivi_Variantes_V615_2026-10-23.xlsx');
 // Artifact Tool may write a large inspection sidecar beside the saved XLSX.
 // Save into a dedicated temporary directory, then publish only the XLSX.
 const temporaryRoot=path.join(os.tmpdir(),'yautja-v615-excel');
 await fs.mkdir(temporaryRoot,{recursive:true});
 const temporaryExport=await fs.mkdtemp(path.join(temporaryRoot,'export-'));
 const stagedWorkbook=path.join(temporaryExport,path.basename(destination));
 await output.save(stagedWorkbook);
 const stagedBytes=await fs.readFile(stagedWorkbook);
 await fs.copyFile(stagedWorkbook,destination);
 const publishedBytes=await fs.readFile(destination);
 if(!publishedBytes.equals(stagedBytes))throw Error('Exported XLSX copy is not byte-identical');
 const exportSummary={
  schemaVersion:'yautja-workbook-bounded-export-v615-1',kind:'export-summary',
  file:path.basename(destination),bytes:publishedBytes.length,sha256:sha256(publishedBytes),
  sourceWorkbook:sourcePath,sourceSha256:inputHashes[sourcePath],
  manifestSha256:inputHashes[manifestPath],masterSha256:inputHashes[masterPath],
  statusCounts:master.statusCounts,productionRows:180,newProductionRows:18,
  validationReports:['openxml-verification.json','recalculation-check.json','visual-review.json'],
  diagnosticsPolicyFR:'Les diagnostics automatiques complets restent dans le dossier temporaire d’export ; seul le XLSX est copié dans la livraison.'
 };
 const boundedRecord=JSON.stringify(exportSummary)+'\n';
 if(Buffer.byteLength(boundedRecord,'utf8')>16384)throw Error('Export summary exceeds the 16 KiB publication limit');
 await fs.writeFile(path.join(previewOut,'export-inspection.ndjson'),boundedRecord);
 console.log('Exported '+destination);
}
if(process.argv.includes('--export-only'))process.exit(0);
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},summary:'final formula error scan'});
await fs.writeFile(path.join(previewOut,'formula-scan.ndjson'),errors.ndjson);
console.log((await wb.inspect({kind:'region',sheetId:'Synthèse',range:'A10:J16',maxChars:2300,tableMaxRows:7,tableMaxCols:10})).ndjson);
for(const [sheetName,range,name] of [['Synthèse','A1:J23','after-summary.png'],['Production PR','A168:J171','after-production.png'],['Contrôles','A31:D41','after-checks.png'],['Classeurs','A26:F28','after-workbooks.png']]){
 const png=await wb.render({sheetName,range,scale:1.4,format:'png'});
 await fs.writeFile(path.join(previewOut,name),new Uint8Array(await png.arrayBuffer()));
 console.log('Rendered '+name);
}
