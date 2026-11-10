#!/usr/bin/env node
'use strict';
// Read-only checks on each actual source cell before padding or atlas export.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {alphaInspection} = require('./export_sprites.cjs');
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules', 'sharp')); }
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function inspect(file) {
  const bytes = await fs.readFile(file), metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'png' || !metadata.hasAlpha) throw new Error('A PNG with a real alpha channel is required.');
  const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const x = Array.from({length:5}, (_,i)=>Math.round(i*info.width/4));
  const y = Array.from({length:5}, (_,i)=>Math.round(i*info.height/4));
  const cells = [];
  for (let index=0;index<16;index++) {
    const col=index%4,row=Math.floor(index/4),width=x[col+1]-x[col],height=y[row+1]-y[row];
    const raw=Buffer.alloc(width*height*4);
    for(let dy=0;dy<height;dy++) data.copy(raw,dy*width*4,((y[row]+dy)*info.width+x[col])*4,((y[row]+dy)*info.width+x[col]+width)*4);
    cells.push({number:index+1,rect:{x:x[col],y:y[row],width,height},rgbaSha256:sha(raw),...alphaInspection(raw,width,height)});
  }
  return {file:path.resolve(file),sha256:sha(bytes),width:info.width,height:info.height,hasAlpha:metadata.hasAlpha,gridEdges:{x,y},cells,nonemptyCells:cells.filter(cell=>cell.visiblePixelsAtAlpha16>0).length,transparentCells:cells.filter(cell=>cell.transparentPixels>0).length,visibleBoundaryCells:cells.filter(cell=>cell.edgeVisiblePixelsAtAlpha16>0).map(cell=>cell.number),traceAboveAlpha2BoundaryCells:cells.filter(cell=>cell.edgePixelsAboveAlpha2>0).map(cell=>cell.number),scope:'Exact 4x4 source rectangles before padding; no image mutation, no artistic approval.'};
}
if(require.main===module)Promise.all(process.argv.slice(2).map(inspect)).then(results=>console.log(JSON.stringify(results,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={inspect};
