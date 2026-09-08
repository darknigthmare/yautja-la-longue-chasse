import test from "node:test";
import assert from "node:assert/strict";
import { OptionalAudioFiles, validateAudioManifest } from "../app/game/audioFiles.ts";
import { GameAudio } from "../app/game/sound.ts";

const tick = () => new Promise(resolve => setImmediate(resolve));
const source = (url, mime = "audio/wav") => ({ url, mime, bytes: 128, sha256: "a".repeat(64) });
const entry = (category, id, sources = []) => ({ category, id, sources, folder: `${category}/${id}`, fallback: category === "music" ? "silence" : "procedural" });
function harness(entries, options = {}) {
  const saved = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
  const played = []; const elements = []; const fetched = []; const connections = []; const controllers = [];
  let block = options.block ?? false;
  let currentEntries = entries; let version = "v1"; const pendingMedia = [];
  class Element extends EventTarget {
    src = ""; paused = true;
    canPlayType(mime) { return mime === "audio/not-supported" ? "" : "probably"; }
    load() { if (this.src) { const finish = () => this.dispatchEvent(new Event(this.src.includes("broken") ? "error" : "canplay")); if (options.deferMedia) pendingMedia.push(finish); else queueMicrotask(finish); } }
    play() { if (block) { const error = new Error("gesture needed"); error.name = "NotAllowedError"; return Promise.reject(error); } this.paused = false; played.push(this.src); return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute(name) { if (name === "src") this.src = ""; }
  }
  const node = () => ({ connect(target) { connections.push(target); }, disconnect() {} });
  const gain = () => ({ ...node(), gain: { value: 1, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; }, cancelScheduledValues() {} } });
  const effects = gain(); const music = gain();
  const context = { state: "running", currentTime: 1, createGain: gain, createBufferSource() { const result = { ...node(), start() { played.push("buffer"); }, stop() {}, onended: null }; return result; }, createMediaElementSource() { return node(); }, decodeAudioData: options.decode ?? (async () => ({ duration: .2 })) };
  globalThis.window = {};
  globalThis.document = { createElement() { const value = new Element(); elements.push(value); return value; }, hidden: false };
  globalThis.fetch = async (url, opts) => {
    fetched.push(url); if (opts?.signal) controllers.push(opts.signal);
    if (url === "/audio/manifest.json") return { ok: true, json: async () => ({ schemaVersion: 1, version, entries: currentEntries }) };
    if (url.includes("404")) return { ok: false };
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  };
  const files = new OptionalAudioFiles(() => ({ context, effects, music }));
  return { files, played, elements, fetched, connections, controllers, effects, music, context, pendingMedia, replaceManifest(next) { currentEntries = next; version += "-next"; }, unblock() { block = false; }, restore() { files.dispose(); for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } } };
}

test("manifest validation rejects external/path-traversal URLs and duplicate event definitions", () => {
  assert.equal(validateAudioManifest({ schemaVersion: 1, version: "x", entries: [entry("sfx", "plasma"), entry("sfx", "plasma")] }), null);
  const parsed = validateAudioManifest({ schemaVersion: 1, version: "x", entries: [entry("sfx", "plasma", [source("https://other.invalid/x"), source("/../x"), source("/audio/%2e%2e/x.wav"), source("/audio/x.wav"), source("/audio/shot..wav")])] });
  assert.equal(parsed.entries[0].sources.length, 2);
});
test("known missing slots never issue speculative audio requests", async () => {
  const h = harness([entry("sfx", "plasma"), entry("music", "menu")]);
  try { h.files.unlock(); await tick(); assert.equal(h.files.playSfx("plasma"), false); await h.files.startLoop("music", "menu", 0); assert.deepEqual(h.fetched, ["/audio/manifest.json"]); assert.equal(h.files.diagnostics()[0].state, "absent"); } finally { h.restore(); }
});
test("a slow effect is never replayed after its procedural event; the next trigger uses the file", async () => {
  let resolveDecode; const h = harness([entry("sfx", "plasma", [source("/audio/plasma.wav")])], { decode: () => new Promise(resolve => { resolveDecode = resolve; }) });
  try { h.files.unlock(); await tick(); assert.equal(h.files.playSfx("plasma"), false); assert.deepEqual(h.played, []); resolveDecode({ duration: .2 }); await tick(); assert.deepEqual(h.played, []); assert.equal(h.files.playSfx("plasma"), true); assert.deepEqual(h.played, ["buffer"]); assert.ok(h.connections.includes(h.effects)); } finally { h.restore(); }
});
test("unsupported and unavailable encodings are skipped before a usable source; corrupt effects remain bounded", async () => {
  const h = harness([entry("sfx", "plasma", [source("/audio/skip.xyz", "audio/not-supported"), source("/audio/404.wav"), source("/audio/good.wav")])]);
  try { h.files.unlock(); await tick(); await tick(); assert.equal(h.files.playSfx("plasma"), true); assert.ok(!h.fetched.includes("/audio/skip.xyz")); assert.ok(h.fetched.includes("/audio/404.wav")); assert.equal(h.files.diagnostics()[0].selectedSource, "/audio/good.wav"); } finally { h.restore(); }
  const broken = harness([entry("sfx", "plasma", [source("/audio/broken.wav")])], { decode: async () => { throw new Error("bad codec"); } });
  try { broken.files.unlock(); await tick(); for (let i = 0; i < 100; i++) assert.equal(broken.files.playSfx("plasma"), false); assert.equal(broken.fetched.filter(url => url.includes("broken")).length, 1); assert.equal(broken.files.diagnostics()[0].state, "unusable"); } finally { broken.restore(); }
});
test("rapid context changes never resurrect an old loop; a missing new score stops the previous music", async () => {
  const h = harness([entry("music", "combat", [source("/audio/combat.wav")]), entry("music", "menu")]);
  try { h.files.unlock(); await tick(); const old = h.files.startLoop("music", "combat", 0); const next = h.files.startLoop("music", "menu", 0); await Promise.all([old, next]); assert.equal(h.files.activeLoop("music"), null); assert.ok(!h.played.includes("/audio/combat.wav")); await h.files.startLoop("music", "combat", 0); assert.equal(h.files.activeLoop("music"), "combat"); assert.ok(h.connections.includes(h.music)); await h.files.startLoop("music", "menu", 0); assert.equal(h.files.activeLoop("music"), null); assert.ok(h.elements.every(element => element.paused)); } finally { h.restore(); }
});
test("blocked autoplay is distinct from missing and resumes after a later unlock", async () => {
  const h = harness([entry("music", "combat", [source("/audio/combat.wav")])], { block: true });
  try { h.files.unlock(); await tick(); await h.files.startLoop("music", "combat", 0); assert.equal(h.files.diagnostics()[0].state, "blocked"); h.unblock(); h.files.unlock(); await tick(); await tick(); assert.equal(h.files.activeLoop("music"), "combat"); assert.equal(h.files.diagnostics(true)[0].state, "disabled"); } finally { h.restore(); }
});
test("disposal cancels streams and immediate cleanup also includes sources fading out", async () => {
  const h = harness([entry("music", "combat", [source("/audio/combat.wav")])]);
  try { h.files.unlock(); await tick(); await h.files.startLoop("music", "combat", 0); h.files.stopLoop("music", 3); h.files.dispose(); assert.ok(h.elements.every(element => element.paused && !element.src)); } finally { h.restore(); }
});
test("every legacy direct SFX method and playSfx use exactly one replacement dispatch", () => {
  const cases = [["ui","ui"], ["select","select"], ["jump","jump"], ["footstep","footstep"], ["slash","slash"], ["plasma","plasma"], ["scan","scan"], ["cloak-on","cloak",true], ["cloak-off","cloak",false], ["mask-on","mask",true], ["mask-off","mask",false], ["weapon-switch","weaponSwitch"], ["medicomp","medicomp"], ["netgun","netgun"], ["snare","snare"], ["enemy-alert","enemyAlert"], ["objective","objective"], ["hit","hit"], ["trophy","trophy"], ["victory","victory"], ["defeat","defeat"]];
  for (const [id, method, argument] of cases) {
    const audio = new GameAudio(); const calls = [];
    audio.fileAudio.playSfx = value => { calls.push(value); return true; };
    audio.readyTime = () => { throw new Error("procedural duplicate"); };
    audio[method](argument); assert.deepEqual(calls, [id]);
    const second = new GameAudio(); const dataCalls = []; second.fileAudio.playSfx = value => { dataCalls.push(value); return true; }; second.playSfx(id); assert.deepEqual(dataCalls, [id]); audio.dispose(); second.dispose();
  }
});

test("a manifest change discards a pending old decode and removal immediately restores fallback", async () => {
  let finish;
  const h = harness([entry("sfx", "plasma", [source("/audio/old.wav")])], { decode: () => new Promise(resolve => { finish = resolve; }) });
  try {
    h.files.unlock(); await tick();
    h.replaceManifest([entry("sfx", "plasma")]); await h.files.loadManifest(true);
    finish({ duration: .2 }); await tick();
    assert.equal(h.files.playSfx("plasma"), false);
    assert.equal(h.files.diagnostics()[0].state, "absent");
    assert.deepEqual(h.played, []);
  } finally { h.restore(); }
});
test("a changed manifest stops an active score and a removed file cannot remain the active loop", async () => {
  const h = harness([entry("music", "combat", [source("/audio/combat.wav")])]);
  try {
    h.files.unlock(); await tick(); await h.files.startLoop("music", "combat", 0);
    h.replaceManifest([entry("music", "combat")]); await h.files.loadManifest(true); await tick();
    assert.equal(h.files.activeLoop("music"), null);
    assert.equal(h.files.diagnostics()[0].state, "absent");
    h.files.dispose(); assert.ok(h.elements.every(element => element.paused));
  } finally { h.restore(); }
});
test("dispose during a stream load aborts it and late canplay cannot resurrect any loop", async () => {
  const h = harness([entry("music", "combat", [source("/audio/combat.wav")])], { deferMedia: true });
  try {
    h.files.unlock(); await tick();
    const pending = h.files.startLoop("music", "combat", 0); await tick();
    assert.equal(h.pendingMedia.length, 1);
    h.files.dispose(); h.pendingMedia.forEach(ready => ready()); await pending;
    assert.deepEqual(h.played, []); assert.equal(h.files.activeLoop("music"), null);
    assert.ok(h.elements.every(element => element.paused && !element.src));
  } finally { h.restore(); }
});

test("dispose during SFX decoding settles owned work without trying another encoding", async () => {
  let finish;
  const h = harness([entry("sfx", "plasma", [source("/audio/first.wav"),source("/audio/second.wav")])], { decode: () => new Promise(resolve => { finish = resolve; }) });
  try {
    await h.files.loadManifest();
    const loading = h.files.preloadSfx(); await tick();
    h.files.dispose();
    let timer;
    try { await Promise.race([loading,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Disposed decoder work did not settle")),1500);})]); }
    finally { clearTimeout(timer); }
    assert.ok(!h.fetched.includes("/audio/second.wav"));
    finish({duration:.2}); await tick(); assert.deepEqual(h.played,[]);
  } finally { h.restore(); }
});
