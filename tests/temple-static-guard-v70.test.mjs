import assert from 'node:assert/strict';
import {test} from 'node:test';
import sharp from 'sharp';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
import {playTemple} from './helpers/solo-v70-played-route.mjs';

test('the actual temple renderer places the native guard boots on the floor despite 237 rows of transparent padding',async()=>{
 const p=homeworldQaModelV64(process.cwd(),['../firstHuntSoloV70Rendering.ts','../youthArtManifest.ts','../youthTrainingRendering.ts','../spriteContact.ts']);
 const {data,info}=await sharp('public'+p.TEMPLE_GUARD_V70).ensureAlpha().raw().toBuffer({resolveWithObject:true});const measured=p.measureSpriteContact(data,info.width,info.height,info.height);assert(measured);assert.equal(measured.offsetY,0);assert(info.height-measured.supportY>200);
 let top=info.height;for(let y=0;y<info.height;y++){let pixels=0;for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=128)pixels++;if(pixels>=8){top=y;break;}}
 const height=(measured.supportY-top)*140/info.height;assert(height>=100&&height<112,'human guard scale below the young Yautja');
 const images=new Map(p.youthArtSources(p.YOUTH_ART_MANIFEST).map(src=>[src,{width:1536,height:1024}])),guard={width:info.width,height:info.height};images.set(p.TEMPLE_GUARD_V70,guard);images.set('/game/homeworld/v70/temple-modules.png',{width:1536,height:1024});
 const calls=[],context=new Proxy({canvas:{width:960},globalAlpha:1,drawImage(...args){calls.push(args);}}, {get(target,key){return key in target?target[key]:()=>{};}});
 const old=globalThis.document;globalThis.document={createElement(){let source;return{width:0,height:0,getContext(){return{drawImage(image){source=image;},getImageData(){return{data:source===guard?data:new Uint8Array(4)};}};}};}};
 try{const run=playTemple({stop:'configuration'});assert.equal(run.state.room,6);p.drawFirstHuntSoloV70(context,run.state,{manifest:p.YOUTH_ART_MANIFEST,images},false);}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
 const draw=calls.find(c=>c[0]===guard);assert(draw);const scale=draw[8]/info.height;assert(Math.abs(draw[6]+measured.supportY*scale-430)<1e-8,'measured native boot support must meet the actual floor');assert.equal(draw[8],140);assert.equal(images.get(p.TEMPLE_GUARD_V70),guard);
});
