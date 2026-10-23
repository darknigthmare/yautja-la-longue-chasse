/** Bounded new V106 native inputs, available before proof promotion.
 * This inventories real imported definitions and hashes; it grants no gameplay PASS. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import sharp from 'sharp';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const entry = `export {PIT_WORKBOOK_ADDITIONAL_MOVES_V106,PIT_WORKBOOK_ADDITIONAL_REGISTRY_V106} from './app/game/pitWorkbookRegistryV106';
export {PIT_WORKBOOK_ENTITY_SOURCES_V106} from './app/game/systems/pitWorkbookProjectileSourceV106';
export {PIT_WORKBOOK_SUPER_SOURCES_V106} from './app/game/systems/pitWorkbookSuperSourceV106';
export {validateHunterSpriteAtlas} from './app/game/hunterSpriteAtlas';
export {HOMEWORLD_ARCHIVE_V106} from './app/game/systems/homeworldArchiveDefinitionV106';
export {default as homeworldDecorV80} from './app/game/data/homeworldNativeDecorV80.json';
export {HUNTER_ASSET_ROOT_V3,HUNTER_BODY_PART_IDS,hunterBodyPartPath,hunterBodyFullPath,hunterDreadPath} from './app/game/hunterVisuals';`;
const local = file => typeof file === 'string' && !path.isAbsolute(file) && !file.includes('\\') && file.split('/').every(part=>part&&part!=='.'&&part!=='..');
async function fingerprints(files) {
 return Promise.all([...new Set(files)].sort().map(async file=>{
  assert.ok(local(file),'Local V106 input required');
  const bytes=await fs.readFile(path.join(ROOT,file));return {path:file,sha256:sha(bytes),bytes:bytes.length};
 }));
}

export async function collectRuntimeInputsV106() {
 const compiled=await build({stdin:{contents:entry,resolveDir:ROOT},absWorkingDir:ROOT,bundle:true,metafile:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 const imports=Object.keys(compiled.metafile.inputs).filter(file=>file!=='<stdin>');
 const before=await fingerprints(imports);
 const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const moves=api.PIT_WORKBOOK_ADDITIONAL_MOVES_V106,sources=[...api.PIT_WORKBOOK_ENTITY_SOURCES_V106,...api.PIT_WORKBOOK_SUPER_SOURCES_V106];
 assert.deepEqual(moves.map(move=>move.actionId).sort(),['M_F003_S3','M_F003_SUPER','M_F006_S1','M_F006_S2','M_F006_SUPER']);
 assert.deepEqual(sources.map(source=>source.actionId).sort(),moves.map(move=>move.actionId).sort());
 const assets=new Map();
 for(const move of moves){
  const source=sources.find(item=>item.actionId===move.actionId);
  for(const key of ['startup','active','recovery','damage','costPercent'])assert.equal(source.sourceTargets[key],move[key],'Source target changed: '+move.actionId+'/'+key);
  const definition=api.PIT_WORKBOOK_ADDITIONAL_REGISTRY_V106.find(item=>item.fighterId===move.fighterId&&item.atlas.id===source.atlasId+'-action-v106');
  assert.ok(definition&&api.validateHunterSpriteAtlas(definition.atlas).valid,'Native additional V106 definition required: '+move.actionId);
  assert.equal(definition.atlas.clips.length,move.key==='SUPER'?8:6);
  for(const facing of ['right','left'])for(const phase of move.key==='SUPER'?['startup','active','recovery','recovery.confirmed']:['startup','active','recovery']){
   const clip=definition.atlas.clips.find(item=>item.facing===facing&&item.id===`pit.stand.workbook-v106.${move.key}.${phase}`);
   assert.ok(clip&&clip.status==='validated');
   assert.equal(clip.frames.reduce((n,f)=>n+f.durationTicks*60/clip.ticksPerSecond,0),move[phase.startsWith('recovery')?'recovery':phase],'Phase duration changed');
  }
  for(const page of definition.atlas.pages){
   assert.ok(page.src.startsWith('/game/')&&source.sourceHashes[page.src],'Calibrated source page required');
   const file='public'+page.src,bytes=await fs.readFile(path.join(ROOT,file));
   assert.equal(sha(bytes),source.sourceHashes[page.src],'Native V106 PNG changed: '+file);
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(bytes.readUInt32BE(16),page.width);assert.equal(bytes.readUInt32BE(20),page.height);
   assets.set(file,{path:file,sha256:sha(bytes),bytes:bytes.length,width:page.width,height:page.height,scope:'Existing native BODY page; no standalone projectile sprite or new drawing is implied.'});
  }
 }
 assert.equal(assets.size,11,'Exactly eleven new-recipe native pages expected');
 const archive=api.HOMEWORLD_ARCHIVE_V106;
 const artIds=[...new Set([...archive.supports.map(support=>support.artId),archive.caseArtId])];
 assert.equal(artIds.length,2,'Two existing native archive furniture assets expected');
 for(const id of artIds){
  assert.ok(id.startsWith('court-native-v80:'));
  const native=api.homeworldDecorV80.assets[id.split(':').at(-1)];
  assert.ok(native&&native.status==='MEASURED_NATIVE'&&native.src.startsWith('/game/homeworld/v80/'),'Measured original archive prop required');
  const file='public'+native.src,bytes=await fs.readFile(path.join(ROOT,file));
  assert.equal(sha(bytes),native.sha256,'Native Homeworld prop changed: '+file);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16),native.sourceWidth);assert.equal(bytes.readUInt32BE(20),native.sourceHeight);
  assets.set(file,{path:file,sha256:native.sha256,bytes:bytes.length,width:native.sourceWidth,height:native.sourceHeight,scope:'Existing native court furniture, reused for local study cases and lecterns; no new plaque, lineage or painted asset.'});
 }
 assert.equal(assets.size,13,'Eleven combat pages and two archive props expected');
 // HomeworldModularHunter's actual classic/reference image requests. The head
 // replaces the legacy head part: 14 body parts + head + dreads + net + mask.
 const npcSources=[...api.HUNTER_BODY_PART_IDS.map(id=>api.hunterBodyPartPath('classic',id,'reference')),api.hunterDreadPath('classic'),api.hunterBodyFullPath('classic'),api.HUNTER_ASSET_ROOT_V3+'/body/classic/net/full.webp'];
 assert.equal(new Set(npcSources).size,18,'Exactly eighteen classic/reference image inputs expected');
 for(const src of npcSources){
  assert.ok(src.startsWith('/game/'));
  const file='public'+src,bytes=await fs.readFile(path.join(ROOT,file)),metadata=await sharp(bytes).metadata();
  assert.ok(metadata.width&&metadata.height&&['png','webp'].includes(metadata.format),'Original modular image expected: '+file);
  assets.set(file,{path:file,sha256:sha(bytes),bytes:bytes.length,width:metadata.width,height:metadata.height,scope:'Existing classic/reference modular NPC image, newly connected to the archive activity; no newly authored pixel or full BODY animation.'});
 }
 assert.equal(assets.size,31,'Eleven combat pages, two archive props and eighteen modular NPC images expected');
 assert.deepEqual(await fingerprints(imports),before,'V106 inputs changed during collection');
 const assetRows=[...assets.values()].sort((a,b)=>a.path.localeCompare(b.path));
 const inputs=await fingerprints([...imports,...assetRows.map(item=>item.path),'scripts/collect-v106-runtime-inputs.mjs','app/game/HomeworldModularHunter.tsx','app/game/HomeworldArchiveWorldV106.tsx','app/game/data/homeworldCharacterGroundV64.json']);
 for(const asset of assetRows)assert.equal(inputs.find(input=>input.path===asset.path).sha256,asset.sha256,'Public input changed during collection: '+asset.path);
 return {schemaVersion:1,status:'INPUTS_ONLY',scope:'Five combat targets, eleven admitted native BODY pages, two native archive props and eighteen inherited classic/reference NPC images. No new pixel, gameplay/browser validation or complete-character claim.',assets:assetRows,inputs};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 assert.equal(process.argv.length,2,'Usage: node scripts/collect-v106-runtime-inputs.mjs');
 console.log(JSON.stringify(await collectRuntimeInputsV106(),null,2));
}
