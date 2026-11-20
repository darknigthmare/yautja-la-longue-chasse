#!/usr/bin/env node
'use strict';
// Native-size sprite composition for a review video. Source PNGs are read only.
// No resizing, interpolation, optical flow, endpoint replacement, or art edits.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {spawn, execFile} = require('node:child_process');
const {once} = require('node:events');
const {promisify} = require('node:util');
const run = promisify(execFile);
let sharp;
try {sharp = require('sharp');}
catch (error) {if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error; sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'sharp'));}
const xml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const ROLE_LABELS = {enter:'ENTRÉE',idle:'MAINTIEN ANIMÉ',exit_dedicated:'SORTIE DÉDIÉE',exit_reversible:'SORTIE RÉVERSIBLE',fixed_hold:'POSTURE FIXE',rest:'RETOUR'};
async function ffmpeg(args, timeline) {
  const process = spawn('ffmpeg', args, {stdio:['pipe','ignore','pipe']});
  let stderr = '';
  process.stderr.on('data', chunk => {stderr = (stderr + chunk.toString()).slice(-14000);});
  const completion = new Promise((resolve,reject) => {
    process.on('error',reject);
    process.on('close',code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)));
  });
  completion.catch(()=>{});
  const buffers = new Map();
  try {
    for (const step of timeline) {
      if (!buffers.has(step.filename)) buffers.set(step.filename,await fs.readFile(step.filename));
      for (let i=0;i<step.repeat;i++) if (!process.stdin.write(buffers.get(step.filename))) await once(process.stdin,'drain');
    }
    process.stdin.end();
    await completion;
  } catch(error) {process.stdin.destroy();process.kill();await completion.catch(()=>{});throw error;}
}
async function main() {
  const args = process.argv.slice(2);
  const folder = path.resolve(args.find(argument => !argument.startsWith('--')) || path.join(__dirname, '../../../public/game/sprites/hunter-postures-emotes/v1'));
  const variant = args.includes('--dedicated') ? 'dedicated' : 'reversible';
  const manifest = JSON.parse(await fs.readFile(path.join(folder,'animations.json'),'utf8'));
  const playback = JSON.parse(await fs.readFile(path.join(folder,'playback.json'),'utf8'));
  const clips = Object.fromEntries(manifest.clips.map(clip => [clip.id,clip]));
  const panelWidth = manifest.preview.canvasWidth, panelHeight = manifest.preview.canvasHeight;
  const width = Math.ceil(panelWidth * 3 / 2) * 2, height = Math.ceil((panelHeight + 180) / 2) * 2;
  const padding = manifest.preview.padding, stageTop = 100, outputFps = 80;
  const pages = [];
  for (let i = 0; i < manifest.actions.length; i += 3) pages.push(manifest.actions.slice(i,i+3));
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(),'yautja-v2-video-'));
  const timeline = [], cache = new Map(), usedDrawings = new Set(), segments = [];
  let serial = 0, totalMs = 0;
  const revision = String(manifest.version).replace(/[^0-9]+/g, '_');
  const output = path.join(folder,`Yautja_Postures_V${revision}_${variant === 'dedicated' ? 'Sorties_Dediees' : 'Apercu'}.mp4`);
  try {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const actions = pages[pageIndex];
      const sequences = actions.map(action => playback.stances[action.id][variant === 'dedicated' ? 'cycleIdleDedicated' : 'cycleIdleReversible']);
      if (sequences.some(sequence => sequence.length !== sequences[0].length)) throw new Error('Video panels have incompatible sequence lengths.');
      const pageStart = totalMs;
      for (let stepIndex = 0; stepIndex < sequences[0].length; stepIndex++) {
        const steps = sequences.map(sequence => sequence[stepIndex]);
        const durationMs = steps[0].durationMs;
        if (steps.some(step => step.durationMs !== durationMs)) throw new Error('Video panel timings differ.');
        const key = JSON.stringify({pageIndex,frames:steps.map(step => [step.clipId,step.index]),role:steps[0].role});
        let filename = cache.get(key);
        if (!filename) {
          filename = path.join(temporary,`${String(serial++).padStart(4,'0')}.png`);
          const panelTitles = actions.map((action,column) => `<text x="${column*panelWidth+panelWidth/2}" y="86" text-anchor="middle" font-size="18" fill="#eaf0e4">${xml(action.label)}</text>`).join('');
          const dividers = [1,2].map(column => `<line x1="${column*panelWidth}" y1="70" x2="${column*panelWidth}" y2="${height-63}" stroke="#354537"/>`).join('');
          const header = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111b14"/><g font-family="DejaVu Sans,sans-serif"><text x="24" y="31" font-size="23" fill="#eaf0e4">YAUTJA — POSTURES ET CÉLÉBRATIONS</text><text x="24" y="54" font-size="12" fill="#a4ba93">V${xml(manifest.version)} · page ${pageIndex+1}/${pages.length} · sprites à leur taille native · transitions 16 i/s · maintien 10 i/s</text>${panelTitles}${dividers}<text x="${width/2}" y="${height-39}" text-anchor="middle" font-size="16" fill="#bfd99a">${xml(ROLE_LABELS[steps[0].role] || steps[0].role)}</text><text x="${width/2}" y="${height-16}" text-anchor="middle" font-size="11" fill="#9aae90">Maintien en aller-retour · sortie ${variant === 'dedicated' ? 'dédiée' : 'réversible'} · raccords entre atlas à contrôler en jeu</text></g></svg>`;
          const overlays = [];
          for (let column = 0; column < steps.length; column++) {
            const step = steps[column], clip = clips[step.clipId], frame = clip.frames[step.index];
            const offset = frame.drawOffset || {x:0,y:0};
            const left = Math.round(column*panelWidth+padding+offset.x), top = Math.round(stageTop+padding+offset.y);
            if (left < 0 || top < 0 || left+clip.frameWidth > width || top+clip.frameHeight > height) throw new Error(`${clip.id}/${step.index+1}: sprite canvas exceeds video bounds; enlarge preview padding/canvas metadata first.`);
            overlays.push({input:path.join(folder,frame.file),left,top});
          }
          await sharp(Buffer.from(header)).composite(overlays).png({compressionLevel:3}).toFile(filename);
          cache.set(key,filename);
        }
        for (const step of steps) usedDrawings.add(`${step.clipId}/${step.index+1}`);
        const repeat = durationMs / 1000 * outputFps;
        if (!Number.isInteger(repeat)) throw new Error(`Duration ${durationMs}ms is not representable exactly at ${outputFps}fps.`);
        timeline.push({filename,repeat});
        totalMs += durationMs;
      }
      segments.push({page:pageIndex+1,actions:actions.map(action=>action.id),startMs:pageStart,durationMs:totalMs-pageStart,exitMode:variant});
    }
    await ffmpeg(['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(outputFps),'-c:v','png','-i','pipe:0','-an','-r',String(outputFps),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output],timeline);
    const probe = await run('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=codec_name,width,height,avg_frame_rate,nb_read_frames,duration','-of','json',output]);
    const probeData = JSON.parse(probe.stdout);
    const stream = probeData.streams?.[0];
    const expectedFrames = Math.round(totalMs / 1000 * outputFps);
    if (!stream || Number(stream.nb_read_frames) !== expectedFrames || Math.abs(Number(stream.duration) * 1000 - totalMs) > 1) throw new Error(`Video timing mismatch: expected ${expectedFrames} frames/${totalMs}ms, received ${stream?.nb_read_frames}/${stream?.duration}s.`);
    const metadata = {
      filename:path.basename(output),revision:manifest.version,exitMode:variant,durationMs:totalMs,sourceDrawingsShown:usedDrawings.size,
      composition:'Original exported PNGs at native size, integer-rounded measured translation offsets, neutral background and titles only. Source files unchanged.',
      timing:'80fps video container represents 16fps transitions and10fps idle steps exactly through repeated displayed frames, without interpolation.',
      note:'The MP4 is a compressed review preview. The transparent PNGs are the authoritative image assets.',
      segments,expectedVideoFrames:expectedFrames,probe:probeData,
    };
    await fs.writeFile(path.join(folder,variant === 'dedicated' ? 'video_preview_dedicated.json' : 'video_preview.json'),JSON.stringify(metadata,null,2)+'\n');
    console.log(JSON.stringify(metadata,null,2));
  } finally {await fs.rm(temporary,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
