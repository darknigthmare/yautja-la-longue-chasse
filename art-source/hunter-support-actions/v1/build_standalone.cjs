#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {assert}=require('./playback_core.js');
async function buildStandalone(folder,destination,sourceConfig) {
  folder=path.resolve(folder || __dirname);
  destination=path.resolve(destination || path.join(folder,'Yautja_Survie_Equipement_Canopee_V1_Apercu.html'));
  const config=JSON.parse(await fs.readFile(sourceConfig || path.join(__dirname,'sources.json'),'utf8'));
  const [manifest,playback]=await Promise.all(['animations.json','playback.json'].map(async file=>JSON.parse(await fs.readFile(path.join(folder,file),'utf8'))));
  assert(manifest.clips.length===config.expectedClipCount && manifest.frameCount===config.expectedSourceFrameCount,'Standalone export requires every source in the complete registry.');
  const embeddedAtlases={};
  for(const clip of manifest.clips) {
    const bytes=await fs.readFile(path.join(folder,clip.atlas));
    assert(crypto.createHash('sha256').update(bytes).digest('hex')===clip.sourceSha256,`${clip.id}: embedded source SHA mismatch.`);
    embeddedAtlases[clip.id]=`data:image/png;base64,${bytes.toString('base64')}`;
  }
  const template=await fs.readFile(path.join(__dirname,'preview_template.html'),'utf8');
  const core=await fs.readFile(path.join(__dirname,'playback_core.js'),'utf8');
  const html=template.replace('__PLAYBACK_CORE__',()=>core).replace('__SPRITE_DATA__',()=>JSON.stringify({manifest,playback,embeddedAtlases}).replaceAll('<','\\u003c'));
  assert((html.match(/data:image\/png;base64,/g) || []).length===manifest.clips.length,'Wrong embedded image count.');
  await fs.writeFile(destination,html);
  const report={schemaVersion:1,file:path.basename(destination),sourceAtlases:manifest.clips.length,sourceDrawings:manifest.frameCount,embeddedImages:Object.keys(embeddedAtlases).length,bytes:Buffer.byteLength(html),externalImageRequests:0,externalScripts:0,externalStyles:0,rendering:'Exact native-size crops from the original embedded atlas bytes; same frame offsets as relative preview.',artisticStatus:'draft',browserValidation:false};
  await fs.writeFile(path.join(folder,'standalone_preview.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(require.main===module)buildStandalone(process.argv[2],process.argv[3],process.argv[4]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={buildStandalone};

