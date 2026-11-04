import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Run with CODEX_PRIMARY_RUNTIME_NODE from a writable OS temporary directory.
// Its node_modules link must target CODEX_PRIMARY_RUNTIME_NODE_MODULES.
// Import and extend the existing workbook. Preserve its original six sheets.
const require=createRequire(path.join(process.cwd(),'workbook-runtime.mjs'));
const {FileBlob,SpreadsheetFile}=await import(require.resolve('@oai/artifact-tool'));
assert.ok(process.env.CODEX_PRIMARY_RUNTIME_NODE);
assert.equal(await fs.realpath(process.execPath),await fs.realpath(process.env.CODEX_PRIMARY_RUNTIME_NODE));
const repoRoot=process.env.WOLF_REPO_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const productionDir=path.join(repoRoot,'production/wolf-castle-arrival-20261104');
const outputDir=process.env.WOLF_OUTPUT_DIR||path.resolve(repoRoot,'../outputs/wolf-castle-continuation-20261104');
const renderDir=path.join(outputDir,'previews'),filename='wolf-castle-arrival-20261104.xlsx';
await fs.mkdir(renderDir,{recursive:true});
const readJson=async name=>JSON.parse(await fs.readFile(path.join(productionDir,name),'utf8'));
const optionalJson=async name=>{try{return await readJson(name);}catch(error){if(error.code==='ENOENT')return null;throw error;}};
const [castle,arrival,combat,originalAudit,runtimeAudit,evidence]=await Promise.all([
  readJson('art-manifest-castle.json'),readJson('art-manifest-arrival-and-characters.json'),readJson('art-manifest-combat-v2.json'),
  readJson('art-audit.json'),optionalJson('runtime-art-v2.json'),readJson('workbook-evidence.json'),
]);
const manifests=[...castle.assets,...arrival.assets,...combat.assets];
assert.equal(manifests.length,30);assert.equal(new Set(manifests.map(a=>a.path)).size,30);assert.equal(originalAudit.records.length,27);
const originals=new Map(originalAudit.records.map(a=>[a.path,a]));
const runtimeByPath=new Map((runtimeAudit?.assets??[]).map(a=>[a.source,a]));
const sha256=data=>createHash('sha256').update(data).digest('hex');
for(const asset of manifests){
  const bytes=await fs.readFile(path.join(repoRoot,asset.path)),expected=originals.get(asset.path)?.sha256??asset.sha256;
  if(expected)assert.equal(sha256(bytes),expected,`Source modifiée : ${asset.id}`);
  const runtime=runtimeByPath.get(asset.path);
  if(runtime){assert.equal(runtime.sourceSha256,sha256(bytes),`Audit périmé : ${asset.id}`);assert.equal(runtime.runtimeSha256,sha256(await fs.readFile(path.join(repoRoot,runtime.runtime))),`WebP modifié : ${asset.id}`);}
}
const inputWorkbookSha256=sha256(await fs.readFile(path.join(productionDir,filename)));
const previousVerification=await optionalJson('workbook-verification.json');
const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(productionDir,filename)));
const originalNames=['Synthese','Chateau','Cinematique','Sprites','Prompts','Verification'];
const sheets=Object.fromEntries(originalNames.map(name=>[name,workbook.worksheets.getItem(name)]));
const before=Object.fromEntries(originalNames.map(name=>{const r=sheets[name].getUsedRange();return[name,{values:r.values,formulas:r.formulas}];}));
for(const name of ['Combat','Audio']){try{sheets[name]=workbook.worksheets.getItem(name);}catch{sheets[name]=workbook.worksheets.add(name);}}
const colors={text:'#292822',muted:'#70695E',title:'#493322',header:'#4C392A',rule:'#C8B99F',stripe:'#F5F2EC',input:'#FFF1D6',pending:'#FFF3DC',error:'#FCE5E2'};
const column=index=>{let out='';while(index>0){index--;out=String.fromCharCode(65+index%26)+out;index=Math.floor(index/26);}return out;};
const status=key=>evidence.features?.[key]??'En cours';
function statusFormatting(range){
  range.conditionalFormats.deleteAll();
  for(const text of ['À revoir','À faire','En attente','En cours'])range.conditionalFormats.add('containsText',{text,format:{fill:colors.pending,font:{bold:true,color:'#775B2A'}}});
  for(const text of ['À corriger','Échec'])range.conditionalFormats.add('containsText',{text,format:{fill:colors.error,font:{bold:true,color:'#8A302B'}}});
}
// Additions use the established typography, headers, spacing and row fills.
function table(sheet,heading,subtitle,headers,rows,widths,height=62){
  const last=column(headers.length),end=rows.length+5,used=sheet.getUsedRange();if(used)used.clear({applyTo:'contents'});
  sheet.showGridLines=false;const full=sheet.getRange(`A1:${last}${end+2}`);full.format.font={name:'Arial',size:10,color:colors.text};full.format.verticalAlignment='center';full.format.rowHeight=26;
  widths.forEach((w,i)=>{sheet.getRange(`${column(i+1)}1:${column(i+1)}${end+2}`).format.columnWidth=w;});
  sheet.getRange(`A1:${last}1`).format.rowHeight=10;sheet.getRange('A2').values=[[heading]];sheet.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:colors.title};sheet.getRange(`A2:${last}2`).format.rowHeight=29;
  sheet.getRange('A3').values=[[subtitle]];sheet.getRange('A3').format.font={name:'Arial',size:10,italic:true,color:colors.muted};sheet.getRange(`A3:${last}3`).format.rowHeight=24;
  sheet.getRange(`A4:${last}4`).format={rowHeight:8,borders:{bottom:{style:'thin',color:colors.rule}}};
  sheet.getRange(`A5:${last}5`).values=[headers];sheet.getRange(`A5:${last}5`).format={fill:colors.header,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:38,horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,borders:{insideVertical:{style:'thin',color:'#FFFFFF'}}};
  sheet.getRange(`A6:${last}${end}`).values=rows;sheet.getRange(`A6:${last}${end}`).format={rowHeight:height,wrapText:true,verticalAlignment:'top'};sheet.getRange(`A6:A${end}`).format.font={name:'Arial',size:10,bold:true,color:colors.title};
  for(let row=6;row<=end;row++)sheet.getRange(`A${row}:${last}${row}`).format.fill=row%2===0?colors.stripe:'#FFFFFF';
  sheet.freezePanes.freezeRows(5);sheet.freezePanes.freezeColumns(2);sheet.tabColor='#806243';return end;
}
function lastNonempty(values){for(let row=values.length-1;row>=0;row--)if(values[row].some(v=>v!==null&&v!==''))return row+1;return 0;}

const sprites=sheets.Sprites,oldSpriteRows=before.Sprites.values.slice(5).filter(row=>row[0]);
const byId=new Map(oldSpriteRows.map(row=>[row[0],row]));
const humanBefore=new Map([...byId].map(([id,row])=>[id,row[11]]));
const newIds=new Set(combat.assets.map(a=>a.id));
const ordered=[...originalAudit.records.map(r=>manifests.find(a=>a.path===r.path)),...combat.assets],endSprites=ordered.length+5;
sprites.getRange('M5').values=[['PNG original']];sprites.getRange('N5').values=[['PNG (Kio)']];
sprites.getRange('O5:S5').copyFrom(sprites.getRange('I5:M5'),'all');sprites.getRange('O5:S5').values=[['Copie WebP','WebP (Kio)','Gain de poids','Dimensions et alpha','Lot']];
[72,14,14,24,12].forEach((w,i)=>{sprites.getRange(`${column(i+15)}1:${column(i+15)}${endSprites}`).format.columnWidth=w;});
const pngTechnical=[];
for(let i=0;i<ordered.length;i++){
  const asset=ordered[i],row=i+6,source=originals.get(asset.path),runtime=runtimeByPath.get(asset.path),newer=newIds.has(asset.id);
  const checked=Boolean(source?.technicalCheckPassed||runtime?.technicalStatus==='checked');pngTechnical.push(checked);
  if(newer){
    if(!byId.has(asset.id))sprites.getRange(`A${row}:N${row}`).copyFrom(sprites.getRange('A31:N31'),'all');
    sprites.getRange(`A${row}:N${row}`).values=[[asset.id,'Château','Pose de combat',asset.width??runtime?.width??null,asset.height??runtime?.height??null,
      (asset.hasAlphaChannel??runtime?.hasAlpha)?'RGBA':null,asset.alphaMin??runtime?.sourceAlpha?.minimum??null,asset.alphaMax??runtime?.sourceAlpha?.maximum??null,
      'Généré',evidence.runtimeIntegration?.[asset.id]??(status('combat')==='Intégré'?'Référencé':'En cours'),checked?'Réussi':'En attente',humanBefore.get(asset.id)??'À revoir',
      '/'+asset.path.slice('public/'.length),(asset.bytes??runtime?.sourceBytes??(await fs.stat(path.join(repoRoot,asset.path))).size)/1024]];
  }
  sprites.getRange(`O${row}:S${row}`).format={font:{name:'Arial',size:10,color:colors.text},wrapText:true,verticalAlignment:'top'};
  sprites.getRange(`O${row}:S${row}`).values=[[runtime?'/'+runtime.runtime.slice('public/'.length):null,runtime?runtime.runtimeBytes/1024:null,null,runtime?.alphaPixelsEqual&&runtime?.dimensionsEqual?'Vérifiés':'En attente',newer?'1.3.0':'1.2.0']];
  sprites.getRange(`Q${row}`).formulas=[[`=IF(ISNUMBER(P${row}),1-P${row}/N${row},"n.a.")`]];
  sprites.getRange(`A${row}:S${row}`).format.fill=row%2===0?colors.stripe:'#FFFFFF';sprites.getRange(`L${row}`).format.fill=colors.input;
}
sprites.getRange(`D6:H${endSprites}`).setNumberFormat('0');sprites.getRange(`D6:H${endSprites}`).format.horizontalAlignment='right';
sprites.getRange(`N6:P${endSprites}`).setNumberFormat('#,##0.0');sprites.getRange(`O6:O${endSprites}`).setNumberFormat('@');sprites.getRange(`Q6:Q${endSprites}`).setNumberFormat('0.0%');
sprites.getRange(`N6:N${endSprites}`).format.horizontalAlignment='right';sprites.getRange(`P6:Q${endSprites}`).format.horizontalAlignment='right';sprites.getRange(`O6:O${endSprites}`).format.horizontalAlignment='left';sprites.getRange(`A33:S${endSprites}`).format.rowHeight=38;
sprites.getRange(`L6:L${endSprites}`).dataValidation={rule:{type:'list',values:['À revoir','Validé','À corriger']}};sprites.getRange(`K6:K${endSprites}`).dataValidation={rule:{type:'list',values:['Réussi','En attente','À corriger']}};
statusFormatting(sprites.getRange(`I6:L${endSprites}`));statusFormatting(sprites.getRange(`R6:R${endSprites}`));

const combatSource=await fs.readFile(path.join(repoRoot,'app/game/systems/wolfCastleCombat.ts'),'utf8');
const encounterPattern=/\{ id: '([^']+)', name: '([^']+)', lesson: '([^']+)', health: ([\d.]+), speed: ([\d.]+), windupMs: ([\d.]+), recoveryMs: ([\d.]+), damage: ([\d.]+), reach: ([\d.]+) \}/g;
const encounters=[...combatSource.matchAll(encounterPattern)].map(m=>({id:m[1],name:m[2],lesson:m[3],health:+m[4],speed:+m[5],windup:+m[6],recovery:+m[7],damage:+m[8],reach:+m[9]}));assert.equal(encounters.length,3);
table(sheets.Combat,'Cour royale : trois rencontres','Épreuve non létale. Valeurs de gameplay, sans statistiques canoniques revendiquées.',
  ['ID','Rencontre','Lecture et réponse','Vie','Vitesse (u/s)','Anticipation (ms)','Récupération (ms)','Dégâts','Portée (u)','Progression et reprise','État','Source'],
  encounters.map((item,i)=>[item.id,item.name,item.lesson,item.health,item.speed,item.windup,item.recovery,item.damage,item.reach,i<2?'Fin du duel, répit, puis commande de rencontre suivante. Le checkpoint conserve position, phase, santé, endurance et statistiques.':'Victoire enregistrée au dossier. Aucun butin ni modification des ressources de campagne.',status('combat'),'app/game/systems/wolfCastleCombat.ts']),
  [24,27,58,10,12,16,18,11,12,62,18,58],82);
sheets.Combat.getRange('D6:I8').setNumberFormat('0');sheets.Combat.getRange('D6:I8').format.horizontalAlignment='right';statusFormatting(sheets.Combat.getRange('K6:K8'));
const combatRules=[
  ['Commandes','Déplacement au sol, attaque, parade et esquive. Les contrôles de la scène conservent les raccourcis du jeu, la manette et le tactile.'],
  ['Sceaux et combat','Les deux épreuves restent distinctes. Aucun combat ne commence pendant une séquence de sceaux active.'],
  ['Sauvegarde V2','Visite V1 migrée à une entrée sûre. V2 suit coordonnées, orientation, révision et combat de la campagne propriétaire.'],
  ['Écriture refusée','Un checkpoint ne devient durable qu’après confirmation du stockage. Une ancienne révision ne remplace pas une nouvelle visite.'],
  ['Fin et sortie','Défaite, abandon et victoire doivent libérer le parcours. Le dossier de la cour conserve ses résultats sans attribuer de ressources de chasse.'],
  ['Graphismes','Trois poses individuelles du même garde : ready, windup, lunge. Le mouvement de l’arme et la zone de frappe doivent rester lisibles en jeu.'],
];
sheets.Combat.getRange('A11').values=[['Règles de l’épreuve']];sheets.Combat.getRange('A11').format.font={name:'Arial',size:12,bold:true,color:colors.title};
combatRules.forEach(([heading,body],i)=>{const row=i+12;sheets.Combat.getRange(`A${row}:B${row}`).merge();sheets.Combat.getRange(`A${row}`).values=[[heading]];sheets.Combat.getRange(`C${row}:F${row}`).merge();sheets.Combat.getRange(`C${row}`).values=[[body]];sheets.Combat.getRange(`A${row}:F${row}`).format={wrapText:true,verticalAlignment:'top',rowHeight:48,font:{name:'Arial',size:10,color:colors.text}};});

const arrivalSource=await fs.readFile(path.join(repoRoot,'app/game/systems/planetArrival.ts'),'utf8');
const shots=[...arrivalSource.matchAll(/\{ id: '([^']+)', label: '([^']+)', startMs: ([\d_]+), endMs: ([\d_]+) \}/g)].map(m=>({id:m[1],start:Number(m[3].replaceAll('_','')),end:Number(m[4].replaceAll('_',''))}));
const shotById=new Map(shots.map(s=>[s.id,s]));
const audioSource=await fs.readFile(path.join(repoRoot,'app/game/systems/planetArrivalAudio.ts'),'utf8');
const contact=Number(arrivalSource.match(/PLANET_ARRIVAL_CONTACT_PROGRESS\s*=\s*([\d.]+)/)?.[1]);assert.ok(Number.isFinite(contact));
const audioLabels={destination:'Accord du titre de planète',carrier:'Passage grave du vaisseau',release:'Déverrouillage et jet de la capsule',descent:'Passage de la descente',reentry:'Air et frottement de rentrée',impact:'Choc au contact avec le sol',hatch:'Ouverture de la porte','first-step':'Premier pas au sol','second-step':'Second pas au sol'};
const cues=[...audioSource.matchAll(/\{ id: '([^']+)', atMs: at\('([^']+)'(?:, ([^)]+))?\)/g)].map(m=>{const shot=shotById.get(m[2]);assert.ok(shot);const fraction=m[3]==='PLANET_ARRIVAL_CONTACT_PROGRESS'?contact:Number(m[3]??0);return{id:m[1],shot:m[2],time:(shot.start+(shot.end-shot.start)*fraction)/1000};});assert.equal(cues.length,9);
const audioRows=cues.map(cue=>[cue.id,'Ponctuel','Arrivée',cue.time,audioLabels[cue.id],'Suspendu avec la séquence. Une reprise ne rejoue pas les signaux déjà consommés.',status('arrivalAudio'),'app/game/systems/planetArrivalAudio.ts']);
for(const[id,time,description]of[['orbit',0,'Bourdonnement orbital.'],['carrier',13,'Résonance de la coque pendant le passage et le largage.'],['descent',31,'Air et vitesse de descente.'],['atmosphere',41,'Frottement atmosphérique.'],['surface',49,'Ambiance de surface adaptée au biome de la mission.']])audioRows.push([id,'Ambiance','Arrivée',time,description,'Voix unique, arrêt à la pause et à la sortie. Volume contrôlé par le moteur commun.',status('arrivalAudio'),'app/game/systems/planetArrivalAudio.ts']);
for(const item of evidence.courtAudio??[])audioRows.push([item.id,item.type??'Ponctuel',item.sequence??'Cour',null,item.description,item.lifecycle,status('castleAudio'),item.source]);
const audioEnd=table(sheets.Audio,'Sons originaux : événements et ambiances','Synthèse originale pour le jeu. Aucun échantillon de la bande-son du film.',
  ['ID','Type','Séquence','Début (s)','Son ou ambiance','Pause, reprise et sortie','État','Source'],audioRows,[22,16,15,12,53,63,19,60],58);
sheets.Audio.getRange(`D6:D${audioEnd}`).setNumberFormat('0.00');sheets.Audio.getRange(`D6:D${audioEnd}`).format.horizontalAlignment='right';statusFormatting(sheets.Audio.getRange(`G6:G${audioEnd}`));

const summary=sheets.Synthese;summary.getRange('A3').values=[[`Yautja — The Long Hunt, version ${evidence.version}, 4 novembre 2026`]];
const metrics=[`=COUNTA('Sprites'!A6:A${endSprites})`,`=COUNTIFS('Sprites'!B6:B${endSprites},"Château")`,`=COUNTIFS('Sprites'!B6:B${endSprites},"Arrivée")`,"=COUNTA('Chateau'!A6:A14)","=COUNTA('Cinematique'!A6:A13)","=SUM('Cinematique'!E6:E13)",`=COUNTIFS('Sprites'!F6:F${endSprites},"RGBA")`,`=COUNTIFS('Sprites'!F6:F${endSprites},"RGB")`,`=COUNTIFS('Sprites'!K6:K${endSprites},"Réussi")`,`=COUNTIFS('Sprites'!L6:L${endSprites},"Validé")`,`=COUNTIFS('Sprites'!L6:L${endSprites},"À revoir")`,`=COUNTIFS('Sprites'!J6:J${endSprites},"Référencé")`];
summary.getRange('B6:B17').formulas=metrics.map(f=>[f]);
const notes={7:`Visite et sceaux conservés. Combat des trois gardes : ${status('combat').toLowerCase()}.`,9:`Montage conservé. Sons synchronisés : ${status('arrivalAudio').toLowerCase()}. Reprise V2 : ${status('saveV2').toLowerCase()}.`,11:'30 PNG individuels : 27 images conservées et 3 nouvelles poses. Les copies WebP sont suivies dans Sprites.',13:'Preuves 1.3.0 et historique 1.2.0 séparés dans Verification. Les succès historiques ne valident pas la reprise.',15:evidence.nextSteps??'Recette navigateur, écoute du mixage, revue artistique humaine et donjon scénarisé avec quêtes.'};
for(const[row,text]of Object.entries(notes)){summary.getRange(`E${row}`).values=[[text]];summary.getRange(`E${row}:F${row}`).format.rowHeight=50;}
summary.getRange('A24:C24').copyFrom(summary.getRange('A5:C5'),'all');summary.getRange('A24:C24').values=[['Reprise 1.3.0','Nombre','Unité']];
const newMetrics=[['Rencontres de la cour',"=COUNTA('Combat'!A6:A8)",'rencontres'],['Sons ponctuels de l’arrivée',`=COUNTIFS('Audio'!B6:B${audioEnd},"Ponctuel",'Audio'!C6:C${audioEnd},"Arrivée")`,'signaux'],['Nouvelles poses individuelles',`=COUNTIFS('Sprites'!S6:S${endSprites},"1.3.0")`,'images'],['Copies WebP produites',`=COUNT('Sprites'!P6:P${endSprites})`,'images'],['Poids des PNG originaux',`=SUM('Sprites'!N6:N${endSprites})/1024`,'Mio'],['Poids des copies WebP',`=IF(COUNT('Sprites'!P6:P${endSprites})=B6,SUM('Sprites'!P6:P${endSprites})/1024,"n.a.")`,'Mio'],['Réduction du poids total','=IF(ISNUMBER(B30),1-B30/B29,"n.a.")','du lot complet']];
newMetrics.forEach(([label,formula,unit],i)=>{const row=25+i;summary.getRange(`A${row}:C${row}`).copyFrom(summary.getRange(i%2?'A7:C7':'A6:C6'),'all');summary.getRange(`A${row}:C${row}`).values=[[label,null,unit]];summary.getRange(`B${row}`).formulas=[[formula]];summary.getRange(`A${row}:C${row}`).format.rowHeight=30;});summary.getRange('B29:B30').setNumberFormat('0.00');summary.getRange('B31').setNumberFormat('0.0%');
const chateau=sheets.Chateau;
chateau.getRange('C13').values=[['Activer les trois sceaux dans l’ordre ou engager l’épreuve de trois gardes. Estocs, balayages, parade et esquive.']];
chateau.getRange('E13').values=[['court-wall, access-beacon, portes. Trois poses séparées du garde royal en v2.']];
chateau.getRange('F13').values=[['Sceaux conservés. V2 : coordonnées, orientation, révision et checkpoint des trois rencontres.']];
chateau.getRange('G13').values=[[`Sceaux intégrés. Combat : ${status('combat').toLowerCase()}.`]];
chateau.getRange('H13').values=[['Épreuve non létale et dossier local à la cour. Donjon scénarisé, quêtes et butin restent distincts.']];chateau.getRange('A13:H13').format.rowHeight=72;

const prompts=sheets.Prompts;prompts.getRange('B10').values=[['art-manifest-castle.json, art-manifest-arrival-and-characters.json, art-manifest-combat-v2.json et audits techniques.']];
function splitExact(text,limit=390){const segments=[];let rest=text;while(rest.length>limit){let cut=rest.lastIndexOf(' ',limit);if(cut<limit/2)cut=limit;else cut++;segments.push(rest.slice(0,cut));rest=rest.slice(cut);}if(rest)segments.push(rest);return segments;}
const promptValues=before.Prompts.values,firstV2=promptValues.findIndex(row=>typeof row[0]==='string'&&row[0].startsWith(`${combat.assets[0].id} — `));
let promptRow=firstV2>=0?firstV2+1:lastNonempty(promptValues)+2;
if(firstV2>=0)prompts.getRange(`A${promptRow}:H${lastNonempty(promptValues)+2}`).clear({applyTo:'contents'});
const promptBlocks=[];
for(const asset of combat.assets){
  const start=promptRow;prompts.getRange(`A${promptRow}:H${promptRow}`).merge();prompts.getRange(`A${promptRow}`).values=[[`${asset.id} — ${asset.name.replaceAll(' · ', ', ')}`]];prompts.getRange(`A${promptRow}:H${promptRow}`).format={fill:colors.stripe,font:{name:'Arial',size:10,bold:true,color:colors.title},rowHeight:30,wrapText:true};promptRow++;
  prompts.getRange(`A${promptRow}:H${promptRow}`).merge();prompts.getRange(`A${promptRow}`).values=[['Identité du garde royal existant. Pose indépendante, fond transparent, adaptation de gameplay. Validation artistique humaine en attente.']];prompts.getRange(`A${promptRow}:H${promptRow}`).format={wrapText:true,rowHeight:44,font:{name:'Arial',size:10,color:colors.muted}};promptRow++;
  const segments=splitExact(asset.prompt),cells=[];
  segments.forEach((segment,i)=>{prompts.getRange(`A${promptRow}`).values=[[`Prompt ${i+1}/${segments.length}`]];prompts.getRange(`A${promptRow}`).format={font:{name:'Arial',size:10,color:colors.muted},verticalAlignment:'top'};prompts.getRange(`B${promptRow}:H${promptRow}`).merge();prompts.getRange(`B${promptRow}`).values=[[segment]];prompts.getRange(`B${promptRow}:H${promptRow}`).format={font:{name:'Arial',size:10,color:colors.text},wrapText:true,verticalAlignment:'top',rowHeight:Math.max(32,Math.ceil(segment.length/118)*13+10)};cells.push(`B${promptRow}`);promptRow++;});
  promptBlocks.push({id:asset.id,start,end:promptRow-1,cells,sourcePrompt:asset.prompt});prompts.getRange(`A${promptRow}:H${promptRow}`).format.rowHeight=12;promptRow++;
}
const verification=sheets.Verification;
verification.getRange('A3').values=[['Historique 1.2.0 conservé. Les preuves 1.3.0 qualifient uniquement le code et les parcours réellement exécutés.']];verification.getRange('A3:H3').format.rowHeight=32;
// Original fourteen evidence rows remain unchanged. The version column prevents
// a historical PASS from being read as proof of the continuation.
verification.getRange('I5').copyFrom(verification.getRange('C5'),'all');verification.getRange('I5').values=[['Version']];verification.getRange('I5:I80').format.columnWidth=14;verification.getRange('I6:I19').values=[['1.2.0']];verification.getRange('I6:I19').format={font:{name:'Arial',size:10,color:colors.muted},verticalAlignment:'top',rowHeight:62};
verification.getRange('A21:I21').merge();verification.getRange('A21').values=[['Qualification de la reprise 1.3.0']];verification.getRange('A21:I21').format={rowHeight:32,fill:colors.stripe,font:{name:'Arial',size:12,bold:true,color:colors.title}};verification.getRange('A22:I22').copyFrom(verification.getRange('A5:I5'),'all');
const verificationEnd=22+evidence.checks.length,oldEnd=lastNonempty(before.Verification.values);if(oldEnd>22)verification.getRange(`A23:I${Math.max(oldEnd,verificationEnd)}`).clear({applyTo:'contents'});
evidence.checks.forEach((check,i)=>{const row=23+i;verification.getRange(`A${row}:H${row}`).copyFrom(verification.getRange(i%2?'A7:H7':'A6:H6'),'all');verification.getRange(`A${row}:I${row}`).values=[[check.id,check.subject,check.status,check.count,check.unit,check.evidence,check.source,check.limit,evidence.version]];verification.getRange(`A${row}:I${row}`).format={rowHeight:74,wrapText:true,verticalAlignment:'top',font:{name:'Arial',size:10,color:colors.text}};});
verification.getRange(`D23:D${verificationEnd}`).setNumberFormat('0');verification.getRange(`D23:D${verificationEnd}`).format.horizontalAlignment='right';statusFormatting(verification.getRange(`C23:C${verificationEnd}`));

workbook.recalculate();const count=range=>range.values.map(row=>row[0]);
const humanValidated=ordered.filter(a=>humanBefore.get(a.id)==='Validé').length,humanPending=ordered.filter(a=>(humanBefore.get(a.id)??'À revoir')==='À revoir').length;
const referenced=sprites.getRange(`J6:J${endSprites}`).values.filter(row=>row[0]==='Référencé').length;
const expected=[30,22,8,9,8,62,24,6,pngTechnical.filter(Boolean).length,humanValidated,humanPending,referenced];assert.deepEqual(count(summary.getRange('B6:B17')),expected);assert.deepEqual(count(summary.getRange('B25:B28')),[3,9,3,runtimeByPath.size]);
const oldStatus=sprites.getRange('L35').values[0][0];sprites.getRange('L35').values=[['Validé']];workbook.recalculate();const changedHuman=count(summary.getRange('B15:B16'));assert.equal(changedHuman[0],humanValidated+(oldStatus==='Validé'?0:1));assert.equal(changedHuman[1],humanPending-(oldStatus==='À revoir'?1:0));sprites.getRange('L35').values=[[oldStatus]];
const oldBytes=sprites.getRange('P35').values[0][0];let changedWeight=null;if(typeof oldBytes==='number'){sprites.getRange('P35').values=[[oldBytes/2]];workbook.recalculate();changedWeight=summary.getRange('B30').values[0][0];assert.ok(changedWeight<runtimeAudit.totals.runtimeBytes/1024/1024);sprites.getRange('P35').values=[[oldBytes]];}
workbook.recalculate();assert.deepEqual(count(summary.getRange('B6:B17')),expected);
for(const block of promptBlocks)assert.equal(block.cells.map(cell=>prompts.getRange(cell).values[0][0]).join(''),block.sourcePrompt,`Prompt ${block.id}`);
assert.deepEqual(sheets.Cinematique.getUsedRange().formulas,before.Cinematique.formulas,'Formules de cinématique conservées.');
assert.deepEqual(sheets.Cinematique.getUsedRange().values,before.Cinematique.values,'Plans et durées de cinématique conservés.');
assert.deepEqual(verification.getRange('A6:H19').values,before.Verification.values.slice(5,19).map(row=>row.slice(0,8)),'Preuves V1 intactes.');assert.deepEqual(sprites.getRange('L6:L32').values,before.Sprites.values.slice(5,32).map(row=>[row[11]]),'Revue humaine V1 conservée.');assert.deepEqual(prompts.getRange('A13:H186').values,before.Prompts.values.slice(12,186).map(row=>row.slice(0,8)),'Prompts V1 inchangés.');
const inspections=[];for(const[name,range]of[['Synthese','A24:C31'],['Sprites','I32:S35'],['Combat','A5:I8'],['Audio','A5:G14']]){const checked=await workbook.inspect({kind:'table',range:`${name}!${range}`,include:'values,formulas',tableMaxRows:12,tableMaxCols:12,maxChars:5000});inspections.push({sheet:name,range,ndjson:checked.ndjson});}
const formulaErrors=await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:100},summary:'Erreurs de formule du classeur final'});
for(const sheet of Object.values(sheets))for(const row of sheet.getUsedRange().values)for(const value of row)if(typeof value==='string')assert.ok(!/^#(?:REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!|SPILL!|CALC!)$/.test(value),`Erreur de calcul : ${value}`);
if(process.argv.includes('--check-only')){console.log(JSON.stringify({mode:'memory-only',version:evidence.version,counts:count(summary.getRange('B6:B17')),continuation:count(summary.getRange('B25:B31')),preservedV1:true}));process.exit(0);}
const renderSpecs=[['Synthese','A1:F22','Synthese'],['Synthese','A24:C31','Synthese-reprise'],['Chateau','A11:D14','Chateau-cour'],['Chateau','E11:H14','Chateau-cour-suite'],['Sprites','A31:H35','Sprites-poses'],['Sprites','I31:N35','Sprites-poses-suivi'],['Sprites','O5:S12','Sprites-WebP'],['Sprites','O31:S35','Sprites-WebP-poses'],['Combat','A1:D8','Combat-rencontres'],['Combat','E5:L8','Combat-valeurs'],['Combat','A11:F17','Combat-regles'],['Audio','A1:D14','Audio-evenements'],['Audio','E5:H14','Audio-cycle'],['Audio',`A15:H${audioEnd}`,'Audio-ambiances']];
for(let row=23;row<=verificationEnd;row+=6){const end=Math.min(row+5,verificationEnd);renderSpecs.push(['Verification',`A${row}:E${end}`,`Verification-${row}-etats`],['Verification',`F${row}:I${end}`,`Verification-${row}-preuves`]);}for(const block of promptBlocks)renderSpecs.push(['Prompts',`A${block.start}:H${block.end}`,`Prompt-${block.id}`]);
// For evidence-only follow-ups, reuse already reviewed views of unchanged sheets.
// The caller lists every changed sheet; a missing retained preview fails closed.
const renderSheets=process.env.WOLF_RENDER_SHEETS?new Set(process.env.WOLF_RENDER_SHEETS.split(',')):null;
const renders=[];for(const[sheetName,range,name]of renderSpecs){
  const previewPath=path.join(renderDir,`${name}.png`),reused=Boolean(renderSheets&&!renderSheets.has(sheetName));
  if(reused)await fs.access(previewPath);
  else{const blob=await workbook.render({sheetName,range,scale:1.3,format:'png'});await fs.writeFile(previewPath,new Uint8Array(await blob.arrayBuffer()));}
  renders.push({sheet:sheetName,range,file:`previews/${name}.png`,reused});
}
if(previousVerification?.version&&previousVerification.version!==evidence.version){
  assert.match(previousVerification.version,/^\d+\.\d+\.\d+$/);
  const historyDir=path.join(productionDir,'history');await fs.mkdir(historyDir,{recursive:true});
  const historyPath=path.join(historyDir,`workbook-verification-${previousVerification.version}.json`);
  try{await fs.writeFile(historyPath,JSON.stringify(previousVerification,null,2)+'\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
}
const output=await SpreadsheetFile.exportXlsx(workbook);await output.save(path.join(outputDir,filename));await fs.copyFile(path.join(outputDir,filename),path.join(productionDir,filename));
const report={generatedAt:new Date().toISOString(),engine:'@oai/artifact-tool',runtimeNode:process.execPath,version:evidence.version,file:filename,sheets:[...originalNames,'Combat','Audio'],detailCounts:{salles:9,plans:8,sprites:30,prompts:30,combatEncounters:3,arrivalCues:9,audioRows:audioRows.length,verification:evidence.checks.length,historicalVerification:14},summaryCounts:count(summary.getRange('B6:B17')),expectedCounts:expected,continuationCounts:count(summary.getRange('B25:B31')),preservation:{historicalEvidence:true,humanReviewV1:true,promptsV1:true,cinematicFormulas:true,originalPngs:true},propagationCheck:{editedCell:'Sprites!L35',temporaryHumanStatus:'Validé',observed:changedHuman,restored:true},runtimeWeightPropagation:{editedCell:'Sprites!P35',observedMiB:changedWeight,restored:true,performed:typeof oldBytes==='number'},exactPromptReconstruction:{preserved:27,checkedNew:promptBlocks.length,allMatch:true},formulaErrorScan:{ndjson:formulaErrors.ndjson},inspections,renders,visualReview:{status:'pending',sheets:[]},gameChecks:evidence.checks,limitation:'Les contrôles du classeur et de ses images ne qualifient pas le navigateur ni la fidélité artistique. Les preuves historiques restent liées à leur version.'};
report.sourceCommit=evidence.sourceCommit??null;
report.publishedCodeCommit=evidence.currentPublishedCommit??null;
report.publishedCodeTree=evidence.currentPublishedTree??null;
report.productionBuildCommit=evidence.finalRuntimeBuild?.sourceCommit??null;
report.inputWorkbookSha256=inputWorkbookSha256;
report.outputWorkbookSha256=sha256(await fs.readFile(path.join(outputDir,filename)));
report.preservation.cinematicValues=true;
report.historyReport='history/workbook-verification-1.2.0.json';
await fs.writeFile(path.join(outputDir,'workbook-verification.json'),JSON.stringify(report,null,2)+'\n');await fs.copyFile(path.join(outputDir,'workbook-verification.json'),path.join(productionDir,'workbook-verification.json'));
console.log(JSON.stringify({file:path.join(outputDir,filename),version:evidence.version,counts:report.summaryCounts,continuation:report.continuationCounts,renders:renders.length,preserved:report.preservation},null,2));
