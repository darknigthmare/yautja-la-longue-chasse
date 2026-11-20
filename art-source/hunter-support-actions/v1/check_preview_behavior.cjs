#!/usr/bin/env node
'use strict';
// Executes the actual preview script, with a minimal DOM/Canvas/RAF test surface.
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
async function check(folder, previewFile='preview.html') {
  const html = await fs.readFile(path.resolve(folder, previewFile), 'utf8');
  const handlers = new Map(), elements = new Map(), drawCalls = [], requestedImages=[];
  function element(tagName = 'DIV') {
    return {tagName, value: '', checked: false, textContent: '', children: [], attributes: {}, addEventListener(type, fn) { this[type] = fn; }, append(child) {this.children.push(child);}, replaceChildren() {this.children=[];}, setAttribute(key, value) {this.attributes[key]=value;}, getContext() {return {fillRect(){},drawImage(image,...args){drawCalls.push({file:image.file,args});},beginPath(){},arc(){},stroke(){}};}};
  }
  const context = {console, document: {getElementById(id) {if (!elements.has(id)) elements.set(id, element()); return elements.get(id);}, createElement: element, addEventListener(type, fn) {handlers.set(type, fn);}}, requestAnimationFrame() {}, Image: class {set src(value) {this.file=value; requestedImages.push(value); if(this.onload)this.onload();}}, window: {}};
  context.globalThis = context;
  vm.createContext(context);
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(match[1], context, {filename:'preview.html'});
  const ui = context.window.HuntPreview;
  assert.ok(ui, 'Actual preview controller not found.');
  const manifest = JSON.parse(await fs.readFile(path.join(folder, 'animations.json'), 'utf8'));
  const playback = JSON.parse(await fs.readFile(path.join(folder, 'playback.json'), 'utf8'));
  const sourceFrames = new Map(manifest.clips.flatMap(clip=>clip.frames.map(frame=>[`${clip.id}:${frame.number}`,frame])));
  const embedded=requestedImages.some(url=>typeof url==='string' && url.startsWith('data:'));
  if(embedded) {
    assert.equal(requestedImages.length,manifest.clips.length,'Standalone preview loads exactly one embedded image per source atlas.');
    assert.ok(requestedImages.every(url=>url.startsWith('data:image/png;base64,')),'Standalone preview must not request external images.');
    assert.ok(!/<script[^>]+src\s*=|<link[^>]+href\s*=/i.test(html),'Standalone preview must not request external scripts or styles.');
  } else assert.equal(requestedImages.length,manifest.frameCount);
  const embeddedHashes=new Map();
  let oneShots = 0, loops = 0, multipart = 0, sustained = 0, drawOffsetChecks = 0, registeredFrameChecks = 0;
  function checkDrawOffset() {
    const step=ui.selection().step, frame=sourceFrames.get(`${step.clip}:${step.number}`), drawn=drawCalls.at(-1);
    assert.ok(drawn, 'Expected a real preview drawImage call.');
    let x,y;
    if(embedded) {
      assert.equal(drawn.args.length,8,'Embedded rendering uses an exact unscaled atlas crop.');
      const rect=frame.atlasRect;
      assert.deepEqual(drawn.args.slice(0,4),[rect.x,rect.y,rect.width,rect.height]);
      assert.deepEqual(drawn.args.slice(6),[rect.width,rect.height]);
      if(!embeddedHashes.has(drawn.file))embeddedHashes.set(drawn.file,crypto.createHash('sha256').update(Buffer.from(drawn.file.split(',')[1],'base64')).digest('hex'));
      assert.equal(embeddedHashes.get(drawn.file),manifest.clips.find(clip=>clip.id===step.clip).sourceSha256,'Embedded atlas must preserve original source bytes.');
      [x,y]=drawn.args.slice(4,6);
    } else {assert.equal(drawn.file,frame.file);assert.equal(drawn.args.length,2);[x,y]=drawn.args;}
    assert.equal(x,manifest.preview.padding+frame.drawOffset.x,'Horizontal registration must be applied exactly once.');
    assert.equal(y,manifest.preview.padding+frame.drawOffset.y,'Vertical registration must be applied exactly once.');
    drawOffsetChecks++;
  }
  for (const action of playback.actions) {
    ui.selectAction(action.id); assert.equal(ui.state.playing, false); assert.equal(ui.selection().index, 0);
    checkDrawOffset();
    const buttons = elements.get('phases').children.map(button => button.textContent);
    assert.equal(buttons.length, 1 + Object.keys(action.phases).length);
    if (action.kind === 'one-shot') {
      assert.deepEqual(buttons, ['Séquence complète','Action'], 'One-shot must not gain fake enter/idle/exit controls.');
      ui.toggle(); ui.tick(0); ui.tick((action.durationTicks / playback.ticksPerSecond + 1) * 1000);
      assert.equal(ui.state.playing, false); assert.equal(ui.selection().index, action.sequence.length - 1);
      ui.tick(999999); assert.equal(ui.selection().index, action.sequence.length - 1);
      ui.toggle(); assert.equal(ui.selection().index, 0); assert.equal(ui.state.playing, true);
      ui.restart(false); ui.seek(action.sequence.length - 1); assert.equal(ui.state.playing, false);
      checkDrawOffset();
      const event = {code:'Space',target:{tagName:'DIV'},preventDefault(){this.prevented=true;}};
      handlers.get('keydown')(event); assert.equal(event.prevented, true); assert.equal(ui.state.playing, true);
      ui.tick(0); ui.tick(2000); assert.equal(ui.state.playing, false);
      oneShots++;
      if (action.phases.action.sourceClips.length > 1) {
        ui.selectPhase('action'); ui.seek(15); const lastA = ui.selection().step;
        ui.seek(16); const firstB = ui.selection().step;
        checkDrawOffset();
        assert.notEqual(lastA.clip, firstB.clip); assert.equal(lastA.number, 16); assert.equal(firstB.number, 1); multipart++;
      }
    } else {
      ui.selectPhase('loop'); const phase = action.phases.loop;
      ui.toggle(); ui.tick(0); ui.tick(phase.durationTicks / playback.ticksPerSecond * 1000);
      assert.equal(ui.state.playing, true); assert.equal(ui.selection().index, 0); loops++;
      if (action.kind === 'sustained') {
        ui.selectPhase('exit'); assert.equal(ui.selection().index, 0); ui.toggle(); ui.tick(0); ui.tick((action.phases.exit.durationTicks / playback.ticksPerSecond + 1) * 1000);
        assert.equal(ui.state.playing, false); sustained++;
      }
    }
    // Registered pages may vary on every frame; exercise their actual draw calls,
    // not only the first/last control states covered above.
    for (const [phaseKey,phase] of Object.entries(action.phases)) {
      if (!phase.steps.some(step=>manifest.clips.find(clip=>clip.id===step.clip)?.registration)) continue;
      ui.selectPhase(phaseKey);
      phase.steps.forEach((step,index)=>{
        if (!manifest.clips.find(clip=>clip.id===step.clip)?.registration) return;
        ui.seek(index); checkDrawOffset(); registeredFrameChecks++;
      });
    }
  }
  assert.equal(elements.get('error').textContent, '');
  return {status: 'passed', actions: manifest.actions.length, terminalOneShots: oneShots, loops, multiPageActions: multipart, sustained, drawOffsetChecks, registeredFrameChecks, embeddedAtlasImages:embedded?requestedImages.length:0,externalImageRequests:embedded?0:requestedImages.length, source: 'Actual preview JavaScript executed in Node VM', browserInteraction: false, artisticApproval: false};
}
if (require.main === module) check(path.resolve(process.argv[2] || __dirname),process.argv[3]).then(result => console.log(JSON.stringify(result))).catch(error => {console.error(error.stack); process.exitCode = 1;});
module.exports = {check};

