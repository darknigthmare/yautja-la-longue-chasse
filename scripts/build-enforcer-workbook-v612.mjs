import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {FileBlob,SpreadsheetFile,Workbook} from '@oai/artifact-tool';

// Run a copy of this builder in an isolated primary-runtime tmp directory,
// with the repository root as cwd. --inspect-only never exports a workbook.
// Use Node --expose-gc --max-old-space-size=2560. --checkpoint-only separates
// edits from export; --resume-checkpoint reloads that documented workbook
// serialization in a fresh process. --export-only skips optional rendering.
const repo=process.cwd();
const out=path.resolve(repo,process.argv.find(x=>x.startsWith('--out='))?.slice(6)??'docs/suivi-production/v612');
const source=path.join(repo,'docs/suivi-production/v611/Yautja_Suivi_Variantes_2026-10-21.xlsx');
const previewOut=path.join(out,'workbook-preview');
const checkpoint=process.argv.find(x=>x.startsWith('--checkpoint='))?.slice(13);
const resuming=process.argv.includes('--resume-checkpoint');
if((resuming||process.argv.includes('--checkpoint-only'))&&!checkpoint)throw Error('Pass --checkpoint=<absolute path>');
await fs.mkdir(previewOut,{recursive:true});
const memory=label=>{
 global.gc?.();
 const usage=process.memoryUsage();
 console.log(label+' '+JSON.stringify({rssMiB:Math.round(usage.rss/1048576),heapUsedMiB:Math.round(usage.heapUsed/1048576)}));
};
console.log(resuming?'Loading the verified workbook checkpoint':'Importing the published V6.11 workbook');
const wb=resuming?Workbook.load(JSON.parse(zlib.gunzipSync(await fs.readFile(checkpoint)))):await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const summary=wb.worksheets.getItem('Synthèse');
const production=wb.worksheets.getItem('Production PR');
memory(resuming?'Loaded checkpoint':'Imported V6.11');
if(process.argv.includes('--inspect-only')){
 console.log((await wb.inspect({kind:'region',sheetId:'Synthèse',range:'A10:F16',maxChars:1800,tableMaxRows:7,tableMaxCols:6})).ndjson);
 for(const [sheetName,range,name] of [['Synthèse','A10:F16','before-summary.png'],['Production PR','A76:J78','before-production.png']]){
  const png=await wb.render({sheetName,range,scale:1.4,format:'png'});
  await fs.writeFile(path.join(previewOut,name),new Uint8Array(await png.arrayBuffer()));
  console.log('Rendered '+name);
 }
 process.exit(0);
}
const read=async p=>JSON.parse(await fs.readFile(path.join(repo,p),'utf8'));
const gzip=async p=>JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(repo,p))));
const manifest=await read('docs/suivi-production/v612/data/production-manifest.json');
const master=await gzip('docs/suivi-production/v612/data/current-master.json.gz');
const variants=wb.worksheets.getItem('Variantes');
if(!resuming){
const baseline=await gzip('docs/suivi-production/v611/data/current-master.json.gz');
const layout=await read('docs/suivi-production/v611/references/source-layout.json');
const reconciliation=await read('docs/suivi-production/v612/data/main-reconciliation.json');
const columnIndex=label=>[...label].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
let changedCells=0;
{
 const oldById=new Map(baseline.rows.map(r=>[r.values.A,r]));
 const changes=[];
 for(const row of master.rows){
  const old=oldById.get(row.values.A);if(!old)throw Error('Unknown identity '+row.values.A);
  if(row.rowNumber!==old.rowNumber||row.rowNumber<7||row.rowNumber>5126)throw Error('Unexpected row '+row.values.A);
  const cells=Object.entries(row.values).filter(([c,v])=>v!==old.values[c]);
  if(cells.length)changes.push({rowNumber:row.rowNumber,cells});
 }
 if(changes.length!==72)throw Error('Unexpected audited row count');
 // The source sheet has no formulas. Preserve imported values in the two
 // changed column bands, patch only audited cells and release each matrix.
 // Two writes avoid hundreds of repeated automatic recalculations without
 // rewriting the other 24 columns of the 5,120-row source sheet.
 for(const band of [{address:'E7:G5126',offset:4,width:3},{address:'AA7:AI5126',offset:26,width:9}]){
  const range=variants.getRange(band.address);
  const values=range.values;
  if(values.length!==5120||values.some(row=>row.length!==band.width))throw Error('Unexpected Variantes band');
  for(const row of changes)for(const [c,v] of row.cells){
   const column=columnIndex(c)-band.offset;
   if(column<0||column>=band.width)continue;
   values[row.rowNumber-7][column]=v;changedCells++;
  }
  range.values=values;
  memory('Updated '+band.address);
 }
}
if(changedCells!==504)throw Error('Unexpected audited cell count');
memory(`Applied ${changedCells} audited value changes in two writes`);
const firstRow=79,lastRow=114;
const col=i=>{let s='';for(;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const added=manifest.assets.map(p=>{
 const values={A:p.id,B:p.groupFR,C:p.variant,D:p.nameFR,E:p.priorStatusFR,F:p.statusFR,G:'Oui',H:'Oui',I:'Non',J:'Non',
  K:p.repoPngPath,L:p.sha256,M:p.bytes,N:new Date(p.generatedAtUtc),O:p.visualInspection.notesFR,
  P:Array.isArray(p.visualInspection.limitationsFR)?p.visualInspection.limitationsFR.join(' '):p.visualInspection.limitationsFR,
  Q:p.plannedAppearance.morphologyFR,R:p.plannedAppearance.skinDirectionFR,S:p.plannedAppearance.armorDirectionFR,
  T:p.references.map(r=>r.repoPath).join(' | '),U:'Non',V:p.userOverrides.join(' '),W:'Vérifié localement',X:'V6.12',Y:new Date(manifest.generatedAtUtc)};
 return Array.from({length:25},(_,i)=>values[col(i+1)]??null);
});
if(added.length!==36)throw Error('Expected 36 new production rows');
production.tables.items[0].rows.add(null,added);
production.getRange('A79:Y114').copyFrom(production.getRange('A43:Y78'),'all');
production.getRange('A79:Y114').values=added;
production.getRange('F79:F114').formulas=added.map((_,i)=>["=INDEX('Variantes'!$E$7:$E$5126,MATCH(A"+(firstRow+i)+",'Variantes'!$A$7:$A$5126,0))"]);
production.getRange('N79:N114').setNumberFormat('dd/mm/yy hh:mm');
production.getRange('Y79:Y114').setNumberFormat('dd/mm/yy hh:mm');
production.getRange('A79:Y114').format.autofitRows();
memory('Appended and formatted the 36 new production rows');
for(const name of ['Synthèse','Variantes','Production PR','Sources jeu','Classeurs','Contrôles']){
 const sheet=wb.worksheets.getItem(name);
 for(const table of sheet.tables.items)table.showFilterButton=true;
 // Reapply the existing solid conditional formats: this importer can omit
 // their fills on export. No new business rule or color is introduced.
 sheet.getUsedRange().conditionalFormats.deleteAll();
 for(const cf of layout.sheets[name].conditionalFormats){
  const range=name==='Production PR'?cf.range.replace('42',String(lastRow)):cf.range;
  sheet.getRange(range).conditionalFormats.add(cf.type,cf.config);
 }
}
production.getRange('W7:W114').conditionalFormats.add('containsText',{text:'Non retrouvé',format:{fill:'#FFF1D1',font:{color:'#785316',bold:true}}});
memory('Preserved filters and conditional formats');
const put=(sheet,address,value)=>{sheet.getRange(address).values=[[value]];global.gc?.();};
put(summary,'A3',`État au 21 octobre 2026. Main vérifié : ${reconciliation.currentMainCommit}. V6.11 fusionné via la PR nº 7 ; V6.12 dans la PR nº ${reconciliation.successorPullRequestNumber}.`);
put(summary,'A5','5 120 IDs suivis. Production PR conserve les 36 traces V6.10 et documente 72 PNG disponibles des lots V6.11 et V6.12.');
put(summary,'A17','Historique V6.9 : 1 207 IDs acceptés, dont 169 à vérifier. Les 36 PNG V6.10 restent à retrouver. V6.11 : 36 PNG dans main. V6.12 : 36 nouveaux PNG hors main.');
put(summary,'G20','Production V6.12 dans la branche');
put(summary,'G21','Nouveaux PNG V6.12');
summary.getRange('J21').formulas=[['=COUNTIFS(\'Production PR\'!$X$7:$X$114,"V6.12")']];
summary.getRange('J22').formulas=[['=COUNTIFS(\'Production PR\'!$W$7:$W$114,"Non retrouvé")']];
summary.getRange('J23').formulas=[['=COUNTIFS(\'Production PR\'!$W$7:$W$114,"Vérifié localement")']];
put(production,'A2','Yautja — production Enforcers V6.10 à V6.12');
put(production,'A3',`108 productions documentées : 36 PNG V6.10 à retrouver, 36 V6.11 dans main et 36 V6.12 dans la PR nº ${reconciliation.successorPullRequestNumber}. Galerie et Codex sont raccordés. Aucun nouveau placement en scène.`);
put(wb.worksheets.getItem('Sources jeu'),'A3','Inventaire historique du main 536ac533 conservé. Les 36 PNG V6.11 ajoutés à main sont vérifiés séparément dans Production PR et dans la preuve de réconciliation. Plusieurs sources peuvent partager un ID ou une image.');
put(wb.worksheets.getItem('Classeurs'),'A3','9 classeurs distincts désormais présents dans main après fusion de la PR nº 7. Les 19 lignes historiques retracent aussi les copies, pertes et fichiers identifiés mais inaccessibles.');
const controls=wb.worksheets.getItem('Contrôles');
put(controls,'B11','Quatre anciennes tentatives restent non retrouvées. Leurs recréations V6.10 sont attestées dans l’Excel, mais les PNG ne sont pas récupérés. V6.11 couvre les variantes 04–05 et V6.12 les variantes 06–07.');
put(controls,'B14',`Main : blobs Git et registres. V6.10 : empreintes historiques de l’Excel récupéré. V6.11 : 36 PNG fusionnés via la PR nº 7 et revérifiés dans main ${reconciliation.currentMainCommit.slice(0,7)}. V6.12 : 36 PNG vérifiés dans la PR nº ${reconciliation.successorPullRequestNumber}.`);
put(controls,'B36',2125);
put(controls,'B39',2754);
put(controls,'A43','Statuts au 21/10/2026 : 36 traces V6.10 sans PNG retrouvé, 36 PNG V6.11 présents dans main et 36 PNG V6.12 hors main. La fusion V6.12 et les nouveaux placements en scène restent à effectuer.');
for(const r of [11,14,43])controls.getRange('A'+r+':F'+r).format.autofitRows();
}
wb.recalculate();
console.log('Recalculated the final status totals');
const expected=['Présente dans main','Produite — à vérifier','Perdue — à recréer','Pas faite','Conservée hors main'].map(k=>master.statusCounts[k]??0);
const actual=summary.getRange('B11:B15').values.flat();
if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Counts: '+JSON.stringify({actual,expected}));
if(JSON.stringify(summary.getRange('J21:J23').values.flat())!==JSON.stringify([36,36,72]))throw Error('Production summary mismatch');
const first=manifest.assets[0];
if(!resuming){
variants.getRange('E'+first.sourceWorkbookRow).values=[['Produite — à vérifier']];wb.recalculate();
const reaction={checking:summary.getRange('B12').values[0][0],conserved:summary.getRange('B15').values[0][0],productionStatus:production.getRange('F79').values[0][0]};
if(reaction.checking!==206||reaction.conserved!==35||reaction.productionStatus!=='Produite — à vérifier')throw Error('Status recalculation failed');
variants.getRange('E'+first.sourceWorkbookRow).values=[['Conservée hors main']];wb.recalculate();
await fs.writeFile(path.join(previewOut,'recalculation-check.json'),JSON.stringify({passed:true,temporaryInputRestored:true,reaction,finalCounts:summary.getRange('B11:B15').values.flat()},null,2));
}
if(checkpoint&&!resuming){
 memory('Serializing the verified workbook checkpoint');
 await fs.writeFile(checkpoint,zlib.gzipSync(JSON.stringify(wb.toProto())));
 console.log('Saved checkpoint '+checkpoint);
 if(process.argv.includes('--checkpoint-only'))process.exit(0);
}
memory('Exporting the verified workbook before optional rendering');
const output=await SpreadsheetFile.exportXlsx(wb);
const destination=path.join(out,'Yautja_Suivi_Variantes_V612_2026-10-21.xlsx');
await output.save(destination);
console.log('Exported '+destination);
if(process.argv.includes('--export-only'))process.exit(0);
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},summary:'final formula error scan'});
await fs.writeFile(path.join(previewOut,'formula-scan.ndjson'),errors.ndjson);
console.log((await wb.inspect({kind:'region',sheetId:'Synthèse',range:'A10:F16',maxChars:1800,tableMaxRows:7,tableMaxCols:6})).ndjson);
for(const [sheetName,range,name] of [['Synthèse','A10:F16','after-summary.png'],['Production PR','A78:J81','after-production.png'],['Contrôles','A31:D41','after-checks.png']]){
 const png=await wb.render({sheetName,range,scale:1.4,format:'png'});
 await fs.writeFile(path.join(previewOut,name),new Uint8Array(await png.arrayBuffer()));
 console.log('Rendered '+name);
}
