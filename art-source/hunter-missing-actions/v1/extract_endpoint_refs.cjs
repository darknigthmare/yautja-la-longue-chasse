#!/usr/bin/env node
'use strict';
// Mechanical, unscaled crops for image-generation continuation references only.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {assert} = require('./playback_core.js');
let sharp;
try {sharp=require('sharp');} catch {sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules','sharp'));}
async function extract(source, destination) {
  assert(source && destination, 'Pass a source atlas and a separate reference directory.');
  const input=await fs.readFile(source), metadata=await sharp(input).metadata();
  assert(metadata.hasAlpha, 'Source must have real alpha.');
  const width=Math.floor(metadata.width/4),height=Math.floor(metadata.height/4);
  const rects={first:{left:0,top:0,width,height},last:{left:metadata.width-width,top:metadata.height-height,width,height}};
  await fs.mkdir(destination,{recursive:true});
  const outputs={};
  for(const [name,rect] of Object.entries(rects)) {
    const raw=await sharp(input).extract(rect).ensureAlpha().raw().toBuffer();
    const png=await sharp(raw,{raw:{width,height,channels:4}}).png({compressionLevel:9}).toBuffer();
    assert((await sharp(png).ensureAlpha().raw().toBuffer()).equals(raw),'Reference crop RGBA mismatch.');
    const file=path.join(destination,`${name}.png`); await fs.writeFile(file,png);
    outputs[name]={file:path.resolve(file),rect,sha256:crypto.createHash('sha256').update(png).digest('hex')};
  }
  const report={source:path.basename(source),sourceSha256:crypto.createHash('sha256').update(input).digest('hex'),purpose:'Continuation reference only; no scale, repainting or changes to the source atlas.',cropRule:'Floor-sized first and last cells. On a 1254px atlas these are 313px reference crops; final game exports use the complete rounded grid and 314px padding.',outputs};
  await fs.writeFile(path.join(destination,'crop_provenance.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(require.main===module)extract(process.argv[2],process.argv[3]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={extract};
