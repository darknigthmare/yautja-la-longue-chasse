import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {build} from 'esbuild';
const manifest=JSON.parse(await fs.readFile('app/game/data/pitOriginalFighterArtV56.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bundle=await build({stdin:{contents:[
  'systems/pitOriginalFightersV56','systems/pitOriginalStagesV56','systems/pitRosterExpansion','systems/pitFirstEdition',
  'systems/pitCombat','systems/pitReplay','systems/pitCharacterStages','systems/pitScreenArenas',
  'pitCombatBitmapArt','pitRosterIcons','pitSpriteSheetRegistry','spriteContact',
].map(n=>`export * from './app/game/${n}';`).join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const ids=['original-arid-ermit-yautja','original-mutated-yautja','guest-amengi-female'];

test('three distinct supplied profiles produce198 identities without changing first-edition progression or pretending to be canon',()=>{
  assert.deepEqual(p.PIT_ORIGINAL_FIGHTER_IDS_V56,ids);assert.equal(p.PIT_VERSUS_FIGHTER_IDS.length,198);
  assert.equal(new Set(p.PIT_VERSUS_FIGHTER_IDS).size,198);assert.equal(p.PIT_FIRST_EDITION_FIGHTER_IDS.length,12);
  for(const id of ids){const profile=p.getPitFighterProfile(id);assert.equal(profile.id,id);assert.equal(profile.canonicalIdentityVerified,false);
    assert.equal(profile.progressionAvailable,false);assert.equal(profile.nativeAnimationClips,0);assert.equal(profile.visualStatus,'single-static-cutout');
    assert.equal(p.PIT_FIGHTERS[id].canCloak,false);assert(!p.PIT_FIRST_EDITION_FIGHTER_IDS.includes(id));
    for(const mode of ['cpu','local','training'])assert(p.canPitFighterEnterMode(id,mode));
    for(const mode of ['arcade','circuit','descent'])assert.equal(p.canPitFighterEnterMode(id,mode),false);
    assert.notDeepEqual(p.PIT_FIGHTERS[id].attacks,p.PIT_FIGHTERS['jungle-hunter'].attacks);
    assert.equal(p.PIT_FIGHTERS[id].technique.motion,'attached');assert.equal(p.PIT_FIGHTERS[id].technique.speed,0);
    assert.equal(p.PIT_SPRITE_SHEET_REGISTRY.filter(s=>s.fighterId===id).length,0);
  }
  assert.equal(new Set(ids.map(id=>JSON.stringify(p.PIT_FIGHTERS[id].attacks))).size,3);
  assert.equal(p.getPitFighterProfile('guest-amengi-female').archetype,'reach');
  assert.equal(p.isPitOriginalFighterIdV56('constructor'),false);
});

test('supplied originals and native transparent cutouts have traceable bytes, substantial alpha, measured pivots and honest thumbnails',async()=>{
  assert.deepEqual(manifest.fighters.map(f=>f.fighterId),ids);assert.equal(manifest.nativeAnimationClips,0);
  for(const art of manifest.fighters){
    const original=await fs.readFile('public'+decodeURIComponent(art.sourceSrc));assert.equal(hash(original),art.sourceSha256);
    const bytes=await fs.readFile('public'+art.src);assert.equal(hash(bytes),art.sha256);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,art.width);assert.equal(info.height,art.height);assert(art.alpha.transparentPixels>info.width*info.height*.3);
    const contact=p.measureSpriteContact(data,info.width,info.height,art.pivot[1]);assert(contact);assert.equal(contact.supportY,art.pivot[1]);assert.equal(contact.offsetY,0);
    for(let x=0;x<info.width;x++){assert(data[x*4+3]<=8);assert(data[((info.height-1)*info.width+x)*4+3]<=8);}
    for(let y=0;y<info.height;y++){assert(data[(y*info.width)*4+3]<=8);assert(data[(y*info.width+info.width-1)*4+3]<=8);}
    const def=p.getPitCombatBitmapArtDefinition(art.fighterId);assert.equal(def.src,art.src);assert.equal(def.nativeFacing,'right');
    assert.equal(p.getPitCombatBitmapArtDefinition(art.fighterId,'foreign-costume'),null);
    const icon=p.getPitRosterIcon(art.fighterId);assert(icon);assert.equal(icon.sourceSha256,art.sha256);
    const iconMetadata=await sharp('public'+icon.src).metadata();assert.equal(iconMetadata.width,icon.width);assert.equal(iconMetadata.height,icon.height);
    assert(icon.bytes<art.bytes/10);assert.equal(art.frameCount,1);
  }
});

test('three new associations use playable original exhibitions and leave the V55 source plan at195',async()=>{
  const plan=JSON.parse(await fs.readFile('docs/v55-stage-plan.json','utf8'));assert.equal(plan.associations.length,195);
  assert.equal(p.PIT_CHARACTER_STAGE_COVERAGE.length,198);assert.equal(p.PIT_ORIGINAL_STAGE_ASSOCIATIONS_V56.length,3);
  for(const id of ids){const association=p.getPitCharacterStageAssociation(id);assert(association);assert(p.PIT_ARENAS[association.stageId]);
    assert.equal(association.classification,'original-exhibition');assert.equal(association.sourceStatus,'original-selected');
    assert.equal(association.exactGeometryCertified,false);assert.deepEqual(association.sourceUrls,[]);
    assert.equal(p.getPitScreenArenaMetadata(association.stageId),null);assert(!plan.associations.some(a=>a.fighterId===id));
  }
});

test('unsupported camouflage neither activates nor spends meter on the three gearless supplied designs',()=>{
  const equipped=p.createPitCombatState('jungle-hunter','berserker');equipped.fighters[0].traque=p.PIT_CLOAK_COST;
  assert.equal(p.stepPitCombat(equipped,[{resource:true},{}]).fighters[0].cloakPhase,'startup','same input still activates equipped historical hunters');
  for(const id of ids){let state=p.createPitCombatState(id,'jungle-hunter');state.fighters[0].traque=p.PIT_CLOAK_COST;let idle=structuredClone(state);
    for(let tick=0;tick<20;tick++){state=p.stepPitCombat(state,[{resource:tick%2===0},{}]);idle=p.stepPitCombat(idle,[{},{}]);}
    assert.equal(state.fighters[0].cloakPhase,'inactive');assert.equal(state.fighters[0].traque,idle.fighters[0].traque,'ordinary passive meter gain is unchanged');
    assert.equal(state.events.some(e=>e.type==='cloak-start'&&e.fighterId===id),false);
  }
});

test('new contact profiles actually differ: timed riposte, body advance and blockable low sweep',()=>{
  const close=(id,distance=60)=>{const state=p.createPitCombatState(id,'berserker');state.fighters[0].x=350;state.fighters[1].x=350+distance;return state;};
  let arid=close(ids[0]);const health=arid.fighters[0].health;
  for(let frame=0;frame<35;frame++)arid=p.stepPitCombat(arid,[frame===0?{attack:'technique'}:{},frame===4?{attack:'light'}:{}]);
  assert.equal(arid.fighters[0].health,health,'timed physical riposte intercepts an incoming contact');
  assert(arid.fighters[1].health<p.PIT_FIGHTERS.berserker.maxHealth);
  let mutated=close(ids[1],85);
  for(let frame=0;frame<40;frame++)mutated=p.stepPitCombat(mutated,[frame===0?{attack:'technique'}:{},{}]);
  assert(mutated.fighters[0].x>350,'body impact advances its owner');assert(mutated.fighters[1].health<p.PIT_FIGHTERS.berserker.maxHealth);
  const sweep=guard=>{let state=close(ids[2],90);for(let frame=0;frame<45;frame++)state=p.stepPitCombat(state,[frame===0?{attack:'technique'}:{},{[guard]:true}]);return state;};
  assert(sweep('guardHigh').fighters[1].health<p.PIT_FIGHTERS.berserker.maxHealth,'low sweep crosses standing guard');
  assert.equal(sweep('guardLow').fighters[1].health,p.PIT_FIGHTERS.berserker.maxHealth,'crouched guard blocks the physical low attack without chip');
});

for(const id of ids)for(const slot of [0,1])test(`real deterministic win, round transition and replay: ${id} slot${slot}`,()=>{
  const fighters=slot===0?[id,'jungle-hunter']:['jungle-hunter',id];const arenaId=p.getPitCharacterStageAssociation(id).stageId;
  let state=p.createPitCombatState(...fighters,{arenaId});const recorder=p.createPitReplayRecorder({fighters,arenaId,seed:561});
  for(let tick=0;tick<12000&&state.phase!=='match-over';tick++){
    const a=state.fighters[slot],b=state.fighters[1-slot],inputs=[{},{}];
    if(state.phase==='round'){
      if(Math.abs(a.x-b.x)>60)inputs[slot]=b.x>a.x?{right:true}:{left:true};
      else if(b.phase!=='knockdown'&&b.wakeInvulnerabilityFrames===0&&a.phase==='idle')inputs[slot]={attack:'heavy'};
    }
    recorder.append(inputs);state=p.stepPitCombat(state,inputs);
  }
  assert.equal(state.phase,'match-over');assert.equal(state.matchWinnerId,id);assert(state.round>=2);
  assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)),state);
  const replay=p.deserializePitReplay(p.serializePitReplay(recorder.finish()));assert(replay);
  assert.equal(p.serializePitCombat(p.playPitReplay(replay)),p.serializePitCombat(state));
});

test('each bitmap uses the correct source, full camera envelope and opponent-facing mirror without manufacturing animation',()=>{
  for(const art of manifest.fighters)for(const facing of [-1,1]){
    const fighter={...p.createPitCombatState(art.fighterId,'jungle-hunter').fighters[0],x:350,y:23,facing};
    const bitmap={complete:true,naturalWidth:art.width,naturalHeight:art.height};
    const bank={images:new Map([[art.fighterId,bitmap]]),readyIds:new Set([art.fighterId]),requestedIds:new Set([art.fighterId]),failedIds:new Set(),cancelled:false};
    let scale,translate,rectangle;const context={globalAlpha:1,save(){},restore(){},scale(...x){scale=x;},translate(...x){translate=x;},drawImage(image,...x){assert.equal(image,bitmap);rectangle=x;}};
    assert.equal(p.getPitCombatBitmapArtStatus(bank,art.fighterId),'static-bitmap');assert(p.drawPitCombatBitmapFighter(context,bank,fighter,500));
    assert.equal(scale[0]>0,facing===1);assert.equal(translate[1],500-fighter.y);assert.equal(rectangle[1],-art.pivot[1]);
    const bounds=p.getPitCombatBitmapVisualBounds(fighter,500,[]);assert(bounds);
    assert(Math.abs(bounds.height-art.height*scale[1])<1e-8);assert(Math.abs(bounds.width-Math.abs(art.width*scale[0]))<1e-8);
  }
});
