#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {assert}=require('./playback_core.js');
async function buildPackageIndex(folder) {
  folder=path.resolve(folder || __dirname);
  const manifest=JSON.parse(await fs.readFile(path.join(folder,'animations.json'),'utf8'));
  const config=JSON.parse(await fs.readFile(path.join(folder,'sources.json'),'utf8'));
  assert(manifest.clips.length===config.expectedClipCount && manifest.frameCount===config.expectedSourceFrameCount,'The file index requires the complete exported registry.');
  const files=[];
  async function visit(relative='') {
    for(const entry of await fs.readdir(path.join(folder,relative),{withFileTypes:true})) {
      if(entry.name.startsWith('.'))continue;
      const file=path.posix.join(relative,entry.name);
      if(file==='package_file_index.json')continue;
      if(entry.isDirectory())await visit(file);
      else if(entry.isFile()) {
        const bytes=await fs.readFile(path.join(folder,file));
        let category='metadata';
        if(file.startsWith('frames/'))category='individual-sprite';
        else if(file.startsWith('atlases/'))category='source-atlas';
        else if(file.startsWith('import_atlases/'))category='guarded-import-atlas';
        else if(file.startsWith('runtime_atlases/'))category='native-draft-manifest';
        else if(file.startsWith('qa/'))category='review-evidence';
        else if(file.endsWith('.md'))category='documentation';
        else if(/\.(cjs|mjs|js)$/.test(file) || file==='preview_template.html')category='tooling';
        else if(file.endsWith('.html') || file.endsWith('.mp4') || file.endsWith('_Contact.png'))category='review-preview';
        files.push({path:file,category,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
      }
    }
  }
  await visit();files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  const byPath=new Map(files.map(file=>[file.path,file]));
  for(const clip of manifest.clips)assert(byPath.get(clip.atlas)?.sha256===clip.sourceSha256,`${clip.id}: indexed source SHA mismatch.`);
  const count=category=>files.filter(file=>file.category===category).length;
  assert(count('individual-sprite')===manifest.frameCount,'Unexpected individual sprite count.');
  assert(count('source-atlas')===manifest.clipCount && count('guarded-import-atlas')===manifest.clipCount,'Unexpected atlas count.');
  const result={schemaVersion:1,packId:manifest.packId,version:manifest.version,artisticStatus:'draft',layout:'Standalone downloadable pack; repository copies may use separate source/art/public directories.',sourceRegistryComplete:true,actions:manifest.actions.length,sourceDrawings:manifest.frameCount,sourceAtlases:manifest.clipCount,individualSprites:count('individual-sprite'),guardedImportAtlases:count('guarded-import-atlas'),spritePngFiles:manifest.frameCount+manifest.clipCount*2,reviewPngFiles:files.filter(file=>file.category==='review-preview' && file.path.endsWith('.png')).length,totalIndexedFiles:files.length,totalIndexedBytes:files.reduce((sum,file)=>sum+file.bytes,0),excludedFiles:['package_file_index.json (this index cannot include its own final hash)'],files};
  await fs.writeFile(path.join(folder,'package_file_index.json'),JSON.stringify(result,null,2)+'\n');
  return {actions:result.actions,sourceDrawings:result.sourceDrawings,sourceAtlases:result.sourceAtlases,spritePngFiles:result.spritePngFiles,reviewPngFiles:result.reviewPngFiles,totalIndexedFiles:result.totalIndexedFiles,totalIndexedBytes:result.totalIndexedBytes};
}
if(require.main===module)buildPackageIndex(process.argv[2]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={buildPackageIndex};

