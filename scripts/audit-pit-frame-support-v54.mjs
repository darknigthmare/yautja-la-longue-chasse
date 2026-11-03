import fs from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';
const built = await build({stdin:{contents:`export * from './app/game/pitSpriteSheetRegistry.ts'; export * from './app/game/hunterSpriteAtlas.ts'; export {PIT_FIGHTERS} from './app/game/systems/pitCombat.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const results=[];
for(const entry of api.PIT_SPRITE_SHEET_REGISTRY) for(const page of entry.atlas.pages) {
  const {data,info}=await sharp('public'+page.src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const rgba=api.processHunterSpriteTransparency(new Uint8ClampedArray(data),info.width,info.height,page.transparency).pixels;
  for(const clip of entry.atlas.clips) for(const frame of clip.frames) {
    if(frame.pageId!==page.id)continue;
    const [x,y,w,h]=frame.rect;let bottom=-1;
    for(let row=h-1;row>=0&&bottom<0;row--) {
      let solid=0;
      for(let column=0;column<w;column++)if(rgba[((y+row)*info.width+x+column)*4+3]>=128)solid++;
      if(solid>=3)bottom=row;
    }
    const scale=api.PIT_FIGHTERS[entry.fighterId].bodyHeight/(entry.pageBodyHeightPx?.[page.id]??entry.bodyHeightPx);
    results.push({fighterId:entry.fighterId,variantId:entry.variantId??null,atlasId:entry.atlas.id,clip:clip.id,facing:clip.facing,src:page.src,rect:frame.rect,pivot:frame.pivot,opaqueBottom:bottom,gapWorldPx:Number(((frame.pivot[1]-bottom)*scale).toFixed(3))});
  }
}
await fs.mkdir('outputs/qa-commercial-audit/v54',{recursive:true});
await fs.writeFile('outputs/qa-commercial-audit/v54/frame-support-audit.json',JSON.stringify({scope:'Read-only alpha support candidates; raised feet/airborne poses require semantic review.',frames:results},null,2));
console.log(JSON.stringify({frames:results.length,largest:results.filter(r=>/idle|walk|guard|intro/.test(r.clip)).sort((a,b)=>b.gapWorldPx-a.gapWorldPx).slice(0,18).map(r=>({fighter:r.fighterId,clip:r.clip,gap:r.gapWorldPx,src:r.src,rect:r.rect,pivot:r.pivot}))}));
