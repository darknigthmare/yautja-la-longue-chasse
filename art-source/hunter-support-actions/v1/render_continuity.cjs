#!/usr/bin/env node
'use strict';
// Cross-action review using the same timeline sampler and source-frame offsets.
// This video repeats existing drawings; it creates no extra animation sources.
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn, execFileSync} = require('node:child_process');
const {once} = require('node:events');
const {assert, resolve} = require('./playback_core.js');
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules', 'sharp')); }
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));

function buildContinuity(playback) {
  const definitions = [
    {id:'aim_continuity',label:'Visée — entrée, maintien, sortie',stages:[{action:'aim_enter',repeat:1},{action:'aim_hold',repeat:2},{action:'aim_exit',repeat:1}]},
    {id:'canopy_continuity',label:'Canopée — accroche et lâcher',stages:[{action:'canopy_attach',repeat:1},{action:'canopy_hold',repeat:2},{action:'canopy_swing',repeat:2},{action:'canopy_release',repeat:1}]}
  ];
  return definitions.map(definition => {
    const sequence=[],segments=[],loopSeams=[];
    let cursor=0;
    for (const stage of definition.stages) {
      const action=playback.actions.find(item=>item.id===stage.action);
      assert(action, `Missing continuity action ${stage.action}.`);
      const phase=action.kind==='loop' ? action.phases.loop : action.phases.action;
      assert(phase && Object.keys(action.phases).length===1, `${stage.action}: expected one explicit action phase.`);
      const startTick=cursor,sourceReferences=new Set();
      for(let repetition=1;repetition<=stage.repeat;repetition++) {
        if(repetition>1)loopSeams.push({tick:cursor,seconds:cursor/playback.ticksPerSecond,action:action.id,from:{clip:phase.steps.at(-1).clip,number:phase.steps.at(-1).number},to:{clip:phase.steps[0].clip,number:phase.steps[0].number}});
        for(const step of phase.steps) {
          sequence.push({...step,actionId:action.id,actionLabel:action.label,repetition,repetitions:stage.repeat});
          cursor+=step.durationTicks;
          sourceReferences.add(`${step.clip}:${step.number}`);
        }
      }
      segments.push({action:action.id,label:action.label,kind:action.kind,repeat:stage.repeat,startTick,endTick:cursor,startSeconds:startTick/playback.ticksPerSecond,endSeconds:cursor/playback.ticksPerSecond,playbackReferences:phase.steps.length*stage.repeat,uniqueSourceDrawings:sourceReferences.size,first:{clip:phase.steps[0].clip,number:phase.steps[0].number},last:{clip:phase.steps.at(-1).clip,number:phase.steps.at(-1).number}});
    }
    const junctions=segments.slice(1).map((segment,index)=>({tick:segment.startTick,seconds:segment.startSeconds,from:{action:segments[index].action,...segments[index].last},to:{action:segment.action,...segment.first}}));
    return {id:definition.id,label:definition.label,sequence,durationTicks:cursor,segments,junctions,loopSeams};
  });
}

async function renderContinuity(folder,destination) {
  folder=path.resolve(folder || __dirname);
  destination=path.resolve(destination || path.join(folder,'Yautja_Survie_Equipement_Canopee_V1_Raccords.mp4'));
  const read=async file=>JSON.parse(await fs.readFile(path.join(folder,file),'utf8'));
  const [manifest,playback]=await Promise.all(['animations.json','playback.json'].map(read));
  const groups=buildContinuity(playback),fps=playback.ticksPerSecond;
  const panelWidth=manifest.preview.stageWidth,panelHeight=manifest.preview.stageHeight;
  const width=Math.ceil(panelWidth*2/2)*2,height=Math.ceil((panelHeight+164)/2)*2;
  const terminalHoldTicks=Math.ceil(fps/2),durationTicks=Math.max(...groups.map(group=>group.durationTicks))+terminalHoldTicks;
  const wanted=new Set(groups.flatMap(group=>group.sequence.map(step=>`${step.clip}:${step.number}`)));
  const frames=new Map();
  for(const clip of manifest.clips)for(const frame of clip.frames)if(wanted.has(`${clip.id}:${frame.number}`))frames.set(`${clip.id}:${frame.number}`,{...frame,png:await fs.readFile(path.join(folder,frame.file))});
  assert(frames.size===wanted.size,'A continuity source drawing is unavailable.');
  const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',destination],{stdio:['pipe','ignore','pipe']});
  let stderr='',stdinError=null;
  encoder.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  encoder.stdin.on('error',error=>{stdinError=error;});
  const finished=new Promise((accept,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?accept():reject(new Error(`ffmpeg exited ${code}: ${stderr}`)));});
  finished.catch(()=>{});
  const used=new Set();
  let videoFrames=0,previousKey='',previousPng;
  try {
    for(let tick=0;tick<durationTicks;tick++) {
      const selected=groups.map(group=>({group,...resolve(group.sequence,tick,false)}));
      const key=selected.map(item=>`${item.step.clip}:${item.step.number}:${item.step.repetition}:${item.ended}`).join('|');
      let png=previousPng;
      if(key!==previousKey) {
        const headings=selected.map((item,col)=>`<text x="${col*panelWidth+20}" y="60" font-size="19" fill="#e8efdf">${escape(item.group.label)}</text><text x="${col*panelWidth+20}" y="85" font-size="16" fill="#c0d7a7">${escape(item.step.actionLabel)}${item.step.repetitions>1 ? ` · cycle ${item.step.repetition}/${item.step.repetitions}` : ''}</text><text x="${col*panelWidth+20}" y="107" font-size="12" fill="#a7b69d">${item.ended ? 'Dernière pose maintenue' : `${item.step.clip} #${String(item.step.number).padStart(2,'0')}`} · ${fps} images/s de revue</text>`).join('');
        const background=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#19231c"/><g font-family="sans-serif"><text x="20" y="27" font-size="12" letter-spacing="1.5" fill="#bad792">YAUTJA · RACCORDS ENTRE SÉQUENCES</text>${headings}<text x="20" y="${height-20}" font-size="11" fill="#a7b69d">Sources existantes répétées · pivots du manifeste · aucun nouveau dessin compté · revue hors jeu</text></g><line x1="${panelWidth}" y1="45" x2="${panelWidth}" y2="${height-42}" stroke="#334331"/></svg>`);
        const layers=[];
        for(const [col,item]of selected.entries()) {
          const frameKey=`${item.step.clip}:${item.step.number}`,frame=frames.get(frameKey);
          used.add(frameKey);
          const left=Math.round(col*panelWidth+manifest.preview.padding+frame.drawOffset.x);
          const top=Math.round(116+manifest.preview.padding+frame.drawOffset.y);
          assert(left>=col*panelWidth && left+frame.exportedFrameSize.width<=(col+1)*panelWidth && top>=112 && top+frame.exportedFrameSize.height<height-40,`Continuity drawing ${frameKey} exceeds its panel.`);
          layers.push({input:frame.png,left,top});
        }
        png=await sharp(background).composite(layers).png().toBuffer();
        previousKey=key;previousPng=png;
      }
      if(stdinError)throw stdinError;
      if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');
      videoFrames++;
    }
    encoder.stdin.end();await finished;
  }catch(error){encoder.stdin.destroy();encoder.kill();await finished.catch(()=>{});throw error;}
  assert(used.size===wanted.size,'Continuity video omitted a declared source drawing.');
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,r_frame_rate,duration','-of','json',destination],{encoding:'utf8'}));
  const stream=probe.streams[0];
  assert(Number(stream.nb_frames)===videoFrames && Number(stream.width)===width && Number(stream.height)===height,'Continuity encoding metadata mismatch.');
  const usedClipIds=new Set(groups.flatMap(group=>group.sequence.map(step=>step.clip)));
  const registered=manifest.clips.filter(clip=>clip.registration && usedClipIds.has(clip.id));
  const report={schemaVersion:1,file:path.basename(destination),purpose:'Cross-action seam inspection, with no gap, interpolation, extra registration or concealed transition.',width,height,containerFps:fps,videoFrames,durationSeconds:videoFrames/fps,terminalHoldTicks,uniqueSourceDrawingsShown:used.size,additionalSourceDrawings:0,playbackReferencesAcrossGroups:groups.reduce((total,group)=>total+group.sequence.length,0),groups:groups.map(({sequence,...group})=>({...group,playbackReferences:sequence.length})),sampler:'playback_core.js resolve; canonical playback.json phase steps; one padding + drawOffset application then Math.round for offline video placement.',rootPolicy:registered.length ? 'Canonical SHA-bound floor and grip metadata from the manifest are applied once. These graphical proxies remain draft-only; anatomy, separate contacts and physical pendulum phase remain pending.' : 'Unchanged manifest pivots use fixed cell-space root assumptions; contact registration and physical phase adaptation remain pending.',registrationApplied:registered.map(clip=>({clip:clip.id,method:clip.anchorMethod,sourceSha256:clip.sourceSha256})),browserValidation:false,inGameValidation:false,artisticStatus:'draft',artisticApproval:false,ffprobe:stream};
  await fs.writeFile(path.join(folder,'continuity_preview.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(require.main===module)renderContinuity(process.argv[2],process.argv[3]).then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
module.exports={buildContinuity,renderContinuity};
