#!/usr/bin/env node
'use strict';
// Offline composition only; no browser automation and no changes to source art.
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn, execFileSync} = require('node:child_process');
const {once} = require('node:events');
const {assert, resolve} = require('./playback_core.js');
let sharp;
try { sharp = require('sharp'); } catch { sharp = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/node_modules', 'sharp')); }
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));

async function render(folder, destination) {
  folder = path.resolve(folder);
  const manifest = JSON.parse(await fs.readFile(path.join(folder, 'animations.json'), 'utf8'));
  const playback = JSON.parse(await fs.readFile(path.join(folder, 'playback.json'), 'utf8'));
  destination = path.resolve(destination || path.join(folder, 'Yautja_Animations_Manquantes_V1.mp4'));
  const fps = playback.ticksPerSecond, panelWidth = manifest.preview.stageWidth, panelHeight = manifest.preview.stageHeight;
  const width = Math.ceil(panelWidth * 3 / 2) * 2, height = Math.ceil((panelHeight + 142) / 2) * 2;
  const frameMap = new Map();
  for (const clip of manifest.clips) for (const frame of clip.frames) frameMap.set(`${clip.id}:${frame.number}`, {...frame, png: await fs.readFile(path.join(folder, frame.file))});
  const pages = [];
  for (let start = 0; start < playback.actions.length; start += 3) {
    const actions = playback.actions.slice(start, start + 3);
    const endTicks = Math.max(...actions.map(action => action.durationTicks));
    const terminalHoldTicks = Math.ceil(fps / 2);
    pages.push({actions, endTicks, terminalHoldTicks, durationTicks: endTicks + terminalHoldTicks});
  }
  const encoder = spawn('ffmpeg', ['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',destination], {stdio:['pipe','ignore','pipe']});
  let stderr = ''; encoder.stderr.on('data', chunk => {stderr += chunk.toString();});
  let stdinError = null; encoder.stdin.on('error', error => {stdinError = error;});
  const finished = new Promise((accept, reject) => { encoder.on('error', reject); encoder.on('close', code => code === 0 ? accept() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`))); });
  // Attach a handler immediately, so an early encoder failure is not unhandled.
  finished.catch(() => {});
  const sourceFramesUsed = new Set();
  let videoFrames = 0;
  try {
    for (const [pageIndex, page] of pages.entries()) {
      let previousKey = '', previousPng;
      for (let tick = 0; tick < page.durationTicks; tick++) {
        const selected = page.actions.map(action => ({action, ...resolve(action.sequence, tick, false)}));
        const key = selected.map(item => `${item.step.clip}:${item.step.number}:${item.ended}`).join('|');
        let png = previousPng;
        if (key !== previousKey) {
          const headings = selected.map((item, col) => `<text x="${col * panelWidth + 22}" y="66" font-size="20" fill="#e3eadb">${escape(item.action.label)}</text><text x="${col * panelWidth + 22}" y="91" font-size="12" fill="#a8bc9e">${item.action.reviewFps.join(' / ')} images/s · ${item.action.kind === 'loop' ? 'boucle présentée' : `${item.action.sequence.length} images`} · ${item.ended ? 'dernière image' : `${item.index + 1}/${item.action.sequence.length}`}</text>`).join('');
          const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#19231c"/><text x="22" y="28" font-family="sans-serif" font-size="12" fill="#bad792">YAUTJA · THE LONG HUNT · REVUE ${pageIndex + 1}/${pages.length}</text><g font-family="sans-serif">${headings}<text x="22" y="${height - 20}" font-size="11" fill="#a1b298">Sprites en revue · rythme de présentation indépendant du combat · droite uniquement</text></g></svg>`);
          const layers = [];
          for (const [col, item] of selected.entries()) {
            const frameKey = `${item.step.clip}:${item.step.number}`, frame = frameMap.get(frameKey);
            sourceFramesUsed.add(frameKey);
            const left = Math.round(col * panelWidth + manifest.preview.padding + frame.drawOffset.x);
            const top = Math.round(105 + manifest.preview.padding + frame.drawOffset.y);
            assert(left >= col * panelWidth && left + frame.exportedFrameSize.width <= (col + 1) * panelWidth && top >= 100 && top + frame.exportedFrameSize.height < height - 35, `Frame ${frameKey} exceeds its video panel.`);
            layers.push({input: frame.png, left, top});
          }
          png = await sharp(svg).composite(layers).png().toBuffer();
          previousKey = key; previousPng = png;
        }
        if (stdinError) throw stdinError;
        if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain');
        videoFrames++;
      }
    }
    encoder.stdin.end(); await finished;
  } catch (error) { encoder.stdin.destroy(); encoder.kill(); await finished.catch(() => {}); throw error; }
  const probe = JSON.parse(execFileSync('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,r_frame_rate,duration','-of','json',destination], {encoding:'utf8'}));
  const stream = probe.streams[0];
  assert(Number(stream.nb_frames) === videoFrames, 'Encoded video frame count mismatch.');
  assert(Number(stream.width) === width && Number(stream.height) === height, 'Encoded video dimensions mismatch.');
  assert(sourceFramesUsed.size === manifest.frameCount, `Video covers ${sourceFramesUsed.size}/${manifest.frameCount} source drawings.`);
  const report = {schemaVersion: 1, file: path.basename(destination), width, height, containerFps: fps, videoFrames, durationSeconds: videoFrames / fps, uniqueSourceDrawingsShown: sourceFramesUsed.size, expectedSourceDrawings: manifest.frameCount, pages: pages.map(page => ({actions: page.actions.map(action => action.id), durationTicks: page.durationTicks, terminalHoldTicks: page.terminalHoldTicks})), composition: 'Read-only source PNGs at native size; fractional preview offsets rounded for video placement. Terminal cells are held after shorter actions finish; no invented idle phase.', registrationApplied:manifest.clips.filter(clip=>clip.registration).map(clip=>({clip:clip.id,method:clip.anchorMethod,sourceSha256:clip.sourceSha256,sourceDrawOffsets:[...new Set(clip.frames.map(frame=>JSON.stringify(frame.drawOffset)))].map(value=>JSON.parse(value)),placement:'One application of padding + drawOffset, then Math.round for video composition; no resizing.'})), timingPurpose: 'Art review only; gameplay timings in seconds are not retimed.', browserValidation: false, artisticStatus: 'draft', ffprobe: stream};
  await fs.writeFile(path.join(folder, 'video_preview.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (require.main === module) render(process.argv[2] || __dirname, process.argv[3]).then(result => console.log(JSON.stringify(result))).catch(error => {console.error(error.stack); process.exitCode = 1;});
module.exports = {render};
