#!/usr/bin/env node
// Executes the actual preview inline JavaScript with a small DOM/RAF/Image mock.
// This checks player behavior only: it is not a browser or visual-art test.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(process.argv[2] || path.join(here, 'preview_template.html'));
const folder = path.resolve(process.argv[3] || path.join(here, '../../../public/game/sprites/hunter-postures-emotes/v1'));
const html = await readFile(htmlPath, 'utf8');
const dataText = html.match(/<script id="sprite-data" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(dataText, 'Preview data block is required.');
const data = dataText.trim() === '__SPRITE_DATA__'
  ? {...JSON.parse(await readFile(path.join(folder, 'animations.json'), 'utf8')),
      playbackSequences: JSON.parse(await readFile(path.join(folder, 'playback.json'), 'utf8'))}
  : JSON.parse(dataText);
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Actual player inline script is required.');
const action = data.actions[0].id;
const entry = data.clips.find(clip => clip.id === `${action}_enter`);
assert.equal(entry.frames.length, 16);
// Fixture offsets exercise before/after selection without changing any asset or
// exported metadata on disk. The remaining sequences use the delivered data.
entry.frames[0].drawOffset = {x: 9, y: 6};
entry.frames[0].registration = {previousDrawOffset: {x: -4, y: 2}};
delete entry.frames[1].registration;

const draws = [], raf = [], elements = new Map();
const context2d = {clearRect() {}, drawImage(...args) {draws.push(args);}};
class Element {
  constructor(tagName = 'DIV', attributes = '') {
    this.tagName = tagName.toUpperCase(); this.listeners = new Map(); this.children = [];
    this.value = attributes.match(/\bvalue="([^"]*)"/)?.[1] || '';
    this.checked = /\bchecked(?:\s|=|$)/.test(attributes);
    this.textContent = ''; this.dataset = {}; this.classList = {add() {}};
    this.width = Number(attributes.match(/\bwidth="(\d+)"/)?.[1] || 0);
    this.height = Number(attributes.match(/\bheight="(\d+)"/)?.[1] || 0);
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  dispatch(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback({target: this, preventDefault() {}, ...event});
  }
  append(child) {
    this.children.push(child);
    if (this.tagName === 'SELECT' && !this.value) this.value = child.value;
  }
  getContext() {return context2d;}
}
for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
  elements.set(match[3], new Element(match[1], match[2]));
}
for (const match of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
  elements.get(match[1]).value = match[2].match(/<option\b[^>]*\bvalue="([^"]*)"/)?.[1] || '';
}
const element = id => {
  assert.ok(elements.has(id), `Missing preview control: ${id}`);
  return elements.get(id);
};
element('sprite-data').textContent = JSON.stringify(data);
const documentEvents = new Element(), windowEvents = new Element();
const document = {
  getElementById: element, createElement: tag => new Element(tag),
  activeElement: {tagName: 'BODY'},
  addEventListener: documentEvents.addEventListener.bind(documentEvents),
};
class ImageMock {
  set src(value) {this.source = value; queueMicrotask(() => this.onload?.());}
}
const sandbox = vm.createContext({
  document, window: {addEventListener: windowEvents.addEventListener.bind(windowEvents)},
  Image: ImageMock, requestAnimationFrame: callback => {raf.push(callback); return raf.length;},
});
vm.runInContext(script, sandbox, {filename: htmlPath});
await new Promise(resolve => setImmediate(resolve));
assert.equal(element('status').textContent, 'Toutes les planches sont chargées.');
assert.equal(raf.length, 1);
const state = () => JSON.parse(vm.runInContext(`JSON.stringify({index, playing, accumulator, lastTime,
  length: sequence.length, duration: sequence.reduce((total, item) => total + item.durationMs, 0),
  clipId: sequence[index]?.clipId, sourceIndex: sequence[index]?.index})`, sandbox));
const click = id => element(id).dispatch('click');
const select = (id, value) => {element(id).value = value; element(id).dispatch('change');};
const space = () => windowEvents.dispatch('keydown', {code: 'Space'});
let now = 0;
function frame(delta = 0) {
  now += delta;
  assert.equal(raf.length, 1, 'Player must maintain exactly one RAF chain.');
  raf.shift()(now);
}
function advance(milliseconds) {
  let remaining = milliseconds;
  while (remaining > 0) {const elapsed = Math.min(50, remaining); frame(elapsed); remaining -= elapsed;}
}
function restart() {click('restart'); frame();}
const latestDestination = () => draws.at(-1).slice(5, 7);

assert.equal(element('stabilize').checked, true, 'Stabilization must be on by default.');
select('mode', 'enter'); restart();
const padding = data.preview.padding;
assert.deepEqual(latestDestination(), [padding + 9, padding + 6]);
const beforeToggle = state();
element('stabilize').checked = false; element('stabilize').dispatch('change');
assert.deepEqual(latestDestination(), [padding - 4, padding + 2]);
assert.deepEqual(state(), beforeToggle, 'Comparison must not restart or pause playback.');
element('stabilize').checked = true; element('stabilize').dispatch('change');
assert.deepEqual(latestDestination(), [padding + 9, padding + 6]);
element('position').value = '1'; element('position').dispatch('input');
element('stabilize').checked = false; element('stabilize').dispatch('change');
assert.deepEqual(latestDestination(), [padding + entry.frames[1].drawOffset.x, padding + entry.frames[1].drawOffset.y],
  'Frames without a registration history must keep their current offset.');
element('stabilize').checked = true; element('stabilize').dispatch('change');

restart(); advance(1000);
assert.equal(state().index, 15); assert.equal(state().playing, false);
assert.equal(element('play').textContent, 'Rejouer');
advance(500); assert.equal(state().index, 15, 'An entry must hold its terminal frame.');
click('play');
assert.equal(state().index, 0); assert.equal(state().playing, true); assert.equal(state().lastTime, null);
frame(); advance(125); assert.equal(state().index, 2);
click('play'); const pausedIndex = state().index;
advance(500); assert.equal(state().index, pausedIndex);
space(); assert.equal(state().playing, true); assert.equal(state().lastTime, null);
frame(); advance(62.5); assert.equal(state().index, pausedIndex + 1);
restart(); advance(1000); space();
assert.equal(state().index, 0); assert.equal(state().playing, true); assert.equal(state().lastTime, null);

for (const exitMode of ['reversible', 'dedicated']) {
  select('exit-mode', exitMode); select('mode', 'exit'); restart(); advance(1000);
  assert.equal(state().playing, false); assert.equal(state().index, 15);
  assert.equal(state().clipId, `${action}_${exitMode === 'reversible' ? 'enter' : 'exit'}`);
  assert.equal(state().sourceIndex, exitMode === 'reversible' ? 0 : 15);
  advance(500); assert.equal(state().index, 15, 'An exit must hold its terminal frame.');
  restart(); assert.equal(state().index, 0); assert.equal(state().playing, true);
}
select('exit-mode', 'reversible'); select('mode', 'cycle'); restart();
const cycleDuration = state().duration;
advance(cycleDuration + 62.5);
assert.equal(state().playing, true); assert.equal(state().index, 1, 'Full cycles must continue looping.');
select('mode', 'idle'); restart();
assert.equal(state().duration, 3000); advance(3100);
assert.equal(state().playing, true); assert.equal(state().index, 1, 'Idle must continue looping.');

select('mode', 'enter'); restart(); click('play'); click('previous');
assert.equal(state().index, 0, 'Manual one-shot stepping must clamp at the start.');
element('position').value = '15'; element('position').dispatch('input'); click('next');
assert.equal(state().index, 15, 'Manual one-shot stepping must clamp at the end.');
element('speed').value = '2'; element('speed').dispatch('input'); restart(); advance(500);
assert.equal(state().index, 15); assert.equal(state().playing, false, 'One-shot timing must honor playback speed.');
console.log(JSON.stringify({
  status: 'passed', testType: 'actual-inline-JavaScript with DOM/RAF/Image mocks',
  template: htmlPath, oneShotsStopAndHold: true, terminalReplay: true,
  keyboardAndButtonParity: true, restartPlaysFromBeginning: true,
  cycleAndIdleLoop: true, speedRespected: true, manualOneShotsClamp: true,
  stabilizationDefaultOn: true, beforeAfterOffsets: true, registrationFallback: true,
  browserTest: false, artisticApproval: false, sourceImageFilesChanged: false,
}, null, 2));
