import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';

// Usage, from the repository root:
//   node scripts/build-enforcer-workbook-v611.mjs [output-directory]
// Prerequisites: Node.js and @oai/artifact-tool resolvable by this script in the
// spreadsheet editing runtime. @oai/artifact-tool is an editing dependency,
// not an application dependency; do not add it to the app's package manifest.
// Inputs come only from the versioned V6.11 documentation. The optional output
// directory receives the workbook and a workbook-preview subdirectory; it
// defaults to docs/suivi-production/v611. No second copy into the source folder
// is made when another output directory is selected.
const repo=process.cwd();
const sources=path.join(repo,'docs','suivi-production','v611');
const out=path.resolve(repo,process.argv[2]??path.join('docs','suivi-production','v611'));
const previewOut=path.join(out,'workbook-preview');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const readGzip=async p=>JSON.parse(zlib.gunzipSync(await fs.readFile(p)).toString('utf8'));
const source=await readGzip(path.join(sources,'references','source-workbook.json.gz'));
const layout=await read(path.join(sources,'references','source-layout.json'));
const manifest=await read(path.join(sources,'data','production-manifest.json'));
const current=await readGzip(path.join(sources,'data','current-master.json.gz'));
const prior=await read(path.join(sources,'data','prior-production-v610.json'));
const ci=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
const col=i=>{let s='';for(;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const rows=structuredClone(source.sheets);
const row=(name,r)=>{let x=rows[name].rows.find(x=>x.rowNumber===r);if(!x){x={rowNumber:r,values:{},cellTypes:{}};rows[name].rows.push(x);}return x;};
const put=(name,address,value)=>{const m=address.match(/^([A-Z]+)(\d+)$/),r=row(name,+m[2]);r.values[m[1]]=value;if(r.formulas)delete r.formulas[m[1]];};
const formula=(name,address,expr)=>{const m=address.match(/^([A-Z]+)(\d+)$/),r=row(name,+m[2]);(r.formulas??={})[m[1]]=expr;};
rows.Variantes.rows=[...rows.Variantes.rows.filter(r=>r.rowNumber<7),...current.rows];

put('Synthèse','A3','État au 21 octobre 2026. Main audité : 536ac53335e440747f6eccedd2cd757d1f817a99. Le lot V6.11 est conservé dans la branche de travail.');
put('Synthèse','A5','5 120 IDs suivis. Production PR conserve les 36 productions V6.10 et ajoute les 36 nouveaux PNG V6.11.');
put('Synthèse','G8','Recréations V6.10 documentées ; leurs fichiers sont à retrouver.');
put('Synthèse','A17','Historique V6.9 : 1 207 IDs acceptés, dont 169 à vérifier. Les 36 PNG V6.10 ne sont pas retrouvés à cette reprise. V6.11 ajoute 36 variantes jusque-là non faites.');
put('Synthèse','G20','Production V6.11 dans la branche');
put('Synthèse','G21','Nouveaux PNG V6.11');
formula('Synthèse','J21','COUNTIFS(\'Production PR\'!$X$7:$X$78,"V6.11")');
put('Synthèse','G22','PNG V6.10 à retrouver');
formula('Synthèse','J22','COUNTIFS(\'Production PR\'!$W$7:$W$78,"Non retrouvé")');
put('Synthèse','G23','PNG disponibles hors main');
formula('Synthèse','J23','COUNTIFS(\'Production PR\'!$W$7:$W$78,"Vérifié localement")');
put('Variantes','A3','Main audité le 21/10/2026. Les statuts distinguent les preuves historiques, les fichiers actuellement vérifiés et les variantes encore à produire.');
put('Production PR','A2','Yautja — production Enforcers V6.10 et V6.11');
put('Production PR','A3','72 productions documentées : 36 PNG V6.10 non retrouvés à la reprise et 36 nouveaux PNG V6.11 vérifiés. Les colonnes Galerie et Codex décrivent la branche de travail actuelle. Publication GitHub à confirmer.');
put('Production PR','N6','Production relevée (UTC)');
for(const [c,v] of Object.entries({W:'Disponibilité actuelle du PNG',X:'Lot de production',Y:'Vérification (UTC)'}))put('Production PR',`${c}6`,v);
for(const p of prior.records){
 const r=row('Production PR',p.sourceRow);
 r.values.G='Non';r.values.H='Non';
 r.values.V=[r.values.V,'Historique V6.10 : galerie et codex étaient indiqués reliés le 20/10. Le PNG et la branche de cette production ne sont pas retrouvés à la reprise.'].filter(Boolean).join(' ');
 r.values.W='Non retrouvé';r.values.X='V6.10';r.values.Y=manifest.generatedAtUtc;r.cellTypes.Y='d';
}
for(const [index,p] of manifest.assets.entries()){
 const rn=43+index;
 const lim=Array.isArray(p.visualInspection.limitationsFR)?p.visualInspection.limitationsFR.join(' '):p.visualInspection.limitationsFR;
 const values={A:p.id,B:p.groupFR,C:p.variant,D:p.nameFR,E:p.priorStatusFR,F:'Conservée hors main',G:'Oui',H:'Oui',I:'Non',J:'Non',
 K:p.repoPngPath,L:p.sha256,M:p.bytes,N:p.generatedAtUtc,O:p.visualInspection.notesFR,P:lim,
 Q:p.plannedAppearance.morphologyFR,R:p.plannedAppearance.skinDirectionFR,S:p.plannedAppearance.armorDirectionFR,
 T:p.references.map(x=>x.repoPath).join(' | '),U:'Non',V:p.userOverrides.length?'Dreadlocks de cheveux humains, conformément à la demande utilisateur.':null,
 W:'Vérifié localement',X:'V6.11',Y:manifest.generatedAtUtc};
 rows['Production PR'].rows.push({rowNumber:rn,values,cellTypes:{N:'d',Y:'d'},formulas:{F:`INDEX('Variantes'!$E$7:$E$5126,MATCH(A${rn},'Variantes'!$A$7:$A$5126,0))`}});
}
put('Contrôles','A10','205 à vérifier');
put('Contrôles','B10','169 variantes V6.2 restent à retrouver. À celles-ci s’ajoutent 36 productions V6.10 attestées par l’Excel du 20/10, dont les PNG ne sont pas retrouvés le 21/10. Leur perte définitive n’est pas démontrée.');
put('Contrôles','B11','Quatre anciennes tentatives restent non retrouvées. Les nouvelles productions V6.10 de leurs 3 IDs sont attestées dans l’Excel, mais leurs octets ne sont pas récupérés à cette reprise. V6.11 porte sur les variantes 04 et 05.');
put('Contrôles','B14','Main : présence des blobs Git et SHA256 issus des registres. V6.10 : empreintes historiques conservées depuis l’Excel récupéré. V6.11 : SHA256 recalculés sur les PNG, comparés aux sorties natives et aux références téléchargées.');
put('Contrôles','B16','Modifier le statut en E et les notes en AJ de Variantes. Les totaux, comptes par groupe et statuts de Production PR se recalculent. Les preuves de branche ne démontrent pas une publication ou une fusion dans main.');
for(let r=24;r<=27;r++)put('Contrôles',`F${r}`,'Recréation V6.10 attestée par l’Excel. PNG de cette recréation non retrouvé à la reprise du 21/10/2026.');
put('Contrôles','B37',205);put('Contrôles','B39',2790);
put('Contrôles','A43','Statuts au 21/10/2026. Les 36 anciennes productions V6.10 restent dans l’historique, avec leur disponibilité à vérifier. Les 36 nouveaux PNG V6.11 sont conservés dans la branche de travail. La publication et la fusion se vérifient séparément dans GitHub.');

// Rebuild from the exact extracted cells and styles because importXlsx loses
// solid conditional fills and renders most original cells blank in this runtime.
// The baseline XLSX is preserved byte-for-byte in the versioned references folder.
const wb=Workbook.create();
for(const name of source.sheetNames)wb.worksheets.add(name);
for(const name of source.sheetNames){
 const sheet=wb.worksheets.getItem(name),spec=layout.sheets[name];
 const maxRow=name==='Production PR'?78:Math.max(...rows[name].rows.map(r=>r.rowNumber));
 const maxCol=name==='Production PR'?25:ci(spec.maxCol);
 const matrix=Array.from({length:maxRow},()=>Array(maxCol).fill(null));
 for(const r of rows[name].rows)for(const [c,v] of Object.entries(r.values))matrix[r.rowNumber-1][ci(c)-1]=r.cellTypes?.[c]==='d'?new Date(v):v;
 sheet.getRangeByIndexes(0,0,maxRow,maxCol).values=matrix;
 sheet.showGridLines=spec.showGridLines;
 if(spec.tabColor)sheet.tabColor=spec.tabColor;
 for(const t of spec.tables){
  const table=sheet.tables.add(name==='Production PR'?'A6:Y78':t.range,true,t.name);
  table.showFilterButton=true;
  if(t.style.name)table.style=t.style.name;
  table.showBandedColumns=t.style.showColumnStripes==='1';
 }
 for(const s of spec.styles)sheet.getRange(s.range).format=layout.styles[s.style];
 for(const c of spec.columns){if(c.width)sheet.getRange(`${col(+c.min)}1:${col(+c.max)}${maxRow}`).format.columnWidth=+c.width;}
 for(const r of spec.rowHeights)sheet.getRange(`A${r.start}:${spec.maxCol}${r.end}`).format.rowHeight=r.height;
 for(const m of spec.merges)sheet.mergeCells(m);
 if(spec.pane?.ySplit)sheet.freezePanes.freezeRows(+spec.pane.ySplit);
 if(spec.pane?.xSplit)sheet.freezePanes.freezeColumns(+spec.pane.xSplit);
 for(const f of spec.conditionalFormats){
  const range=name==='Production PR'?f.range.replace('42','78'):f.range;
  sheet.getRange(range).conditionalFormats.add(f.type,f.config);
 }
 for(const d of spec.dataValidations){
  if(d.type==='list'&&d.formula1.startsWith('"'))sheet.getRange(d.range).dataValidation={rule:{type:'list',values:d.formula1.slice(1,-1).split(',')}};
  else sheet.getRange(d.range).dataValidation={rule:{type:d.type,formula1:d.formula1}};
 }
 console.log(`Restored values and layout: ${name}`);
}
// Restore formulas only after every referenced source has been populated.
for(const name of source.sheetNames){
 const sheet=wb.worksheets.getItem(name),columns=new Map();
 for(const r of rows[name].rows)for(const [c,f] of Object.entries(r.formulas??{})){
  const list=columns.get(c)??[];list.push({r:r.rowNumber,f:'='+f.replace(/^=/,'')});columns.set(c,list);
 }
 for(const [c,list] of columns){
  list.sort((a,b)=>a.r-b.r);let run=[];
  const flush=()=>{if(run.length)sheet.getRange(`${c}${run[0].r}:${c}${run.at(-1).r}`).formulas=run.map(x=>[x.f]);run=[];};
  for(const x of list){if(run.length&&x.r!==run.at(-1).r+1)flush();run.push(x);}flush();
 }
}
const production=wb.worksheets.getItem('Production PR');
production.getRange('A43:V78').copyFrom(production.getRange('A7:V42'),'all');
// Copying existing row formatting must not retain old identities or formulas.
for(const r of rows['Production PR'].rows.filter(r=>r.rowNumber>=43)){
 production.getRange(`A${r.rowNumber}:Y${r.rowNumber}`).values=[Array.from({length:25},(_,i)=>{const c=col(i+1),v=r.values[c]??null;return r.cellTypes?.[c]==='d'?new Date(v):v;})];
 production.getRange(`F${r.rowNumber}`).formulas=[['='+r.formulas.F]];
}
production.getRange('W6:Y6').format=layout.styles[10];
production.getRange('W7:Y78').format=layout.styles[11];
production.getRange('W1:W78').format.columnWidth=29;
production.getRange('X1:X78').format.columnWidth=16;
production.getRange('Y1:Y78').format.columnWidth=23;
production.getRange('Y7:Y78').setNumberFormat('dd/mm/yy hh:mm');
production.getRange('N43:N78').setNumberFormat('dd/mm/yy hh:mm');
production.getRange('W7:W78').conditionalFormats.add('containsText',{text:'Non retrouvé',format:{fill:'#FFF1D1',font:{color:'#785316',bold:true}}});
production.getRange('A6:Y6').format.rowHeight=48;
production.getRange('A7:Y78').format.autofitRows();
production.getRange('A3:J3').format.wrapText=true;
production.getRange('A3:J3').format.rowHeight=51;
const summary=wb.worksheets.getItem('Synthèse');
summary.getRange('A17:F18').format.wrapText=true;
summary.getRange('A17:F18').format.rowHeight=31;
const controls=wb.worksheets.getItem('Contrôles');
for(const r of [10,11,14,16,43])controls.getRange(`A${r}:F${r}`).format.autofitRows();
console.log('Recalculating');
wb.recalculate();
await fs.mkdir(previewOut,{recursive:true});
const baselineCounts=current.statusCounts;
const actual=summary.getRange('B11:B15').values.flat();
const expected=['Présente dans main','Produite — à vérifier','Perdue — à recréer','Pas faite','Conservée hors main'].map(k=>baselineCounts[k]??0);
if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(`Count mismatch ${JSON.stringify({actual,expected})}`);
console.log((await wb.inspect({kind:'region',sheetId:'Synthèse',range:'A11:F16',maxChars:2200,tableMaxRows:6,tableMaxCols:6})).ndjson);
const err=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},summary:'final formula error scan'});
await fs.writeFile(path.join(previewOut,'formula-scan.ndjson'),err.ndjson);
// Check that a manual status edit updates both the summary and linked production row.
const first=manifest.assets[0],master=wb.worksheets.getItem('Variantes');
master.getRange(`E${first.sourceWorkbookRow}`).values=[['Produite — à vérifier']];wb.recalculate();
const reaction={checking:summary.getRange('B12').values[0][0],conserved:summary.getRange('B15').values[0][0],productionStatus:production.getRange('F43').values[0][0]};
if(reaction.checking!==206||reaction.conserved!==35||reaction.productionStatus!=='Produite — à vérifier')throw Error('Status recalculation failed');
master.getRange(`E${first.sourceWorkbookRow}`).values=[['Conservée hors main']];wb.recalculate();
await fs.writeFile(path.join(previewOut,'recalculation-check.json'),JSON.stringify({passed:true,temporaryInputRestored:true,reaction,finalCounts:summary.getRange('B11:B15').values.flat()},null,2));
const output=await SpreadsheetFile.exportXlsx(wb);
const finalPath=path.join(out,'Yautja_Suivi_Variantes_2026-10-21.xlsx');
await output.save(finalPath);
console.log(`Exported ${finalPath}`);
// Render a compact summary range: this renderer may leave merged dashboards blank.
for(const [name,range,file] of [['Synthèse','A10:F16','after-summary-counts.png'],['Production PR','A42:J45','after-production.png'],['Contrôles','A31:D41','after-checks.png']]){
 const png=await wb.render({sheetName:name,range,scale:1.4,format:'png'});
 await fs.writeFile(path.join(previewOut,file),new Uint8Array(await png.arrayBuffer()));
 console.log(`Rendered ${file}`);
}
