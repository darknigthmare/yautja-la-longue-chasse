import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { measureSpriteContact } from '../app/game/spriteContact.ts';

const seeds=JSON.parse(await fs.readFile('docs/v63-generation/fighters-seeds.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const additions=[],entries=[],characters=[];
for(const character of seeds.characters){
  const {key,fighterId,variantId}=character, directory=`/game/sprites/v63/fighters/${key}`;
  await fs.mkdir(`public${directory}`,{recursive:true});const measured=[];
  for(const seed of character.accepted){
    assert.equal(seed.visualReviewed,true);const bytes=await fs.readFile(seed.nativePath),meta=await sharp(bytes).metadata();
    assert.equal(meta.hasAlpha,true);const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const rects=seed.nativeRects??[[0,0,info.width,info.height]],frames=[];
    for(const rect of rects){
      const[x0,y0,w,h]=rect;assert(x0>=0&&y0>=0&&x0+w<=info.width&&y0+h<=info.height);
      const pixels=Buffer.alloc(w*h*4);let minX=w,minY=h,maxX=-1,maxY=-1,transparent=0,borderAlpha=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const off=((y0+y)*info.width+x0+x)*4;data.copy(pixels,(y*w+x)*4,off,off+4);const a=data[off+3];
        if(a>2){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}else transparent++;
        if(x===0||y===0||x===w-1||y===h-1)borderAlpha=Math.max(borderAlpha,a);
      }
      assert(maxX>minX&&maxY>minY&&transparent>w*h*.15);assert(borderAlpha<=2,`${key}/${seed.id} cropped edge alpha${borderAlpha}`);
      const contact=measureSpriteContact(pixels,w,h,h);assert(contact);
      frames.push({rect,pivot:[w/2,contact.supportY],alphaBounds:[minX,minY,maxX-minX+1,maxY-minY+1],maxEdgeAlpha:borderAlpha,
        supportY:contact.supportY,frameSha256:hash(pixels),transparentFraction:transparent/(w*h)});
    }
    assert.equal(new Set(frames.map(f=>f.frameSha256)).size,frames.length);
    const src=`${directory}/${seed.id}.png`;await fs.copyFile(seed.nativePath,`public${src}`);assert.equal(hash(await fs.readFile(`public${src}`)),hash(bytes));
    measured.push({...seed,src,sha256:hash(bytes),bytes:bytes.length,width:info.width,height:info.height,hasAlpha:true,sourcePixelsModified:false,frames});
  }
  const portrait=measured.find(m=>m.kind==='portrait'),p=portrait.frames[0];
  const variant={id:variantId,label:character.label,src:portrait.src,width:portrait.width,height:portrait.height,pivot:p.pivot,bodyTopY:p.alphaBounds[1],
    nativeFacing:'right',sha256:portrait.sha256,sourceArchive:'OpenAI intégré V63 · références primaires PlayStation / IllFonic',
    sourceEntry:'docs/v63-generation/fighters-art.json',frameCount:1,animated:false,identityStatus:'primary-game-appearance',
    canonicalFidelityCertified:false,artProvenance:'openai-primary-reference',sourceUrls:character.referenceUrls,sourceNotes:seeds.loreLimits};
  additions.push({fighterId,variants:[variant]});
  const sheets=measured.filter(m=>m.kind==='idle');assert.deepEqual(sheets.map(m=>m.facing).sort(),['left','right']);
  const pages=sheets.map(m=>({id:m.id,src:m.src,width:m.width,height:m.height,status:'validated',transparency:{mode:'alpha',noiseFloor:2}}));
  const refs=Object.fromEntries(sheets.map(m=>[m.id,Math.round(m.frames.reduce((n,f)=>n+f.supportY-f.alphaBounds[1],0)/6)]));
  const clips=sheets.map(m=>({id:'idle',facing:m.facing,status:'validated',loop:true,ticksPerSecond:60,
    frames:m.frames.map(f=>({pageId:m.id,rect:f.rect,pivot:f.pivot,durationTicks:12}))}));
  const common={fighterId,variantId,bodyHeightPx:refs[sheets[0].id],pageBodyHeightPx:refs,
    visibleFrameBounds:sheets.flatMap(m=>m.frames.map(f=>({pageId:m.id,rect:f.rect,visibleRect:[f.rect[0]+f.alphaBounds[0],f.rect[1]+f.alphaBounds[1],f.alphaBounds[2],f.alphaBounds[3]]})))};
  const atlas={schemaVersion:1,id:`${key}-idle-v63`,characterId:fighterId,variantId,sourceKind:'authored-frames',status:'validated',pages,clips};
  entries.push({...common,atlas},{...common,visibleFrameBounds:undefined,heldPoseClips:sheets.map(m=>({id:'idle',facing:m.facing})),
    atlas:{...atlas,id:`${key}-stance-v63`,clips:clips.map(c=>({...c,loop:false,frames:[{...c.frames[0],durationTicks:1}]}))}});
  characters.push({...character,accepted:measured,deliveredNativeDrawings:13,nativeAnimationClips:2,heldFallbackClipsAreNotAnimations:true,complete18ActionKit:false});
}
await fs.writeFile('app/game/data/pitUserVariantsV63.json',JSON.stringify({schemaVersion:1,release:'V63',variantAdditions:additions},null,2)+'\n');
await fs.writeFile('app/game/data/pitUserAnimationsV63.json',JSON.stringify(entries,null,2)+'\n');
const receipt={schemaVersion:1,release:'V63',method:seeds.method,characters,rejected:seeds.rejected,loreLimits:seeds.loreLimits,
  pngs:characters.reduce((n,c)=>n+c.accepted.length,0),nativeDrawings:26,nativeAnimationClips:4,newIdentities:0,newAppearances:2,
  historicalAssetsPreserved:true,visualRuntimeReview:'pending'};
await fs.writeFile('docs/v63-generation/fighters-art.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({pngs:receipt.pngs,nativeDrawings:26,appearances:2,newIdentities:0,frameRectangles:'Native measured gutter y540; source PNG bytes unchanged.'}));
