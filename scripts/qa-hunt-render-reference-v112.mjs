/**
 * Canvas/audio reference-runner qualification, using production source and assets.
 * This is an isolated renderer fixture, not the React shell or physical-device QA.
 * Run with existing Chromium: node scripts/qa-hunt-render-reference-v112.mjs
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {createServer} from "node:http";
import {mkdir,readFile,writeFile,mkdtemp,rm} from "node:fs/promises";
import {cpus,platform,release,totalmem} from "node:os";
import {dirname,resolve,extname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";

const root=fileURLToPath(new URL("../",import.meta.url));
const options={report:"docs/qa/v112-rendu-reference/render-performance.json",frames:300,warmup:60,
  missions:"jungle-vey,ice-cryostalker,volcano-bad-blood,swamp-hydra,desert-sandmaw,ocean-leviathan,fungal-hivemind,ruins-ancient-guardian",
  passes:2,chromium:"/usr/bin/chromium"};
for(let index=2;index<process.argv.length;index+=2){
  const key=process.argv[index]?.replace(/^--/,"");
  assert.ok(Object.hasOwn(options,key)&&process.argv[index+1],"unknown or missing option: "+process.argv[index]);
  options[key]=typeof options[key]==="number"?Number(process.argv[index+1]):process.argv[index+1];
}
for(const key of ["frames","warmup","passes"])assert.ok(Number.isSafeInteger(options[key])&&options[key]>0,key);
assert.notEqual(process.env.SITES_MANAGED_LINUX_CONTAINER,"1","Sites managed preview requires cua_repl.js; this portable runner must not replace it.");
const reportPath=resolve(root,options.report),reportDirectory=dirname(reportPath);
await mkdir(reportDirectory,{recursive:true});
const revision=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
const source=await readFile(join(root,"app/game/HuntCanvas.tsx"),"utf8");
const initStart=source.indexOf("    const assets: AssetBank = {");
const initEnd=source.indexOf("    const input = inputRef.current;",initStart);
const loadStart=source.indexOf("    const loadTasks: Promise<void>[] = [];",initEnd);
const loadEnd=source.indexOf("    Promise.all(loadTasks).then",loadStart);
assert.ok(initStart>0&&initEnd>initStart&&loadStart>initEnd&&loadEnd>loadStart,"native asset loader anchors changed");
const loader=source.slice(initStart,initEnd)+source.slice(loadStart,loadEnd);
const fixture=String.raw`
import {defaultSave} from "./save";
import {MISSION_BY_ID} from "./data";
import {GameAudio} from "./sound";
const qaImages = new Map<string, HTMLImageElement>();
const qaFailedImages = new Set<string>();
async function qaLoadAssets(game:any,mission:any,loadout:any,appearance:any,encounterRun:number){
  let alive=true;
  ${loader}
  await Promise.all([...loadTasks,...environmentPropLoads.values()]);
  return {assets,preloadEnvironmentAroundScreen,wait:()=>Promise.all([...environmentPropLoads.values()])};
}
const percentile=(sorted:number[],fraction:number)=>sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)]??0;
function qaSummary(samples:number[]){const sorted=[...samples].sort((a,b)=>a-b);return {
  samples:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length),
  p50Ms:percentile(sorted,.5),p95Ms:percentile(sorted,.95),p99Ms:percentile(sorted,.99),maximumMs:sorted.at(-1)??0};}
let qaRandomState=1,qaInSimulation=false;
const qaOriginalRandom=Math.random;
Math.random=()=>{if(!qaInSimulation)return qaOriginalRandom();qaRandomState^=qaRandomState<<13;qaRandomState^=qaRandomState>>>17;qaRandomState^=qaRandomState<<5;return (qaRandomState>>>0)/4294967296;};
const canvas=document.querySelector("canvas")!;
const context=canvas.getContext("2d")!;
const audio=new GameAudio();
let scene:any=null;
function qaCounts(s:any){return {enemies:s.enemies.length,alive:s.enemies.filter((e:any)=>e.alive).length,
  visibleAlive:s.enemies.filter((e:any)=>e.alive&&e.active&&e.x>=s.cameraX-100&&e.x<=s.cameraX+VIEW_WIDTH+100).length,
  corpses:s.huntRites.corpses.length,projectiles:s.projectiles.length,goreParticles:s.goreParticles.length,
  tracks:s.tracks.length,receipts:s.ecosystem.receipts.length,zones:s.ecosystem.zones.length};}
function qaInput(){return {keyboardHeld:new Set<string>(),touchHeld:new Set(),gamepadHeld:new Set(),pressed:new Set<string>(),
  previousGamepadButtons:[],activeGamepadIndex:null,gamepadNeedsNeutral:true,gamepadDialogActions:[],pointerScreen:null};}
async function qaPrepare(missionId:string,pass:number){
  qaRandomState=0x1234ab01+Object.keys(MISSION_BY_ID).indexOf(missionId)*17;
  const save=defaultSave("2026-11-02T00:00:00.000Z"),mission=MISSION_BY_ID[missionId];
  if(!mission)throw new Error("unknown mission "+missionId);
  qaInSimulation=true;
  const state=makeGameState(mission,save.loadout,save.inventory,"hunter",save.appearance,true,false,
    "render-reference-v112-"+missionId,save.exploration);
  state.player.invulnerability=1e6;
  for(const wave of mission.enemyWaves)spawnEligibleWaves(state,mission,"hunter",wave.trigger,wave.triggerId);
  for(const enemy of state.enemies){enemy.active=true;enemy.waveActivationAt=null;}
  // Pick the densest authored actor window without relocating any enemy or prop.
  const candidates=state.enemies.map((enemy:any)=>Math.max(0,Math.min(state.world.width-VIEW_WIDTH,enemy.x-VIEW_WIDTH/2)));
  const density=(x:number)=>state.enemies.filter((enemy:any)=>enemy.x>=x&&enemy.x<=x+VIEW_WIDTH).length;
  const cameraX=candidates.sort((a:number,b:number)=>density(b)-density(a)||a-b)[0]??0;
  state.player.x=cameraX+VIEW_WIDTH*.38;state.player.y=state.world.floorY-state.player.height;
  state.cameraX=cameraX;state.worldScreenId=getWorldScreenAtX(mission.id,state.player.x+state.player.width/2).id;
  for(const enemy of state.enemies.slice(0,Math.min(3,Math.max(1,Math.floor(state.enemies.length/4)))))
    damageEnemy(state,mission,enemy,enemy.health,"melee");
  qaInSimulation=false;
  const start=performance.now();
  const bank=await qaLoadAssets(state,mission,save.loadout,save.appearance,0);
  await audio.unlock();await audio.preloadSfx();await audio.startAmbience(mission.biome,{fadeSeconds:0});
  await audio.setMusicContext("exploration",{fadeSeconds:0});
  await new Promise(resolve=>setTimeout(resolve,100));
  scene={missionId,pass,state,save,mission,bank,input:qaInput(),loadMs:performance.now()-start,initial:qaCounts(state)};
  renderGame(context,state,mission,save.loadout,save.appearance,bank.assets,0,1);
  return {missionId,pass,loadMs:scene.loadMs,initial:scene.initial,world:{width:state.world.width,
    platforms:state.world.platforms.length,climbables:state.world.climbables.length,covers:state.world.covers.length}};
}
async function qaRun(warmup:number,frames:number){
  const {state,save,mission,bank,input}=scene;
  const timings={interval:[] as number[],simulation:[] as number[],renderSubmit:[] as number[],audio:[] as number[],hud:[] as number[],cpuWork:[] as number[]};
  const peak=qaCounts(state),soundCounts:Record<string,number>={};let finishes=0,last=0;
  const longTasks:any[]=[];
  const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({startTime:e.startTime,duration:e.duration}))));
  try{observer.observe({type:"longtask",buffered:false});}catch{}
  for(let tick=0;tick<warmup+frames;tick++){
    const time=await new Promise<number>(resolve=>requestAnimationFrame(resolve));
    const workStart=performance.now();
    if(tick>=warmup&&last)timings.interval.push(time-last);last=time;
    input.keyboardHeld.clear();input.pressed.clear();
    input.keyboardHeld.add(Math.floor(tick/360)%2===0?"right":"left");
    if(tick%180<48)input.keyboardHeld.add("up");
    if(tick%90<9)input.keyboardHeld.add("jump");
    if(tick%90===0)input.pressed.add("jump");
    if(tick%120===0)input.pressed.add("scan");
    if(tick%40===0)input.pressed.add("melee");
    let start=performance.now();
    qaInSimulation=true;
    try{stepGame(state,mission,save.loadout,save.inventory,save.appearance,"hunter",input,1/60,()=>{finishes++;});}
    finally{qaInSimulation=false;}
    const simulation=performance.now()-start;
    start=performance.now();
    for(const sound of state.soundEvents.splice(0)){soundCounts[sound]=(soundCounts[sound]??0)+1;audio.playSfx(sound);}
    const audioDuration=performance.now()-start;
    input.gamepadDialogActions.length=0;
    if(input.gamepadRiteActionsV112)input.gamepadRiteActionsV112.length=0;
    bank.preloadEnvironmentAroundScreen(state.worldScreenId);
    start=performance.now();renderGame(context,state,mission,save.loadout,save.appearance,bank.assets,0,1);
    const render=performance.now()-start;
    if(tick%6===0){start=performance.now();snapshot(state,mission);if(tick>=warmup)timings.hud.push(performance.now()-start);}
    if(tick>=warmup){timings.simulation.push(simulation);timings.renderSubmit.push(render);timings.audio.push(audioDuration);timings.cpuWork.push(performance.now()-workStart);}
    const values=qaCounts(state);for(const key of Object.keys(peak))peak[key]=Math.max(peak[key],values[key]);
    if(state.paused||state.phase==="dead"||state.phase==="finished"||!Number.isFinite(state.player.x))throw new Error("inactive or invalid native scene");
  }
  observer.disconnect();await bank.wait();
  const digest={elapsed:state.elapsed,phase:state.phase,player:[state.player.x,state.player.y,state.player.health],
    enemies:state.enemies.map((e:any)=>[e.id,e.x,e.y,e.health,e.alive,e.active]),corpses:state.huntRites.corpses,
    receipts:state.ecosystem.receipts};
  return {peak,simulatedSeconds:state.elapsed,finishes,timing:Object.fromEntries(Object.entries(timings).map(([k,v])=>[k,qaSummary(v)])),
    intervalsOverBudget:{above16_67ms:timings.interval.filter(x=>x>16.67).length,above33_34ms:timings.interval.filter(x=>x>33.34).length},
    longTasks,soundCounts,audioDiagnostics:audio.getAudioDiagnostics(),digest};
}
function qaAssets(){return {failed:[...qaFailedImages].sort(),loaded:[...qaImages].map(([url,image])=>{
  const sample=document.createElement("canvas");sample.width=Math.min(256,image.naturalWidth);sample.height=Math.min(256,image.naturalHeight);
  const ctx=sample.getContext("2d",{willReadFrequently:true})!;ctx.drawImage(image,0,0,sample.width,sample.height);
  const pixels=ctx.getImageData(0,0,sample.width,sample.height).data;let visible=0,transparent=0;
  for(let i=3;i<pixels.length;i+=4){if(pixels[i]>0)visible++;if(pixels[i]<255)transparent++;}
  return {url,width:image.naturalWidth,height:image.naturalHeight,sampleWidth:sample.width,sampleHeight:sample.height,
    sampledVisiblePixels:visible,sampledNonOpaquePixels:transparent};}).sort((a,b)=>a.url.localeCompare(b.url))};}
async function qaDrawDiagnostic(){
  const original=CanvasRenderingContext2D.prototype.drawImage,groups=new Map<string,any>();
  CanvasRenderingContext2D.prototype.drawImage=function(...args:any[]){
    const image=args[0],url=image.currentSrc?new URL(image.currentSrc).pathname:"canvas:"+image.width+"x"+image.height;
    const key=url+"|"+this.filter,start=performance.now();
    try{return original.apply(this,args as any);}finally{
      const value=groups.get(key)??{url,filter:this.filter,calls:0,totalMs:0,maximumMs:0};
      const duration=performance.now()-start;value.calls++;value.totalMs+=duration;value.maximumMs=Math.max(value.maximumMs,duration);groups.set(key,value);
    }
  } as any;
  const totals=[];
  try{for(let frame=0;frame<12;frame++){
    await new Promise(resolve=>requestAnimationFrame(resolve));const start=performance.now();
    renderGame(context,scene.state,scene.mission,scene.save.loadout,scene.save.appearance,scene.bank.assets,0,1);
    totals.push(performance.now()-start);
  }}finally{CanvasRenderingContext2D.prototype.drawImage=original;}
  return {missionId:scene.missionId,frames:12,totalRender:qaSummary(totals),
    interpretation:"Static final scene; per-drawImage wrapper adds measurement overhead. This diagnostic is excluded from frame benchmarks and identifies synchronous Canvas submission costs only.",
    groups:[...groups.values()].sort((a,b)=>b.totalMs-a.totalMs)};
}
(window as any).__huntReferenceQA={prepare:qaPrepare,run:qaRun,assets:qaAssets,diagnostic:qaDrawDiagnostic,dispose:()=>audio.dispose()};
`;
const instrumented=source.replace("export default function HuntCanvas","function HuntCanvas")
  .replace("image.onload = () => resolve(image);","image.onload = () => { qaImages.set(path,image); resolve(image); };")
  .replace("image.onerror = () => resolve(null);","image.onerror = () => { qaFailedImages.add(path); resolve(null); };");
const bundle=await build({stdin:{contents:instrumented+fixture,resolveDir:join(root,"app/game"),loader:"tsx",sourcefile:"HuntReferenceFixture.tsx"},
  bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",loader:{".module.css":"empty"},
  define:{"process.env.NODE_ENV":'"production"'},minify:true,logLevel:"silent"});
const html='<!doctype html><meta charset="utf-8"><title>Yautja — qualification Canvas native</title><style>html,body{margin:0;background:#050b0a}canvas{display:block;width:1280px;height:720px}</style><canvas width="1280" height="720"></canvas><script src="/fixture.js"></script>';
const cache=await mkdtemp("/tmp/yautja-render-reference-");
const requests=new Map(),errors=[];
const mime={".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml",".jpg":"image/jpeg",".wav":"audio/wav",".json":"application/json"};
const tracked=new Map(execFileSync("git",["ls-tree","-r","HEAD","--","public"],{cwd:root,encoding:"utf8",maxBuffer:16*1024*1024})
  .trim().split("\n").filter(Boolean).map(line=>{const [meta,path]=line.split("\t");return [path,meta.split(" ")[2]];}));
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);
    if(pathname==="/"){res.setHeader("Content-Type","text/html");res.end(html);return;}
    if(pathname==="/fixture.js"){res.setHeader("Content-Type","application/javascript");res.end(bundle.outputFiles[0].contents);return;}
    if(pathname.includes("..")||!pathname.startsWith("/")){res.writeHead(400).end();return;}
    const relative="public"+pathname,oid=tracked.get(relative);
    if(!oid){requests.set(pathname,{url:pathname,status:404,tracked:false});res.writeHead(404).end();return;}
    let bytes,origin="checkout";
    try{bytes=await readFile(join(root,relative));}catch{
      origin="exact-git-blob";
      const cached=join(cache,oid);
      try{bytes=await readFile(cached);}catch{
        bytes=execFileSync("git",["cat-file","blob",oid],{cwd:root,maxBuffer:64*1024*1024,stdio:["ignore","pipe","pipe"]});
        await writeFile(cached,bytes);
      }
    }
    const actualBlob=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
    requests.set(pathname,{url:pathname,status:200,tracked:true,gitBlob:oid,matchesGitBlob:actualBlob===oid,origin,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")});
    res.setHeader("Content-Type",mime[extname(pathname)]??"application/octet-stream");res.setHeader("Cache-Control","public,max-age=3600");res.end(bytes);
  }catch(error){errors.push(String(error));res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const url="http://127.0.0.1:"+server.address().port;
const flags=["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required","--enable-precise-memory-info"];
let browser;
try{
  browser=await chromium.launch({executablePath:options.chromium,headless:true,args:flags});
  const browserSession=await browser.newBrowserCDPSession();
  const gpu=await browserSession.send("SystemInfo.getInfo");
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const page=await context.newPage(),consoleErrors=[];
  page.on("pageerror",error=>consoleErrors.push(String(error)));
  await page.goto(url);await page.waitForFunction(()=>Boolean(window.__huntReferenceQA));
  const cdp=await context.newCDPSession(page);await cdp.send("Performance.enable");
  const memory=async()=>{await cdp.send("HeapProfiler.collectGarbage");const result=await cdp.send("Performance.getMetrics");
    return Object.fromEntries(result.metrics.filter(x=>["JSHeapUsedSize","JSHeapTotalSize","Nodes","Documents","JSEventListeners"].includes(x.name)).map(x=>[x.name,x.value]));};
  const baselineMemory=await memory(),cases=[];
  for(const missionId of options.missions.split(","))for(let pass=1;pass<=options.passes;pass++){
    const prepared=await page.evaluate(({missionId,pass})=>window.__huntReferenceQA.prepare(missionId,pass),{missionId,pass});
    const before=await memory();
    const result=await page.evaluate(({warmup,frames})=>window.__huntReferenceQA.run(warmup,frames),options);
    const after=await memory();
    const screenshot=missionId+"-pass"+pass+".png";
    await page.locator("canvas").screenshot({path:join(reportDirectory,screenshot)});
    const digest=createHash("sha256").update(JSON.stringify(result.digest)).digest("hex");delete result.digest;
    cases.push({...prepared,...result,selectedStateDigest:digest,memory:{beforeRunAfterGc:before,afterRunAfterGc:after},screenshot});
    await writeFile(join(reportDirectory,"assets-observed.json"),JSON.stringify({revision,...await page.evaluate(()=>window.__huntReferenceQA.assets()),requests:[...requests.values()]},null,2)+"\n");
    console.log(missionId+" pass "+pass+": frame p50="+result.timing.interval.p50Ms.toFixed(2)+" p95="+result.timing.interval.p95Ms.toFixed(2)+
      " p99="+result.timing.interval.p99Ms.toFixed(2)+" max="+result.timing.interval.maximumMs.toFixed(2)+"ms; render submit p95="+result.timing.renderSubmit.p95Ms.toFixed(2)+"ms");
  }
  const drawDiagnostic=await page.evaluate(()=>window.__huntReferenceQA.diagnostic());
  const assets=await page.evaluate(()=>window.__huntReferenceQA.assets());
  const selectedStateComparisons=options.missions.split(",").map(missionId=>{const passes=cases.filter(c=>c.missionId===missionId);
    return {missionId,passes:passes.length,selectedStateDigestMatches:passes.every(p=>p.selectedStateDigest===passes[0].selectedStateDigest)};});
  const cpu=cpus();
  const report={schemaVersion:1,generatedAt:new Date().toISOString(),qualification:"CLOUD_CHROMIUM_CANVAS_AUDIO_REFERENCE",
    status:errors.length||consoleErrors.length||assets.failed.length||selectedStateComparisons.some(p=>!p.selectedStateDigestMatches)||[...requests.values()].some(r=>r.status===200&&!r.matchesGitBlob)?"FAIL":"PASS",
    provenance:{revision,huntCanvasSha256:createHash("sha256").update(source).digest("hex"),
      fixtureSha256:createHash("sha256").update(instrumented+fixture).digest("hex"),
      bundle:"Minified production source; native makeGameState/stepGame/renderGame/snapshot and exact asset-loader extracted in memory; production files unchanged."},
    environment:{node:process.version,platform:platform(),osRelease:release(),arch:process.arch,cpuModel:cpu[0]?.model,logicalCpus:cpu.length,
      totalMemoryBytes:totalmem(),browser:browser.version(),executable:options.chromium,headless:true,flags,viewport:{width:1280,height:720},deviceScaleFactor:1,
      gpu:gpu.gpu,sitesProfile:"portable",referenceRunnerOnly:true},
    configuration:{...options,fixedStepSeconds:1/60,percentileMethod:"nearest rank: ceil(sample count * fraction)",
      difficulty:"hunter",reducedGore:true,screenShake:false,loadoutAndAppearance:"defaultSave(2026-11-02T00:00:00.000Z)",
      audioMix:{master:1,music:.65,effects:1,muted:false}},
    frameBudget60Hz:{budgetMs:1000/60,allCasesP95WithinBudget:cases.every(c=>c.timing.interval.p95Ms<=1000/60),
      casesAboveBudget:cases.filter(c=>c.timing.interval.p95Ms>1000/60).length,
      interpretation:"Observed reference-runner budget only; PASS status denotes valid execution/integrity/comparisons, not a frame-budget pass."},
    scope:{measured:"requestAnimationFrame intervals, CPU simulation, Canvas submission, actual GameAudio event submission, 10 Hz HUD snapshot, post-GC JS heap, exact loaded image/audio bytes.",
      schedule:"Actual authored waves activated at t=0, up to three real actors killed through native damageEnemy; player placed at ground level in the densest candidate window centered on authored actors, without moving enemies or props. Remaining native AI/geometry/collision enabled; player invulnerability 1e6 seconds prevents no-op dead scenes.",
      comparison:"Repeated seeded scenes on the same browser, viewport, DPR, assets, audio mix, warmup and inputs. Initial qaPrepare asset loading is outside frame timing; native sector preloading remains active during measurements and can include later load/decode work. Pass 1 and pass 2 have different cache histories. Selected-state digests compare elapsed/phase, player position/health, enemy position/health/activity, corpses and receipts; they do not cover the entire GameState. No optimization before/after claimed.",
      timing:"One fixed 1/60 native update per observed rAF; delayed frames slow fixture simulation instead of accumulator catch-up. CPU submission is not GPU duration or physical display latency.",
      memory:"CDP forces GC outside timed regions before both samples. JSHeapUsedSize excludes image/GPU/audio backing allocations and total browser process RSS. The audit Map retains one image per unique URL across missions. Repeated-scene samples do not alone establish leak freedom.",
      audio:"Native GameAudio, manifest-backed authored SFX and intended procedural biome ambience; decoded/playing diagnostics establish transport, not a human listening review.",
      unqualified:["physical target hardware/thermals","physical controller/touch input","complete React/DOM shell frame cost","GPU execution duration","artistic/human fidelity validation","human audio listening","full production browser campaign"]},
    baselineMemory,cases,selectedStateComparisons,drawDiagnostic,assets:{loaded:assets.loaded.length,failed:assets.failed,
      uniqueServedAssetBytes:[...requests.values()].filter(x=>x.status===200).reduce((sum,x)=>sum+x.bytes,0),requests:[...requests.values()]},
    errors:{server:errors,page:consoleErrors}};
  await writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
  await page.evaluate(()=>window.__huntReferenceQA.dispose());
  console.log("Reference renderer "+report.status+": "+cases.length+" cases; "+assets.loaded.length+" actual images; "+reportPath);
  assert.equal(report.status,"PASS","see renderer reference report failures");
}finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await rm(cache,{recursive:true,force:true});
}
