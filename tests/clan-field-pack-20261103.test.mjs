import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import sharp from 'sharp';
const packed=await build({stdin:{contents:`export * from './app/game/systems/clanWarFieldControls'; export * from './app/game/ClanWarFieldSprite';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',logLevel:'silent',jsx:'automatic'});
const api=await import('data:text/javascript;base64,'+Buffer.from(packed.outputFiles[0].text).toString('base64'));
const root='public/game/assets/clan-field-20261103';
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'));
test('12 independent original props, no atlas or film fidelity claim',()=>{
 assert.equal(manifest.entries.length,12);
 assert.equal(manifest.method,'original-procedural-vector');
 assert.equal(manifest.canonFidelity,'NOT-CERTIFIED');
 assert.equal(manifest.collisionChanges,false);
 assert.equal(new Set(manifest.entries.map(v=>v.id)).size,12);
 assert.deepEqual(manifest.entries.map(v=>v.id),[...api.FIELD_SPRITE_IDS]);
 for(const ext of ['svg','png','webp'])assert.equal(readdirSync(root).filter(v=>v.endsWith('.'+ext)).length,12);
});
test('all 12 PNG and WebP sprites retain alpha, margins and their own pixels',async()=>{
 const hashes=new Set();
 for(const entry of manifest.entries){
  assert.equal(entry.nativeSingleObject,true);assert.equal(entry.animationFrames,1);
  for(const [ext,size] of [['png',512],['webp',256]]){
   const file=`${root}/${entry.id}.${ext}`;
   const bytes=readFileSync(file),hash=createHash('sha256').update(bytes).digest('hex');
   assert.equal(hash,entry.files[ext].sha256);assert.equal(bytes.length,entry.files[ext].bytes);
   const meta=await sharp(bytes).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);assert.equal(meta.hasAlpha,true);
   const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let ink=0;
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const a=data[(y*size+x)*info.channels+3];
    if(a>0)ink++;
    if(x<8||y<8||x>=size-8||y>=size-8)assert.equal(a,0,entry.id+' clipped to border');
   }
   assert.ok(ink>size*size*.04&&ink<size*size*.7,entry.id+' invalid sprite coverage');
   if(ext==='png'){assert.ok(!hashes.has(hash),'duplicate native image');hashes.add(hash);}
  }
  const svg=readFileSync(`${root}/${entry.id}.svg`,'utf8');
  assert.equal(createHash('sha256').update(svg).digest('hex'),entry.files.svg.sha256);
  assert.ok(!/<(?:script|foreignObject|text)\b/i.test(svg));
  assert.ok(!/data:image|http[s]?:\/\/(?!www\.w3\.org)/i.test(svg));
 }
});
test('AZERTY/QWERTY/arrows issue exactly one safe input with no repeat',()=>{
 const expected={ArrowUp:'up',z:'up',w:'up',ArrowLeft:'left',a:'left',q:'left',ArrowDown:'down',s:'down',ArrowRight:'right',d:'right',' ':'wait',e:'interact'};
 for(const [key,action] of Object.entries(expected)){
  assert.equal(api.fieldKeyboardAction({key,mode:'stealth'}),action);
  assert.equal(api.fieldKeyboardAction({key,mode:'rts'}),action);
  for(const guard of ['repeat','editing','blocked','isComposing','ctrlKey','altKey','metaKey']){
   assert.equal(api.fieldKeyboardAction({key,mode:'stealth',[guard]:true}),null);
  }
 }
 assert.equal(api.fieldKeyboardAction({key:'Delete',mode:'rts'}),null);
 assert.equal(api.fieldKeyboardAction({key:'e',mode:'other'}),null);
 assert.equal(api.fieldKeyboardTargetBlocked(null),false);
});
test('sprite URLs cannot become external URLs or arbitrary save-controlled paths',()=>{
 for(const id of api.FIELD_SPRITE_IDS)assert.equal(api.fieldSpriteUrl(id),`/game/assets/clan-field-20261103/${id}.svg`);
 for(const bad of ['../main','https://example.com/x','unknown',null])assert.throws(()=>api.fieldSpriteUrl(bad),RangeError);
});
test('UI wiring keeps save locks, hidden actors and action preconditions',()=>{
 const ops=readFileSync('app/game/ClanWarOperationsV115.tsx','utf8');
 const rts=readFileSync('app/game/ClanWarRtsSquadsV133.tsx','utf8');
 assert.ok(ops.includes('FIELD_PROPS_20261103')&&rts.includes('FIELD_PROPS_20261103'));
 assert.ok(ops.includes('verifyOwnV115ArchiveV148')&&ops.includes('writeV115'));
 assert.ok(ops.includes('commit(commandStealthV115(worldRef.current,command,rules))'));
 assert.ok(ops.includes('actor.reinforcementMode===undefined&&!actor.supportGuard'));
 assert.ok(ops.includes('guardVisible&&stealth.guardX'));
 assert.ok(rts.includes('visibleWarRtsEnemiesV133(state)'));
 assert.ok(rts.includes('state.phase!=="active"||!selected||selected.status!=="active"'));
 assert.ok(rts.includes('maxWidth:"none"'));
 assert.ok(rts.includes('state.observed?mission.tasks'));
});
