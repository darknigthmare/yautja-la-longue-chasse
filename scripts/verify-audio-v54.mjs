/** Real Chromium/Web Audio verification; a small local harness, not a mocked decoder. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const output = process.env.V54_AUDIO_QA_OUTPUT || "outputs/qa-commercial-audit/v54/audio/browser-qa";
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [], requests = [];
const bundle = await build({ stdin: { contents: 'import {GameAudio} from "./app/game/sound.ts"; window.GameAudio=GameAudio; window.audio=new GameAudio(); window.initialActivation=navigator.userActivation.hasBeenActive; void (async()=>{await audio.startAmbience("ship"); await audio.setMusicContext("menu"); audio.setPaused(true); audio.setPaused(false);})(); document.querySelector("button").onclick=()=>window.audio.unlock();', resolveDir: process.cwd() }, bundle: true, write: false, format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"production"' } });
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/") { res.setHeader("content-type", "text/html"); res.end('<!doctype html><meta charset="utf-8"><title>V54 audio QA</title><button>Activer le son</button><p>Harnais de validation audio réel — pas un écran livré du jeu.</p><script src="/engine.js"></script>'); return; }
    if (pathname === "/engine.js") { res.setHeader("content-type", "text/javascript"); res.end(bundle.outputFiles[0].text); return; }
    if (pathname === "/audio/broken-manifest.json") { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ schemaVersion: 1, version: "failure-fixture", entries: [{ id: "hit", category: "sfx", folder: "sfx/hit", fallback: "procedural", sources: [{ url: "/audio/broken.wav", mime: "audio/wav", bytes: 32, sha256: "a".repeat(64) }] }] })); return; }
    if (pathname === "/audio/broken.wav") { res.setHeader("content-type", "audio/wav"); res.end("deliberately corrupt QA fixture"); return; }
    if (!/^\/audio\/[a-zA-Z0-9/_.-]+$/.test(pathname) || pathname.includes("..")) { res.writeHead(404).end(); return; }
    res.setHeader("content-type", pathname.endsWith(".wav") ? "audio/wav" : "application/json");
    res.end(await fs.readFile(path.join("public", pathname)));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=user-gesture-required"] });
  const page = await browser.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => { if (req.url().includes("/audio/")) requests.push(req.url()); });
  await page.goto(base);
  await page.waitForTimeout(150);
  // Startup calls run in the real page script: CDP evaluate itself grants a
  // transient user gesture, so it cannot be used to simulate pre-gesture startup.
  assert.equal(await page.evaluate(() => initialActivation), false);
  assert.equal(await page.evaluate(() => audio.context), null); assert.deepEqual(requests, []);
  checks.push({ name: "no-context-network-or-autoplay-before-trusted-gesture", passed: true });

  const decoded = await page.evaluate(async () => {
    const manifest = await (await fetch("/audio/manifest.json")).json(), results = [];
    for (const entry of manifest.entries.filter(e => e.sources.length)) {
      const context = new OfflineAudioContext(1, 1, 44100);
      const buffer = await context.decodeAudioData(await (await fetch(entry.sources[0].url)).arrayBuffer());
      const data = buffer.getChannelData(0); let peak = 0, sum = 0;
      for (const x of data) { peak = Math.max(peak, Math.abs(x)); sum += x * x; }
      results.push({ id: entry.id, category: entry.category, duration: buffer.duration, channels: buffer.numberOfChannels, peak, rms: Math.sqrt(sum / data.length) });
    }
    return results;
  });
  assert.equal(decoded.length, 22); assert.ok(decoded.every(a => a.peak > .01 && a.peak <= .301 && a.duration > .04 && a.duration < 5));
  checks.push({ name: "22-production-wav-decode-in-chromium", passed: true, decoded });

  await page.getByRole("button", { name: "Activer le son" }).click();
  await page.waitForFunction(() => audio.getAudioDiagnostics().filter(d => d.sources.length).length === 22 && audio.getAudioDiagnostics().filter(d => d.sources.length).every(d => d.state === "ready"), null, { timeout: 20000 });
  assert.equal(await page.evaluate(() => audio.fileAudio.activeLoop("ambience")), "ship");
  const dispatched = await page.evaluate(() => audio.getAudioDiagnostics().filter(d => d.category === "sfx").map(d => ({ id: d.id, fromFile: audio.fileAudio.playSfx(d.id), selectedSource: d.selectedSource })));
  assert.equal(dispatched.length, 21); assert.ok(dispatched.every(d => d.fromFile && d.selectedSource.includes("/v54.wav")));
  checks.push({ name: "trusted-gesture-restores-requested-ship-and-21-real-effects", passed: true, dispatched });
  await page.waitForTimeout(1750);

  await page.evaluate(() => {
    window.meter = audio.context.createAnalyser(); meter.fftSize = 2048; audio.master.connect(meter);
    window.rms = () => { const a = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(a); return Math.sqrt(a.reduce((sum, n) => sum + n * n, 0) / a.length); };
  });
  await page.waitForTimeout(100);
  const live = await page.evaluate(() => rms()); assert.ok(live > .00001, `ship bus signal ${live}`);
  const mixMeasurements = [];
  for (const mix of [{ master: 0 }, { master: 1, music: 0 }, { music: .65, muted: true }]) {
    await page.evaluate(mix => audio.setMix(mix), mix); await page.waitForTimeout(180);
    const value = await page.evaluate(() => rms()); assert.ok(value < 0.000001, JSON.stringify({ mix, value })); mixMeasurements.push({ mix, rms: value });
  }
  await page.evaluate(() => audio.setMix({ muted: false, effects: 0, music: 0 }));
  await page.evaluate(() => audio.hit()); await page.waitForTimeout(70); const effectZero = await page.evaluate(() => rms()); assert.ok(effectZero < .000001);
  await page.waitForTimeout(500);
  await page.evaluate(() => audio.setMix({ music: .65, effects: 1 })); await page.waitForTimeout(150);
  assert.ok(await page.evaluate(() => rms()) > .00001);
  checks.push({ name: "actual-master-music-effects-and-mute-buses", passed: true, live, mixMeasurements, effectZero });

  const beforeMix = await page.evaluate(() => audio.getMix());
  await page.evaluate(() => audio.setPaused(true)); await page.waitForTimeout(100);
  const pauseStart = await page.evaluate(() => ({ context: audio.context.state, time: audio.fileAudio.channels.ambience.stream.audio.currentTime, transportPaused: audio.fileAudio.channels.ambience.stream.audio.paused }));
  assert.equal(pauseStart.context, "suspended"); assert.equal(pauseStart.transportPaused, true);
  await page.evaluate(() => { for (let i = 0; i < 10; i++) audio.hit(); }); await page.waitForTimeout(250);
  const pauseEnd = await page.evaluate(() => ({ time: audio.fileAudio.channels.ambience.stream.audio.currentTime, mix: audio.getMix(), sources: audio.fileAudio.sources.size }));
  assert.equal(pauseEnd.time, pauseStart.time); assert.deepEqual(pauseEnd.mix, beforeMix); assert.equal(pauseEnd.sources, 0);
  await page.evaluate(() => audio.setPaused(false)); await page.waitForTimeout(250);
  const resumed = await page.evaluate(() => ({ state: audio.context.state, time: audio.fileAudio.channels.ambience.stream.audio.currentTime, sources: audio.fileAudio.sources.size, mix: audio.getMix() }));
  assert.equal(resumed.state, "running"); assert.notEqual(resumed.time, pauseStart.time); assert.equal(resumed.sources, 0); assert.deepEqual(resumed.mix, beforeMix);
  checks.push({ name: "pause-freezes-transport-and-drops-paused-shots-without-mix-change", passed: true, pauseStart, pauseEnd, resumed });

  await page.evaluate(async () => { for (let i = 0; i < 10; i++) { audio.setPaused(true); await new Promise(resolve => setTimeout(resolve, 1)); audio.setPaused(false); } await audio.transportTransition; });
  assert.equal(await page.evaluate(() => audio.context.state), "running");
  assert.equal(await page.evaluate(() => audio.fileAudio.channels.ambience.stream.audio.paused), false);
  checks.push({ name: "rapid-pause-resume-settles-on-latest-state", passed: true });

  await page.evaluate(async () => { audio.setPaused(true); await audio.startAmbience("jungle"); await audio.setMusicContext("combat"); audio.setPaused(false); });
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => audio.activeAmbience), "jungle");
  assert.equal(await page.evaluate(() => audio.fileAudio.activeLoop("ambience")), null);
  assert.equal(await page.evaluate(() => audio.fileAudio.activeLoop("music")), null);
  checks.push({ name: "scene-change-during-pause-does-not-restore-obsolete-ship-or-missing-score", passed: true });

  await page.evaluate(async () => { window.broken = new GameAudio({ manifestUrl: "/audio/broken-manifest.json" }); await broken.unlock(); await broken.preloadSfx(); broken.hit(); });
  const broken = await page.evaluate(() => broken.getAudioDiagnostics()[0]);
  assert.equal(broken.state, "unusable"); assert.equal(broken.fallbackUsed, true);
  checks.push({ name: "corrupt-file-falls-back-without-blocking-gameplay", passed: true, diagnostic: broken });
  await page.evaluate(() => { broken.dispose(); audio.dispose(); });
  assert.equal(await page.evaluate(() => audio.context), null);
  assert.equal(await page.evaluate(() => audio.fileAudio.sources.size), 0);
  assert.deepEqual(errors, []);
  checks.push({ name: "dispose-cleans-all-owned-audio-without-page-errors", passed: true });
} catch (error) {
  errors.push(error.stack || String(error)); process.exitCode = 1;
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ version: "v54", scope: "real Chromium engine harness and delivered files, not complete game UI or subjective listening", passed: !errors.length, checks, errors, requests, browserClosed: true }, null, 2));
  console.log(JSON.stringify({ output, passed: !errors.length, checks: checks.length, errors }, null, 2));
}
