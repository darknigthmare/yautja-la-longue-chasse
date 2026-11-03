import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const source = JSON.parse(await fs.readFile('work-local/v66/stage-animation-sources.json', 'utf8'));
const plan = [
  { stageId: 'arena-012-balcon-du-roi-de-la-chasse', keys: ['012-01-r2','012-02','012-03'], names: ['Évent de basalte — vapeur', 'Balise de la loge — veille lumineuse', 'Obturateur de desserte — ouverture'], cells: [194,195,196], placements: [[156,430,90],[835,430,106],[742,430,78]] },
  { stageId: 'arena-036-temple-de-la-double-lune', keys: ['036-01','036-02','036-03'], names: ['Évent du sanctuaire — souffle minéral', 'Balise du sanctuaire — lumière froide', 'Panneau du temple — ouverture'], cells: [266,267,268], placements: [[160,430,93],[825,430,110],[725,430,80]] },
  { stageId: 'arena-069-salle-du-porte-cendres', keys: ['069-01','069-02','069-03'], names: ['Conduit des forges — purge', 'Témoin de chauffe — cycle des chambres', 'Persiennes de la salle — ventilation'], cells: [362,363,364], placements: [[168,430,93],[767,430,73],[865,430,89]] },
];
const sha = b => createHash('sha256').update(b).digest('hex');
const stages = [], proof = [];
for (const stage of plan) {
  const events = [];
  for (let i = 0; i < stage.keys.length; i++) {
    const input = source.find(s => s.id === stage.keys[i]); assert(input?.path);
    const bytes = await fs.readFile(input.path), metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width,1536); assert.equal(metadata.height,1024); assert(metadata.hasAlpha);
    const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const frames = [];
    for (let cell = 0; cell < 6; cell++) {
      const sx = cell % 3 * 512, sy = Math.floor(cell/3)*512;
      let minX=512,minY=512,maxX=-1,maxY=-1,footY=-1;
      for(let y=0;y<512;y++) for(let x=0;x<512;x++) {
        const alpha=data[((sy+y)*info.width+sx+x)*4+3];
        if(alpha>=16){ minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y); }
        if(alpha>=220) footY=Math.max(footY,y);
      }
      assert(maxX>minX && maxY>minY && footY>0,'A real visible native drawing is required');
      let footLeft=512,footRight=-1;
      for(let y=Math.max(0,footY-10);y<=footY;y++) for(let x=0;x<512;x++) if(data[((sy+y)*info.width+sx+x)*4+3]>=220){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x);}
      frames.push({rect:[sx,sy,512,512],pivot:[(footLeft+footRight)/2,footY+1],alphaBounds:[minX,minY,maxX-minX+1,maxY-minY+1]});
    }
    const src=`/game/sprites/v66/pit-life/${stage.stageId}/ambient-0${i+1}.png`;
    const destination=path.join('public',src); await fs.mkdir(path.dirname(destination),{recursive:true});
    // Copy the generated source verbatim. No recolor, synthetic frame, cutout or pixel repaint.
    await fs.copyFile(input.path,destination);assert.equal(sha(await fs.readFile(destination)),sha(bytes));
    const [x,bottom,height]=stage.placements[i];
    events.push({id:`ambient-0${i+1}`,name:stage.names[i],src,width:1536,height:1024,sha256:sha(bytes),frames,fps:2,restFrame:i===0&&stage.stageId.includes('069')?5:0,reducedMotionFrame:0,
      placement:{x,bottom,height,parallax:.43,renderPass:'P3',anchor:'ground'}});
    proof.push({stageId:stage.stageId,eventId:`ambient-0${i+1}`,src,sha256:sha(bytes),sourceFile:path.basename(input.path),generator:'openai-imagegen',prompt:input.prompt,sourcePixelsUnmodified:true,nativeFrames:6,workbookCell:`10_VIE_DES_STAGES!E${stage.cells[i]}`,visualReview:'native-sheet-reviewed; application-placement-pending'});
  }
  stages.push({stageId:stage.stageId,events});
}
await fs.writeFile('app/game/data/pitStageLifeV66.json',JSON.stringify({schemaVersion:1,release:'V66',stages},null,2)+'\n');
await fs.writeFile('docs/v66-stage-life-native-proof.json',JSON.stringify({schemaVersion:1,release:'V66',newStages:0,newlyAnimatedStages:stages.length,newNativeImages:proof.length,nativeDrawings:proof.length*6,canonicalLocationsCertified:0,proof},null,2)+'\n');
console.log(JSON.stringify({stages:stages.length,images:proof.length,nativeFrames:proof.length*6}));
