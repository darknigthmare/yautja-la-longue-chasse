#!/usr/bin/env node
/** Native GameClient equipment ownership across two distinct Homeworld outings.
 * Initial rank, owned Scout armor, City Hunter archive and safe portal approach
 * are disclosed fixtures. All scene entry, movement, return and save handlers
 * run unchanged. This is not a continuous V67-to-V68 route or an art approval.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(root,process.env.ASSET_RACCORDS_QA_OUTPUT??'outputs/qa-asset-raccords-20261120');
const prepareOnly=process.env.ASSET_RACCORDS_PREPARE_ONLY==='1';
await mkdir(out,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const revision=git('rev-parse','HEAD');
const report={
  schemaVersion:1,startedAt:new Date().toISOString(),sourceCommit:revision,
  browserExecuted:false,passed:false,classification:'IN_PROGRESS',checks:[],captures:[],errors:[],consoleErrors:[],
  sourceHashes:{},admissions:[],journeys:[],assets:[],preparation:null,
  runtime:'Original production React GameClient bundled by the existing esbuild/PostCSS test host; Next production delivery is checked separately.',
  instrumentation:'The initial campaign is supplied once through native browser-context storageState. No seeding init script exists at reload. No injected scene hook, replacement callback, fake image, alternate writer or gameplay clock. The fixture exposes only a document ID and a read of the native campaign key.',
  scope:'Two separate real outings: city to Passage V67 (ash-marches) and back; city to Region V68 (luminous-marshes) and back. Each starts at a declared native safe city portal approach.',
  limits:['No continuous connection from Passage V67 to Region V68 exists or is claimed','Initial Blooded rank, owned Scout armor, contested-trophy clue and City Hunter cosmetic archive are disclosed fixtures, not played acquisition','The short threshold walks do not qualify a full regional traversal, village activity or complete campaign','Automated Chromium and source/geometry observations do not establish human art validation, physical-device behavior or audio listening'],
};
const requests=new Map(),prepared=new Map(),tracked=new Map(),inlineScenes=new Set();
const materialize=paths=>execFileSync('git',['sparse-checkout','add','--stdin'],{cwd:root,input:[...paths].sort().map(file=>'/'+file).join('\n')+'\n',stdio:['pipe','inherit','inherit']});
let browser,context,page,server,currentScene=null;
const check=async(name,run)=>{
  const startedAt=new Date().toISOString();
  try { const details=await run();report.checks.push({name,status:'PASS',startedAt,details:details??null});console.log('PASS '+name); }
  catch(error) { report.checks.push({name,status:'FAIL',startedAt,error:String(error.stack??error)});throw error; }
};
async function publicBytes(pathname){
  const file='public'+pathname,oid=tracked.get(file);
  assert.ok(oid,'Only tracked public files may be served: '+file);
  let bytes,origin;
  try{
    const absolute=path.join(root,file),stat=await lstat(absolute);
    assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'A native asset must be a regular file: '+file);
    bytes=await readFile(absolute);origin='workspace';
  }catch(error){
    if(error?.code!=='ENOENT')throw error;
    // Missing sparse files may already have a real Git object. Never lazily
    // fetch during the browser run, and never generate a replacement image.
    bytes=execFileSync('git',['cat-file','blob',oid],{cwd:root,env:{...process.env,GIT_NO_LAZY_FETCH:'1'},maxBuffer:64*1024*1024});
    origin='already-local-exact-git-blob';
  }
  const actual=createHash(oid.length===64?'sha256':'sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(actual,oid,'Native asset bytes differ from HEAD: '+file);
  return{bytes,record:{path:file,url:pathname,status:200,bytes:bytes.length,sha256:hash(bytes),gitBlob:oid,matchesHead:true,origin}};
}
const mime={'.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.json':'application/json','.wav':'audio/wav','.ogg':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2','.woff':'font/woff'};
const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const campaign=()=>page.evaluate(()=>window.__assetRaccordsQa20261120.campaign());
function actorFor(kind){
  if(kind==='city')return page.locator('[data-homeworld-hub]:visible [data-homeworld-actor]');
  if(kind==='passage')return page.locator('[data-homeworld-passage-v67]:visible [data-passage-actor]');
  return page.locator('[data-homeworld-region-v68]:visible [data-region-player]');
}
function sceneFor(kind){
  if(kind==='city')return page.locator('[data-homeworld-hub]:visible');
  if(kind==='passage')return page.locator('[data-homeworld-passage-v67]:visible');
  return page.locator('[data-homeworld-region-v68]:visible');
}
async function equipment(kind,expected){
  const actor=actorFor(kind);
  await actor.waitFor({state:'visible'});
  await page.waitForFunction(({selector,base,lid})=>{
    const roots=[...document.querySelectorAll(selector)].filter(node=>node.getClientRects().length>0);
    return roots.length===1&&[base,lid].every(src=>[...roots[0].querySelectorAll('img[data-homeworld-layer="gauntlet"]')].some(img=>img.getAttribute('src')===src&&img.complete&&img.naturalWidth>0))&&roots[0].querySelectorAll('img[data-homeworld-layer="blade-housing"]').length===1&&[...roots[0].querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0);
  },{selector:kind==='city'?'[data-homeworld-hub] [data-homeworld-actor]':kind==='passage'?'[data-homeworld-passage-v67] [data-passage-actor]':'[data-homeworld-region-v68] [data-region-player]',base:expected.gauntlet.base,lid:expected.gauntlet.lid});
  const observed=await actor.evaluate(node=>{
    const box=element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
    return{
      modular:!!node.querySelector('[data-modular-homeworld-character]'),
      gauntlets:[...node.querySelectorAll('img[data-homeworld-layer="gauntlet"]')].map(img=>({part:img.getAttribute('data-gauntlet-part'),src:img.getAttribute('src'),complete:img.complete,width:img.naturalWidth,height:img.naturalHeight,transform:img.style.transform,bounds:box(img)})),
      armor:[...new Set([...node.querySelectorAll('[data-armor-module]')].map(item=>item.getAttribute('data-armor-module')))].sort(),
      blades:[...node.querySelectorAll('img[data-homeworld-layer="blade-housing"]')].map(img=>({src:img.getAttribute('src'),complete:img.complete,width:img.naturalWidth,height:img.naturalHeight,transform:img.style.transform})),
      body:node.querySelector('[data-modular-homeworld-character]')?.getAttribute('data-body-morph'),
      actorBounds:box(node),
    };
  });
  assert.ok(observed.modular);
  assert.equal(observed.body,expected.bodyMorphId);
  assert.equal(observed.gauntlets.length,2);
  for(const part of ['base','lid']){
    const image=observed.gauntlets.find(item=>item.part===part);
    assert.equal(image?.src,expected.gauntlet[part]);assert.ok(image.complete&&image.width>0&&image.height>0);
    assert.ok(image.bounds.width>0&&image.bounds.height>0&&Object.values(image.bounds).every(Number.isFinite));
  }
  assert.deepEqual(observed.armor,expected.armorModules);
  assert.equal(observed.blades.length,1);assert.equal(observed.blades[0].src,expected.bladeHousing);
  assert.ok(observed.blades[0].complete&&observed.blades[0].width>0);
  const disk=await campaign();
  assert.equal(disk.createdAt,expected.ownerCreatedAt);
  assert.deepEqual(disk.gauntletV134,expected.archive);
  assert.equal(disk.loadout.armorId,'scout');assert.ok(disk.loadout.weaponIds.includes('wristblades'));
  return observed;
}
async function capture(label,kind,inline=false){
  await frame();
  const viewport=page.viewportSize(),full=await page.screenshot({fullPage:false,animations:'disabled'});
  const fullName=label+'-viewport.png';
  await writeFile(path.join(out,fullName),full);
  report.captures.push({file:fullName,kind:'native-viewport',bytes:full.length,sha256:hash(full),width:full.readUInt32BE(16),height:full.readUInt32BE(20)});
  const actor=actorFor(kind),modular=actor.locator('[data-modular-homeworld-character]'),bounds=await modular.boundingBox();
  assert.ok(bounds&&bounds.width>0&&bounds.height>0,'The actual modular player must have a visible native rectangle.');
  const x=Math.max(0,Math.floor(bounds.x)-16),y=Math.max(0,Math.floor(bounds.y)-16);
  const right=Math.min(viewport.width,Math.ceil(bounds.x+bounds.width)+16),bottom=Math.min(viewport.height,Math.ceil(bounds.y+bounds.height)+16);
  assert.ok(right>x&&bottom>y,'The real player must intersect the viewport.');
  const clip={x,y,width:right-x,height:bottom-y},png=await page.screenshot({clip,animations:'disabled'});
  const name=label+'-player.png',receipt={file:name,kind:'native-player-clip-no-resize',bytes:png.length,sha256:hash(png),width:png.readUInt32BE(16),height:png.readUInt32BE(20),clip};
  await writeFile(path.join(out,name),png);report.captures.push(receipt);
  const inlineKey=typeof inline==='string'?inline:kind;
  if(inline&&!inlineScenes.has(inlineKey)&&inlineScenes.size<4){
    inlineScenes.add(inlineKey);
    console.log('ASSET_RACCORDS_NATIVE_PNG '+JSON.stringify({...receipt,base64:png.toString('base64')}));
  }
}
async function openCampaign(){
  await page.locator('[data-campaign-menu]').waitFor();
  const section=page.locator('[data-menu-section="campaign"]');
  if(await section.count())await section.click();
  await page.locator('[data-menu-action="continue"]').click();
  await page.locator('[data-campaign-session]').waitFor();
}
async function enterCity(){
  await page.waitForFunction(()=>{
    const visible=e=>e&&e.getClientRects().length>0&&!e.closest('[hidden]');
    return visible(document.querySelector('[data-homeworld-hub]'))||[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Yautja Prime · monde natal'&&visible(button));
  });
  if(!await page.locator('[data-homeworld-hub]').isVisible())await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]:visible').waitFor();
}
async function resumeOuting(kind){
  const scene=sceneFor(kind);
  if(kind==='passage'){
    if(await scene.getAttribute('data-passage-paused')==='true')await scene.getByRole('button',{name:/^(Commencer|Reprendre) la marche$/}).click();
    await page.waitForFunction(()=>document.querySelector('[data-homeworld-passage-v67]')?.getAttribute('data-passage-paused')==='false');
    await scene.getByRole('group',{name:/^Parcours 2.5D/}).focus();
  }else{
    const viewport=scene.locator('[tabindex="0"][aria-label^="Explorer "]');
    if(await viewport.getAttribute('inert')!==null){
      const resume=scene.locator('[data-region-resume]');
      await resume.waitFor({state:'visible'});await resume.click();
      await page.waitForFunction(()=>{const view=document.querySelector('[data-homeworld-region-v68] [tabindex="0"][aria-label^="Explorer "]');return view&&!view.inert;});
    }
    await viewport.focus();
  }
}
async function moveAwayAndBack(kind){
  const scene=sceneFor(kind),actor=actorFor(kind);
  await resumeOuting(kind);
  const readPosition=()=>kind==='passage'?scene.evaluate(node=>({x:Number(node.getAttribute('data-passage-x')),tick:Number(node.getAttribute('data-passage-tick'))})):actor.evaluate(node=>({x:Number(node.getAttribute('data-x')),tick:Number(node.closest('[data-homeworld-region-v68]').getAttribute('data-state-tick'))}));
  const before=await readPosition();
  try{
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(({kind,x})=>{
      const actor=document.querySelector(kind==='passage'?'[data-homeworld-passage-v67]':'[data-region-player]');
      return actor&&Number(actor.getAttribute(kind==='passage'?'data-passage-x':'data-x'))>x+8;
    },{kind,x:before.x},{polling:'raf',timeout:5000});
  }finally{await page.keyboard.up('ArrowRight');}
  const away=await readPosition();assert.ok(away.x>before.x+8&&away.tick>before.tick);
  try{
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(({kind,x})=>{
      const actor=document.querySelector(kind==='passage'?'[data-homeworld-passage-v67]':'[data-region-player]');
      return actor&&Number(actor.getAttribute(kind==='passage'?'data-passage-x':'data-x'))<=x+3;
    },{kind,x:before.x},{polling:'raf',timeout:5000});
  }finally{await page.keyboard.up('ArrowLeft');}
  return{before,away,returned:await readPosition(),inputs:'Real keyboard ArrowRight/ArrowLeft; no state or clock writes'};
}
try{
  const tree=git('ls-tree','-r',revision,'--','public');
  for(const line of tree.split('\n').filter(Boolean)){const [meta,file]=line.split('\t');if(meta.startsWith('100644 blob '))tracked.set(file,meta.split(' ')[2]);}
  const bootstrap=await build({
    stdin:{contents:`export {defaultSave,SAVE_STORAGE_KEY,parseSaveImport} from './app/game/save';
      export {gauntletCampaignEquipV134} from './app/game/systems/gauntletCampaignV134';
      export {homeworldWorldArrivalV110} from './app/game/systems/homeworldTransitionsV110';
      export {HOMEWORLD_POINTS_V77,nearestHomeworldPointV77} from './app/game/systems/homeworldWorldV77';
      export {createHomeworldCheckpointV77} from './app/game/systems/homeworldLocationV77';
      export {gauntletRigSpriteV139} from './app/game/systems/gauntletRigSpritesV139';
      export {homeworldArmorSlotsV114} from './app/game/HomeworldModularHunter';
      export {HUNTER_ASSET_ROOT_V3,HUNTER_BODY_PART_IDS,hunterBodyPartPath,hunterBodyFullPath,hunterDreadPath,hunterArmorPath,hunterMaskRigPath,HUNTER_EQUIPMENT_V3} from './app/game/hunterVisuals';`,resolveDir:root,loader:'ts'},
    bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',loader:{'.css':'empty'},external:['react','react-dom'],logLevel:'silent',
  });
  const module={exports:{}};
  runInNewContext(bootstrap.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),TextEncoder,TextDecoder,structuredClone,URL,URLSearchParams,console,setTimeout,clearTimeout});
  const api=module.exports,admissions=[];
  for(const [kind,regionId] of [['passage','ash-marches'],['region','luminous-marshes']]){
    const save=api.defaultSave('2026-11-20T00:00:00.000Z');
    save.profile.rankId='blooded';save.profile.honor=250;save.profile.hunterName='Qualification raccords';
    save.appearance.presetId='custom';
    save.inventory.unlockedArmorIds=[...new Set([...save.inventory.unlockedArmorIds,'scout'])];
    save.loadout.armorId='scout';save.loadout.weaponIds=['wristblades'];
    save.homeworld.evidenceIds=[...new Set([...save.homeworld.evidenceIds,'suspect-trophy'])];
    save.settings.masterVolume=0;save.settings.screenShake=false;
    const equip=api.gauntletCampaignEquipV134(save,'city-hunter');assert.ok(equip.ok&&equip.archive);
    save.gauntletV134=equip.archive;
    const arrival=api.homeworldWorldArrivalV110(regionId);assert.ok(arrival);
    const point=api.nearestHomeworldPointV77(arrival.levelId,arrival.actor);
    assert.equal(point?.regionId,regionId,'The prepared approach must expose the requested native region portal.');
    save.homeworld.locationV77=api.createHomeworldCheckpointV77(save.createdAt,arrival.levelId,arrival.actor,null,arrival.actor);
    const parsed=api.parseSaveImport(JSON.stringify(save));assert.ok(parsed.save&&!parsed.failure,'Prepared campaign must pass the real import parser.');
    assert.equal(parsed.save.gauntletV134.equippedId,'city-hunter');assert.equal(parsed.save.appearance.presetId,'custom');
    assert.equal(parsed.save.loadout.armorId,'scout');
    const expected={ownerCreatedAt:save.createdAt,archive:JSON.parse(JSON.stringify(save.gauntletV134)),bodyMorphId:save.appearance.bodyMorphId,
      gauntlet:Object.fromEntries(['base','lid'].map(part=>[part,api.gauntletRigSpriteV139('city-hunter',part)])),
      armorModules:[...new Set(api.homeworldArmorSlotsV114(save.appearance,'scout').map(part=>part.id))].sort(),
      bladeHousing:api.HUNTER_EQUIPMENT_V3.wristblades.housing};
    admissions.push(JSON.parse(JSON.stringify({kind,regionId,save:parsed.save,expected,point:{id:point.id,label:point.label,levelId:point.levelId},arrival})));
  }
  report.admissions=admissions.map(({save,...entry})=>({...entry,save,saveSha256:hash(JSON.stringify(save)),classification:'DECLARED_OWNED_EQUIPMENT_AND_NATIVE_SAFE_CITY_APPROACH_NOT_PLAYED_ACQUISITION'}));
  const runtimeInputsFile='docs/qa/current-integration-20261103/runtime-inputs.json';
  report.sourceHashes[runtimeInputsFile]=hash(await readFile(path.join(root,runtimeInputsFile)));
  const paths=new Set(JSON.parse(await readFile(path.join(root,runtimeInputsFile),'utf8')).entries.map(item=>item.path).filter(file=>file.startsWith('public/')));
  for(const {save,expected} of admissions){
    for(const src of [api.hunterBodyFullPath(save.appearance.bodyMorphId),api.hunterDreadPath(save.appearance.dreadStyleId),
      api.HUNTER_ASSET_ROOT_V3+'/body/'+save.appearance.bodyMorphId+'/net/full.webp',
      ...api.HUNTER_BODY_PART_IDS.map(part=>api.hunterBodyPartPath(save.appearance.bodyMorphId,part,save.appearance.headStyleId)),
      ...expected.armorModules.map(part=>api.hunterArmorPath(part)),...Object.values(expected.gauntlet),expected.bladeHousing,
      ...(save.appearance.biomaskId?[api.hunterMaskRigPath(save.appearance.biomaskId)]:[])])paths.add('public'+src);
  }
  for(const file of paths){assert.ok(/^public\/[A-Za-z0-9._/-]+$/.test(file)&&!file.split('/').includes('..'));assert.ok(tracked.has(file),'Prepared asset must be tracked: '+file);}
  let sparse=false;
  try{sparse=execFileSync('git',['config','--bool','core.sparseCheckout'],{cwd:root,encoding:'utf8'}).trim()==='true';}
  catch(error){if(error.status!==1)throw error;}
  paths.add('public/audio/manifest.json');
  if(sparse)materialize(paths);
  const audioManifest=JSON.parse((await publicBytes('/audio/manifest.json')).bytes.toString('utf8'));
  for(const entry of audioManifest.entries)for(const source of entry.sources){
    const pathname=decodeURIComponent(new URL(source.url,'http://localhost').pathname),file='public'+pathname;
    assert.ok(/^public\/[A-Za-z0-9._/-]+$/.test(file)&&!file.split('/').includes('..')&&tracked.has(file));
    paths.add(file);
  }
  if(sparse)materialize(paths);
  for(const file of [...paths].sort()){
    const {record}=await publicBytes(file.slice(6));prepared.set(file,record);
  }
  report.preparation={classification:'PREPARATION_ONLY',assets:prepared.size,bytes:[...prepared.values()].reduce((sum,item)=>sum+item.bytes,0),substituteAssets:false,records:[...prepared.values()]};
  await writeFile(path.join(out,'prepared-assets.json'),JSON.stringify(report.preparation,null,2)+'\n');
  report.preparationCompleted=true;
  if(prepareOnly){report.classification='PREPARATION_ONLY';}
  else{
    const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/asset-raccords-20261120.fixture.jsx'],bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',outfile:'fixture.js',metafile:true,logLevel:'silent',external:['/game/*'],define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'existing-production-css-host',setup(builder){
      builder.onLoad({filter:/\/app\/globals\.css$/},async args=>({loader:'css',resolveDir:path.dirname(args.path),contents:(await postcss([tailwind({base:root})]).process(await readFile(args.path,'utf8'),{from:args.path})).css}));
    }}]});
    const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')),css=bundle.outputFiles.find(file=>file.path.endsWith('.css'));assert.ok(js&&css);
    assert.ok(Object.keys(bundle.metafile.inputs).includes('app/game/GameClient.tsx'),'The host must contain the original GameClient.');
    for(const file of Object.keys(bundle.metafile.inputs).filter(file=>/^app\/game\//.test(file)&&/GameClient|HomeworldHub|HomeworldPassageV67|HomeworldRegionV68|HomeworldModularHunter|useHunterGauntlet|gauntletCampaign|gauntletRigSprites|homeworldWorldV77|homeworldLocationV77|homeworldTransitionsV110|save\.ts/.test(file)).sort())report.sourceHashes[file]=hash(await readFile(path.join(root,file)));
    for(const file of ['scripts/qa-asset-raccords-browser-20261120.mjs','tests/browser/asset-raccords-20261120.fixture.jsx','.github/workflows/assets-raccords-20261120.yml'])report.sourceHashes[file]=hash(await readFile(path.join(root,file)));
    report.bundleSha256=hash(js.contents);report.cssBundleSha256=hash(css.contents);
    const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja — raccords natifs</title><link rel="stylesheet" href="/fixture.css"><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
    server=createServer(async(req,res)=>{try{
      const pathname=decodeURIComponent(new URL(req.url??'/','http://localhost').pathname);
      if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
      if(pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
      if(pathname==='/fixture.js'||pathname==='/fixture.css'){res.writeHead(200,{'Content-Type':pathname.endsWith('.js')?'text/javascript':'text/css'}).end(pathname.endsWith('.js')?js.contents:css.contents);return;}
      assert.ok(pathname.startsWith('/')&&!pathname.split('/').includes('..'));
      const result=await publicBytes(pathname);requests.set(pathname,result.record);
      res.writeHead(200,{'Content-Type':mime[path.extname(pathname)]??'application/octet-stream'}).end(result.bytes);
    }catch(error){requests.set(req.url,{url:req.url,status:404,error:String(error)});res.writeHead(404).end();}});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    report.browserExecuted=true;report.browserVersion=browser.version();
    const url='http://127.0.0.1:'+server.address().port+'/';
    for(const admission of admissions){
      const {kind,regionId,save,expected,point}=admission,journey={kind,regionId,preparedCityArrival:admission.arrival,observations:[]};report.journeys.push(journey);
      context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,
        storageState:{cookies:[],origins:[{origin:new URL(url).origin,localStorage:[{name:api.SAVE_STORAGE_KEY,value:JSON.stringify(save)}]}]}});
      journey.admissionStorage={method:'Native newContext storageState, supplied once before the first page; no init script or reseeding on navigation/reload',origin:new URL(url).origin,key:api.SAVE_STORAGE_KEY};
      page=await context.newPage();page.setDefaultTimeout(60000);
      page.on('pageerror',error=>report.errors.push({kind,error:String(error)}));
      page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push({kind,text:message.text()});});
      await page.goto(url);await page.bringToFront();await openCampaign();await enterCity();currentScene='city';
      let first;
      await check(kind+': original GameClient resolves City Hunter and worn Scout kit in the real city',async()=>{
        first=await equipment('city',expected);journey.observations.push({scene:'city-before',...first});await capture(kind+'-01-city','city',kind==='passage');return first;
      });
      const hub=sceneFor('city');
      await hub.locator('button').filter({has:page.locator('kbd')}).filter({hasText:point.label}).click();
      const retry=hub.getByRole('button',{name:'Réessayer l’enregistrement des visites',exact:true});
      if(await retry.count())await retry.first().click();
      if(kind==='passage')await hub.getByRole('button',{name:'Partir vers les Marches de Cendre',exact:true}).click();
      else await hub.locator('[data-homeworld-region-v68="'+regionId+'"]').click();
      currentScene=kind;
      await check(kind+': native city entry preserves both gauntlet SVGs, armor modules and blade housing',async()=>{
        await resumeOuting(kind);
        const entryCampaign=await campaign(),entryCheckpoint=kind==='passage'?entryCampaign.homeworldPassageV67:entryCampaign.homeworldRegionV68;
        assert.equal(entryCampaign.createdAt,expected.ownerCreatedAt);assert.ok(entryCheckpoint);
        assert.equal(entryCheckpoint.regionId,regionId);assert.ok(Number.isFinite(entryCheckpoint.tick)&&Number.isFinite(entryCheckpoint.walked));
        journey.entryCheckpoint=entryCheckpoint;
        const next=await equipment(kind,expected);journey.observations.push({scene:kind,...next});
        for(const part of ['base','lid'])assert.equal(next.gauntlets.find(item=>item.part===part).transform,first.gauntlets.find(item=>item.part===part).transform);
        await capture(kind+'-02-outing',kind,true);return next;
      });
      await check(kind+': real keyboard movement advances the native scene and returns near its city threshold',async()=>{
        const moved=await moveAwayAndBack(kind);journey.movement=moved;return moved;
      });
      await check(kind+': native Pause durably writes a nonnull checkpoint after real movement',async()=>{
        await sceneFor(kind).getByRole('button',{name:'Pause',exact:true}).click();
        const field=kind==='passage'?'homeworldPassageV67':'homeworldRegionV68';
        await page.waitForFunction(({key,field,minTick,initialTick,initialWalked,owner,regionId})=>{
          const disk=JSON.parse(localStorage.getItem(key)??'null'),state=disk?.[field];
          return disk?.createdAt===owner&&state?.regionId===regionId&&state.tick>=minTick&&state.tick>initialTick&&state.walked>initialWalked;
        },{key:api.SAVE_STORAGE_KEY,field,minTick:journey.movement.returned.tick,initialTick:journey.entryCheckpoint.tick,initialWalked:journey.entryCheckpoint.walked,owner:expected.ownerCreatedAt,regionId});
        const disk=await campaign(),checkpoint=disk[field];assert.ok(checkpoint);
        assert.equal(disk.createdAt,expected.ownerCreatedAt);assert.equal(checkpoint.regionId,regionId);
        assert.ok(checkpoint.tick>=journey.movement.returned.tick&&checkpoint.tick>journey.entryCheckpoint.tick);
        assert.ok(checkpoint.walked>journey.entryCheckpoint.walked);
        const identity=kind==='passage'?'journeyId':'runId';assert.equal(checkpoint[identity],journey.entryCheckpoint[identity]);
        assert.ok(typeof checkpoint[identity]==='string'&&checkpoint[identity].length>0);
        assert.ok(Number.isFinite(checkpoint.actor.x)&&Number.isFinite(checkpoint.actor.y));
        journey.pausedCheckpoint=checkpoint;journey.pausedCampaignSha256=hash(JSON.stringify(disk));
        await resumeOuting(kind);return{owner:disk.createdAt,checkpoint,writer:'Native Pause -> GameClient onCheckpoint -> native campaign storage'};
      });
      if(kind==='passage')await sceneFor(kind).getByRole('button',{name:'Interagir',exact:true}).click();
      else await sceneFor(kind).locator('[data-region-interact]').click();
      currentScene='city';
      await sceneFor('city').waitFor({state:'visible'});
      await check(kind+': native return acknowledges its checkpoint and keeps the same equipped archive',async()=>{
        const returned=await equipment('city',expected),disk=await campaign();
        assert.ok(journey.pausedCheckpoint&&journey.pausedCheckpoint.tick>journey.entryCheckpoint.tick&&journey.pausedCheckpoint.walked>journey.entryCheckpoint.walked);
        assert.equal(kind==='passage'?disk.homeworldPassageV67:disk.homeworldRegionV68,null);
        journey.observations.push({scene:'city-after',...returned});journey.returnedCampaign=disk;
        await capture(kind+'-03-return','city',kind==='region'?'city-after-region':false);return{equipment:returned,owner:disk.createdAt,checkpointCleared:true};
      });
      if(kind==='region')await check('a fresh document rehydrates the same native campaign equipment',async()=>{
        const beforeId=await page.evaluate(()=>window.__assetRaccordsQa20261120.documentId),beforeReload=await campaign();
        assert.equal(beforeReload.createdAt,expected.ownerCreatedAt);assert.deepEqual(beforeReload.gauntletV134,expected.archive);
        await page.reload();await openCampaign();await enterCity();
        const afterId=await page.evaluate(()=>window.__assetRaccordsQa20261120.documentId);
        assert.notEqual(afterId,beforeId);
        const restored=await equipment('city',expected);journey.reloaded={beforeId,afterId,equipment:restored,storageAdmission:journey.admissionStorage,reseedingPossible:false,beforeReloadCampaignSha256:hash(JSON.stringify(beforeReload))};
        await capture('region-04-reloaded','city');return journey.reloaded;
      });
      await context.close();context=null;
    }
    await check('every served asset matches a tracked HEAD blob, with no missing image or page exception',async()=>{
      assert.equal(report.errors.length,0);
      assert.ok(requests.size>0);
      assert.ok([...requests.values()].every(item=>item.status===200&&item.matchesHead===true));
      return{requested:requests.size,substituteAssets:false,pageErrors:report.errors.length};
    });
    report.passed=true;report.classification='BOUNDED_NATIVE_GAMECLIENT_ASSET_RACCORDS_PASS';
  }
}catch(error){
  report.failure=String(error.stack??error);report.classification='FAILED_ATTEMPT';
  if(page&&!page.isClosed()){
    try{report.failureText=await page.locator('body').innerText();if(currentScene)await capture('failure',currentScene);}catch{/* keep the original failure */}
  }
}finally{
  report.assets=[...requests.values()];report.assetFailures=report.assets.filter(item=>item.status!==200);
  report.finishedAt=new Date().toISOString();report.trackedWorkingTreeStatus=git('status','--porcelain','--untracked-files=no');
  if(report.trackedWorkingTreeStatus){report.passed=false;report.failure??='Tracked source changed during the native qualification';}
  for(const [file,digest] of Object.entries(report.sourceHashes))if(hash(await readFile(path.join(root,file)))!==digest){report.passed=false;report.failure??='Source bytes changed during the native qualification: '+file;}
  if(report.failure)report.classification='FAILED_ATTEMPT';
  await writeFile(path.join(out,prepareOnly?'preparation-report.json':'report.json'),JSON.stringify(report,null,2)+'\n');
  await context?.close();await browser?.close();
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({passed:report.passed,classification:report.classification,browserExecuted:report.browserExecuted,checks:report.checks.length,captures:report.captures.length,failure:report.failure??null,report:path.join(out,prepareOnly?'preparation-report.json':'report.json')}));
if(report.failure||(!prepareOnly&&!report.passed)||(prepareOnly&&!report.preparationCompleted))process.exitCode=1;
