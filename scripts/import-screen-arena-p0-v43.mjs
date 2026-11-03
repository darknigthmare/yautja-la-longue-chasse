import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

// Imports only the original built-in output; no painting, re-encoding or resizing.
const input=process.argv[2];
assert(input,'Pass a reviewed generation-batch JSON');
const batch=JSON.parse(await fs.readFile(input,'utf8'));
const root=await fs.realpath('public/game/sprites/v43');
for(const item of batch){
 assert(/^arena-\d{3}-[a-z0-9-]+$/.test(item.id));
 assert(item.source&&item.prompt&&item.review,'An actual source, prompt and explicit visual review are required');
 const bytes=await fs.readFile(item.source), sha256=createHash('sha256').update(bytes).digest('hex');
 const meta=await sharp(bytes).metadata();
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=3;i<data.length;i+=info.channels)assert.equal(data[i],255,'P0 must be opaque');
 const publicPath='/game/sprites/v43/pit-arenas/'+item.id+'/p0-depth.png';
 const destination=path.resolve(root,'pit-arenas',item.id,'p0-depth.png');
 assert(destination.startsWith(root+path.sep));
 await fs.mkdir(path.dirname(destination),{recursive:true});
 try{const old=await fs.readFile(destination);assert.equal(createHash('sha256').update(old).digest('hex'),sha256,'Refusing to replace an imported image');}
 catch(error){if(error.code!=='ENOENT')throw error;await fs.copyFile(item.source,destination);}
 const archive='art-source/v43/pit-arenas/'+item.id;
 await fs.mkdir(archive,{recursive:true});
 const reviewEvidence=archive+'/review-p0-depth.md';
 await fs.writeFile(reviewEvidence,'# Revue visuelle P0 — '+item.id+'\n\n'+item.review+'\n\nAdaptation peinte pour la vue latérale 2D. La cohérence technique ne certifie pas une reproduction cinématographique 1:1. Les références et leurs limites sont consignées dans le plan V43.\n');
 const receipt={schemaVersion:1,accepted:true,generator:'openai-imagegen',mode:'built-in',arenaId:item.id,publicPath,
  archivedSource:'public'+publicPath,originalSource:item.source,prompt:item.prompt,sha256,width:meta.width,height:meta.height,hasAlpha:meta.hasAlpha??false,
  contentBounds:{x:0,y:0,width:meta.width,height:meta.height},reviewEvidence,canonFidelity:'documented-setting-2d-adaptation-not-exact-reconstruction'};
 await fs.writeFile(archive+'/receipt-p0-depth.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({id:item.id,path:publicPath,sha256,width:meta.width,height:meta.height}));
}
