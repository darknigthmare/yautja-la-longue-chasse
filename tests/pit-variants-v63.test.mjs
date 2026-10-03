import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { build } from 'esbuild';
const manifest=JSON.parse(await fs.readFile('app/game/data/pitUserVariantsV63.json','utf8'));
const receipt=JSON.parse(await fs.readFile('docs/v63-generation/fighters-art.json','utf8'));
const entries=JSON.parse(await fs.readFile('app/game/data/pitUserAnimationsV63.json','utf8'));
const historical=JSON.parse(await fs.readFile('app/game/data/pitUserHuntersV44.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const built=await build({stdin:{contents:["export * from './app/game/pitSpriteSheetAnimation';","export * from './app/game/hunterSpriteAtlas';",
  "export * from './app/game/pitCombatBitmapArt';","export * from './app/game/systems/pitCombat';","export * from './app/game/systems/pitRosterExpansion';",
  "export * from './app/game/systems/pitUserRoster';"].join('\n'),resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const decoded=new Map();
for(const c of receipt.characters)for(const source of c.accepted){const bytes=await fs.readFile('public'+source.src);
  const{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});decoded.set(source.src,{bytes,pixels:new Uint8ClampedArray(data),...info});}
function browser(failed=[]){
  const previous={Image:globalThis.Image,document:globalThis.document},requests=[];
  globalThis.Image=class{set src(value){this.source=value;if(!value)return;requests.push(value);const d=decoded.get(value);
    if(!d||failed.includes(value)){queueMicrotask(()=>this.onerror?.());return;}this.complete=true;this.naturalWidth=d.width;this.naturalHeight=d.height;this.pixels=d.pixels;queueMicrotask(()=>this.onload?.());}get src(){return this.source;}};
  globalThis.document={createElement(){let pixels;return{width:0,height:0,getContext(){return{clearRect(){},drawImage(image){pixels=new Uint8ClampedArray(image.pixels);},getImageData(){return{data:pixels};},putImageData(data){pixels=data.data;}};}};}};
  return{requests,restore(){Object.assign(globalThis,previous);}};
}
test('V63 adds two source-specific appearances with no new identities and preserves every historical default and bitmap',()=>{
  assert.equal(p.PIT_VERSUS_FIGHTER_IDS.length,201);assert.equal(receipt.newIdentities,0);assert.equal(receipt.newAppearances,2);
  for(const original of historical.fighters){const actual=p.getPitFighterVariants(original.id),addition=manifest.variantAdditions.find(a=>a.fighterId===original.id);
    assert.equal(actual.length,original.variants.length+(addition?.variants.length??0));
    assert.deepEqual(actual.slice(0,original.variants.length).map((v,i)=>({...v,label:original.variants[i].label})),original.variants);
  }
  assert.equal(new Set(p.getPitFighterVariants('greyback').map(v=>v.label)).size,5);
});
for(const character of receipt.characters){
  const fighterId=character.fighterId,variant=manifest.variantAdditions.find(a=>a.fighterId===fighterId).variants[0];
  const registry=entries.filter(e=>e.fighterId===fighterId);
  test(`${character.key}: exact variant ownership survives serialization without borrowing another incarnation`,()=>{
    assert.match(variant.label,/Hunting Grounds/);assert.equal(variant.canonicalFidelityCertified,false);
    const other=receipt.characters.find(c=>c.fighterId!==fighterId).fighterId;assert.equal(p.getPitUserVariant(other,variant.id),null);
    const state=p.createPitCombatState(fighterId,'user-samurai',{variants:[variant.id,null]});
    const restored=p.deserializePitCombat(p.serializePitCombat(state));assert.equal(restored.fighters[0].variantId,variant.id);
    assert.equal(p.getPitCombatBitmapArtDefinition(fighterId,variant.id).src,variant.src);
  });
  test(`${character.key}: thirteen native drawings and unequal rectangles retain transparent complete silhouettes`,()=>{
    assert.equal(character.deliveredNativeDrawings,13);assert.equal(character.complete18ActionKit,false);
    for(const source of character.accepted){const d=decoded.get(source.src);assert.equal(hash(d.bytes),source.sha256);assert.equal(source.sourcePixelsModified,false);
      for(const f of source.frames){const[x0,y0,w,h]=f.rect,pixels=Buffer.alloc(w*h*4);let edge=0;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=((y+y0)*d.width+x+x0)*4;pixels.set(d.pixels.subarray(o,o+4),(y*w+x)*4);
          if(x===0||y===0||x===w-1||y===h-1)edge=Math.max(edge,d.pixels[o+3]);}
        assert.equal(hash(pixels),f.frameSha256);assert(edge<=2);assert(f.transparentFraction>.15);assert(f.pivot[1]<h);
      }
    }
    const sheets=character.accepted.filter(s=>s.kind==='idle');assert.equal(new Set(sheets.flatMap(s=>s.frames.map(f=>f.frameSha256))).size,12);
    assert.notEqual(sheets[0].sha256,sheets[1].sha256);assert(registry.every(e=>p.validateHunterSpriteAtlas(e.atlas).valid));
  });
  test(`${character.key}: real PNG loading cycles twelve native frames and preserves scale for both rectangle heights`,async()=>{
    const env=browser();try{const bank=await p.loadPitSpriteSheetAnimations([fighterId],registry,{variants:[variant.id]});assert.deepEqual(bank.failedAtlasIds,[]);assert.equal(bank.readyClipCount,4);
      const combat=p.createPitCombatState(fighterId,'user-samurai',{variants:[variant.id,null]});
      for(const facing of[1,-1]){const body={...combat.fighters[0],facing},seen=new Set();
        for(let tick=0;tick<72;tick+=12){combat.frame=tick;const r=p.resolvePitSpriteSheetAnimation(bank,body,{simulationFrame:tick,combat});assert(r);
          assert.equal(r.resolved.frame.clip.facing,facing===1?'right':'left');seen.add(r.resolved.frame.frameIndex);
          const draws=[],ctx={save(){},restore(){},globalAlpha:1,drawImage(...args){draws.push(args);},scale(){assert.fail('Native side must never mirror.');}};
          assert(p.drawPitSpriteSheetAnimation(ctx,bank,body,440,{simulationFrame:tick,combat}));assert(Math.abs(draws[0][7]/draws[0][3]-draws[0][8]/draws[0][4])<1e-12);
        }assert.equal(seen.size,6);combat.frame=80;const walking={...body,velocityX:4*facing};
        assert.equal(p.resolvePitSpriteSheetAnimation(bank,walking,{simulationFrame:80,combat}),null);
        const held=p.resolvePitSpriteSheetHold(bank,walking,{simulationFrame:80,combat});assert(held);assert.equal(held.frame.frameIndex,0);assert.equal(held.frame.clip.facing,facing===1?'right':'left');
      }
    }finally{env.restore();}
  });
  test(`${character.key}: failed guard pages fall back to this portrait rather than an unrelated historical drawing`,async()=>{
    const env=browser(registry[0].atlas.pages.map(page=>page.src));try{
      const bank=await p.loadPitCombatBitmapArt([fighterId],{variants:[variant.id],spriteSheetRegistry:registry});
      const body=p.createPitCombatState(fighterId,'user-samurai',{variants:[variant.id,null]}).fighters[0];
      assert.equal(p.resolvePitSpriteSheetAnimation(bank.spriteSheets,body),null);assert.equal(p.getPitCombatBitmapFighterArtStatus(bank,body),'static-bitmap');
      assert(env.requests.every(src=>src.startsWith('/game/sprites/v63/fighters/'+character.key+'/')));
    }finally{env.restore();}
  });
}
